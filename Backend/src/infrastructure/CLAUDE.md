# Infrastructure — Technical Adapters

Scope: `Backend/src/infrastructure/`. Read `Backend/CLAUDE.md` first.

Infrastructure adapts external technology (Postgres, Redis, BullMQ, Socket.IO,
SMTP, outbound HTTP) into interfaces the domain can use. It is **domain-agnostic**.

The rule that defines this directory: **`infrastructure/` never imports from
`modules/`.** If a file here mentions a monitor, an incident, or an organization,
it belongs in a domain module instead.

---

## 1. Contents

```text
infrastructure/
├── database/
│   ├── database.module.ts      TypeORM root config from ConfigService
│   ├── data-source.ts          CLI data source for migrations (the ONLY place with entity globs for the CLI)
│   ├── migrations/             Generated, then hand-reviewed
│   ├── base.entity.ts          id (UUID v7), createdAt, updatedAt
│   └── transaction.service.ts  runInTransaction() helper used by services
│
├── redis/
│   ├── redis.module.ts         Connection factory (separate clients: cache, bullmq, pubsub)
│   ├── cache.service.ts        Namespaced keys, mandatory TTL
│   └── lock.service.ts         Distributed lock (acquire/release, token-checked)
│
├── queue/
│   ├── queue.module.ts
│   ├── queue.constants.ts      Queue names + default job options
│   ├── job-payloads.ts         Typed payload contracts shared by producer and consumer
│   └── queue-producer.service.ts
│
├── websocket/
│   ├── websocket.module.ts
│   ├── ws-auth.adapter.ts      Handshake JWT verification
│   ├── room.util.ts            Room naming: org:{id}, project:{id}, monitor:{id}
│   └── event-emitter.service.ts  API-side relay of worker pub/sub events
│
├── logger/
│   ├── logger.module.ts        Pino config
│   ├── redaction.ts            Redaction paths — configured once, not per call site
│   └── request-context.ts      AsyncLocalStorage binding requestId/correlationId/userId
│
├── http/
│   ├── http.module.ts
│   ├── safe-http.client.ts     THE outbound client for monitor execution
│   └── ssrf-guard.ts           Address/scheme/redirect policy
│
└── mailer/
    ├── mailer.module.ts
    └── templates/
```

---

## 2. `http/` — Security-Critical

Monitor targets are **user-supplied URLs**. This is a server-side request forgery
vector by construction. `safe-http.client.ts` is the only permitted path for
outbound monitor traffic and enforces:

- scheme allow-list (`http`, `https` only)
- DNS resolution followed by a check of the **resolved address**, rejecting
  loopback, link-local (`169.254.0.0/16`, including cloud metadata endpoints),
  private ranges, and unique-local IPv6
- re-validation after **every** redirect (a redirect to `127.0.0.1` is the classic
  bypass), with a hard redirect cap
- connection and total timeouts
- a response size cap with streaming abort
- no automatic proxy or credential forwarding

Never call raw `axios`/`fetch` for monitor execution anywhere in the codebase.
Internal service-to-service calls that are not user-controlled may use a plain
client, but must not reuse this one's exemptions.

---

## 3. `database/`

- `synchronize: false` in every environment.
- `data-source.ts` is the migration CLI's entry. Application config comes from
  `ConfigService`, not from this file.
- `transaction.service.ts` exposes `runInTransaction(fn)`; services own the
  boundary and pass the transactional manager down. Repositories never open
  transactions.
- Connection pool size is configured per role: the API sizes for request
  concurrency, the worker for job concurrency. They are different numbers and
  both are explicit.
- Migrations run only via the one-shot `migrator` container, never on application
  boot.

---

## 4. `redis/`

Separate clients for separate concerns — BullMQ requires its own connection with
specific options and must not share one with the cache.

- `maxmemory-policy` must be `noeviction` for the BullMQ instance. An evicted job
  is a lost job.
- Cache keys are namespaced (`cache:org:{id}:...`) and **always** carry a TTL. A
  key without a TTL is a leak.
- `lock.service.ts` locks carry a unique token; release verifies the token so a
  process cannot release a lock it no longer holds.
- Redis is a cache and a queue substrate. It is never the source of truth for
  domain data.

---

## 5. `queue/`

Queue names and default job options are constants here. `job-payloads.ts` is the
shared contract between the producing service and the consuming processor —
changing it is a breaking change, because jobs enqueued with the old shape are
already in Redis.

`queue-producer.service.ts` is injected by domain services. Controllers never
inject it.

---

## 6. `logger/`

Pino, structured JSON to stdout. Redaction paths are configured once here —
never left to individual call sites. `request-context.ts` uses
`AsyncLocalStorage` so every log line within a request or a job automatically
carries its `requestId`/`correlationId` without threading it through every
signature.

---

## 7. Forbidden in `infrastructure/`

- importing anything from `modules/`
- domain concepts (monitor, incident, organization) in a file name or a type here
- business rules
- `process.env` (inject `ConfigService`)
- a cache key without a TTL
- sharing one Redis client between BullMQ and the cache
- raw `axios`/`fetch` exported as the monitor execution path
- opening a transaction inside a repository
- running migrations from application bootstrap
