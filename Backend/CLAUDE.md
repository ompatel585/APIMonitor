# Backend — NestJS Application

Scope: everything under `Backend/`. Read the root `CLAUDE.md` first.

The backend owns **all** business logic, persistence, and background processing.
It is the authority on every rule. The frontend is a client; it is never trusted.

---

## 1. Stack

NestJS · TypeScript strict · PostgreSQL + TypeORM · Redis · BullMQ · Socket.IO ·
Passport + JWT · class-validator / class-transformer · Swagger · Pino ·
Jest + Supertest + Testcontainers.

---

## 2. Runtime Roles

One codebase, three entrypoints. The role is selected by `APP_ROLE`, and each
entrypoint composes a different root module.

| Role | Entrypoint | Loads | Responsibility |
| --- | --- | --- | --- |
| `api` | `src/main.ts` | `AppModule` | HTTP + WebSocket. Serves requests, **produces** jobs. |
| `worker` | `src/worker.ts` | `WorkerModule` | **Consumes** jobs. No HTTP listener except a health probe. |
| `scheduler` | `src/scheduler.ts` | `SchedulerModule` | Owns repeatable jobs / due-monitor dispatch. Single active instance. |

The API process **never** registers a BullMQ `Worker`. The worker process
**never** registers an HTTP controller. This separation is what allows the two to
scale and fail independently while sharing domain services.

See `Backend/src/workers/CLAUDE.md`.

---

## 3. Directory Structure

```text
Backend/
├── src/
│   ├── main.ts             API entrypoint
│   ├── worker.ts           Worker entrypoint
│   ├── scheduler.ts        Scheduler entrypoint
│   ├── app.module.ts       API composition root
│   ├── worker.module.ts    Worker composition root
│   ├── scheduler.module.ts Scheduler composition root
│   │
│   ├── common/             Domain-agnostic cross-cutting code
│   ├── config/             Typed, validated configuration
│   ├── infrastructure/     Technical adapters (db, redis, queue, websocket, logger, http, mailer)
│   ├── modules/            Domain modules — the business
│   ├── workers/            Queue processors (worker role only)
│   └── health/             Liveness/readiness probes
│
└── test/
    ├── integration/        Repositories, migrations, processors (Testcontainers)
    ├── e2e/                HTTP through the real app (Supertest)
    └── fixtures/           Factories, seed helpers, local HTTP fixture server
```

---

## 4. Layering — Non-Negotiable

```text
Middleware → Guard → Pipe → Controller → Service → Repository → TypeORM → PostgreSQL
                                             ↑ Interceptor / Exception Filter wrap the response
```

### Controller
Transport only. Parse validated input, call **one** service method, return a
mapped response. Carries the Swagger decorators and the auth/authorization
decorators.

Controllers **must not**: contain business logic or conditionals that encode
business rules; inject a TypeORM `Repository` or `DataSource`; build a query;
inject a queue, Redis client, or BullMQ object; import another module's
repository; return an entity.

### Service
All business logic. Orchestrates repositories, other modules' services, queue
producers, and event publishing. Owns transaction boundaries. Throws typed domain
exceptions from `common/exceptions/`. Never sees `Request`/`Response`.

A service may call another module's **service** (injected via that module's
exports). It may never call another module's **repository**.

### Repository
All data access for one aggregate. Wraps TypeORM; the rest of the app does not
know TypeORM exists. Every method that reads or writes tenant data takes an
`organizationId` (or an id whose ownership chain is resolved in the same query)
and filters on it. Returns entities or plain projections — never DTOs.

### Entity
Persistence shape only. Lives in `modules/<domain>/entities/`. Never returned
from a controller, never sent over a queue, never reaches the frontend.

### DTO
The transport contract. `dto/requests/` validated with class-validator;
`dto/responses/` shaped by an explicit mapper in `mappers/`. Entity → response
DTO mapping is always explicit — never `return entity`.

---

## 5. Module Anatomy

```text
modules/<domain>/
├── <domain>.module.ts
├── controllers/          (single file may sit at module root instead)
├── services/
├── repositories/
├── entities/
├── dto/
│   ├── requests/
│   └── responses/
├── mappers/
├── events/               Domain event contracts, if the domain emits any
├── enums/  constants/  types/  validators/   (only if non-trivially populated)
└── tests/
```

**Create a directory only when a real file goes in it.** A module with one
controller, one service, one repository is three files at the module root plus
`dto/` and `entities/`. Do not scaffold empty folders.

A module's `exports` array is its public interface. Export the **service**;
never export a repository.

**Domains:** `auth`, `users`, `organizations`, `projects`, `monitors`,
`monitor-checks`, `incidents`, `alerts`, `notifications`, `status-pages`,
`analytics`, `billing`, `api-keys`.

`alerts` owns both alert rules and notification channels' configuration;
`notifications` owns delivery mechanics (transport adapters, retries, receipts).
Keep that split — rule evaluation and delivery change for different reasons.

---

## 6. `common/` — Domain-Agnostic Only

```text
common/
├── decorators/     @CurrentUser, @Public, @RequirePermission, @ApiPaginated…
├── guards/         JwtAuthGuard, ApiKeyGuard, PoliciesGuard, ThrottlerGuard
├── interceptors/   ResponseEnvelope, Timing, Logging, ClassSerializer
├── filters/        AllExceptions, DomainException, TypeOrm/Query error translation
├── pipes/          Global ValidationPipe config, ParseUuidPipe
├── middleware/     RequestId / correlation id, raw body
├── exceptions/     Base domain exception + typed subclasses with stable codes
├── dto/            PaginationQueryDto, CursorPageDto, ErrorResponseDto
├── constants/  enums/  types/  utils/
```

If a file in `common/` mentions a monitor, an incident, or an organization, it is
in the wrong place. `common/` never imports from `modules/`.

---

## 7. `infrastructure/` — Technical Adapters

```text
infrastructure/
├── database/    DatabaseModule, data-source.ts, migrations/, base entity, transaction helper
├── redis/       Connection factory, cache service, distributed lock
├── queue/       QueueModule, queue names/constants, typed producer, job payload contracts
├── websocket/   Socket server config, ws auth adapter, room naming, emitter service
├── logger/      Pino config, redaction rules, request context binding
├── http/        Hardened outbound HTTP client (SSRF guards, timeouts, size caps, redirect caps)
└── mailer/      Email transport adapter + templates
```

Infrastructure is domain-agnostic: it **never** imports from `modules/`. Domain
code depends on infrastructure, not the reverse. Swapping Redis for another cache
should touch only `infrastructure/redis/`.

`infrastructure/http/` is mandatory for monitor execution — see root `CLAUDE.md`
§6 on SSRF.

---

## 8. Configuration

All config is in `src/config/`: `app.config.ts`, `auth.config.ts`,
`database.config.ts`, `redis.config.ts`, `queue.config.ts`, `mail.config.ts`,
plus `validation.ts` (the startup schema).

`process.env` is read **only** in `src/config/`. Everywhere else, inject
`ConfigService` with the typed namespace. Validation runs at bootstrap and the
process exits on a missing or malformed required variable. No production
fallbacks for secrets.

---

## 9. TypeORM Rules

- `synchronize: false` in every environment. Always.
- `src/infrastructure/database/data-source.ts` is the CLI data source for
  migrations.
- Migrations are generated, then **reviewed and edited by hand**. Never run a
  generated migration unread.
- Every entity extends a base with `id` (UUID v7), `createdAt`, `updatedAt`.
- Tenant-scoped entities carry `organizationId` + FK + index. Composite indexes
  lead with `organization_id`.
- Relations are explicit with `onDelete` behavior stated. `eager: true` is
  forbidden — load relations explicitly per use case.
- No lazy relations. No entity listeners/subscribers that contain business logic.
- N+1 is a defect: use joins or a batched load in the repository.
- Transactions are opened in the **service** via the transaction helper and the
  transactional manager is passed down; repositories do not open transactions.
- Raw SQL only inside a repository, always parameterized.

---

## 10. Redis and BullMQ

- Queue names are constants in `infrastructure/queue/`. No string literals.
- Job payload types are declared contracts. A payload carries **ids and a
  correlation id**, never a full entity, never a secret.
- Producers are injected services. Only a domain service enqueues — never a
  controller, never a repository.
- Every job declares: `attempts`, `backoff` (exponential + jitter), `timeout`,
  `removeOnComplete`, `removeOnFail` (bounded retention).
- Every job is idempotent. Repeated delivery must not create a duplicate
  incident, notification, or check row. Use deterministic `jobId`s and
  idempotency keys.
- Dead-lettering: exhausted jobs move to a failed-job store with enough context
  to replay.
- Redis is also the store for: refresh-token/session revocation, rate limiting,
  distributed locks, and short-lived caches. Cache keys are namespaced and always
  carry an explicit TTL.

Details: `Backend/src/workers/CLAUDE.md` and `docs/monitor-execution.md`.

---

## 11. Authentication

Owned entirely by `modules/auth/`. No other module implements auth logic.

Argon2id password hashing · short-lived access JWT · rotating refresh tokens
stored hashed with reuse detection · email verification · password reset with
single-use expiring tokens · session/token revocation via Redis denylist ·
API keys (hashed, prefixed, scoped) as a parallel credential.

`JwtAuthGuard` is registered **globally**. Public endpoints opt out with
`@Public()`. Forgetting a guard therefore fails closed.

Full rules: `Backend/src/modules/auth/CLAUDE.md`.

---

## 12. Authorization

Never write `if (user.id === resource.userId)` in a service.

Authorization is `Organization` → `Membership` → `Role` → `Permission`, enforced
by `PoliciesGuard` + `@RequirePermission(...)` at the controller, and by
mandatory tenant scoping in every repository method. The two layers are
independent on purpose: the guard answers "may this actor perform this action",
the repository guarantees "only this tenant's rows are reachable".

Cross-tenant access returns **404**, not 403.

Full rules: `Backend/src/modules/auth/CLAUDE.md`.

---

## 13. API

`/api/v1/` prefix, plural kebab-case nouns, global `ValidationPipe` with
`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.

One response envelope, one error envelope, one pagination contract — all defined
in `common/dto/`. Every endpoint carries Swagger decorators including error
responses. Swagger is served only outside production, but the OpenAPI JSON is
always generated for frontend type generation.

Full conventions: `docs/api-conventions.md`.

---

## 14. WebSockets

Socket.IO gateway. Authentication uses the same JWT verification as REST, at
connection time. Rooms are tenant-scoped: `org:{organizationId}`,
`project:{projectId}`, `monitor:{monitorId}`. Membership in a room is verified
against the same permission system before joining — a client may never subscribe
to a room its actor cannot read.

The API process holds the socket server. Workers publish through Redis pub/sub
and the API relays. Workers never hold socket connections.

Event names are constants in the owning module's `events/`. Payloads are
contracts and contain no secrets and no entities.

---

## 15. Errors

- Domain code throws typed exceptions from `common/exceptions/` carrying a stable
  `code`, an HTTP status, and a safe message.
- `AllExceptionsFilter` is the only place that converts an error into a response.
- TypeORM/driver errors are translated (unique violation → `409` with a domain
  code), never leaked.
- Production responses never contain stack traces, SQL, entity names, or internal
  hostnames. Development may include a stack.
- Every thrown error is logged once, with the request/correlation id, at the
  boundary — not at every level on the way up.

---

## 16. Logging

Pino, structured JSON. Bound context: `requestId`, `correlationId`, `userId`,
`organizationId`, `method`, `route`, `statusCode`, `durationMs`; and for jobs:
`jobId`, `queue`, `attempt`, `monitorId`.

Redaction is configured at the logger, not left to call sites. Never log
passwords, JWTs, refresh tokens, API key secrets, DB credentials, webhook
secrets, or monitor request/response bodies containing customer data.

`console.log` is forbidden in committed code.

---

## 17. Testing

| Type | Location | Notes |
| --- | --- | --- |
| Unit | `modules/<domain>/tests/` | Services, mappers, validators, pure logic. Dependencies mocked. |
| Integration | `test/integration/` | Repositories, migrations, processors against real Postgres/Redis via Testcontainers. |
| E2E | `test/e2e/` | Full HTTP through the app with Supertest. |

Every authorization path gets a test proving a foreign tenant cannot read or
write the resource. Monitor execution tests hit a local fixture server, never the
public internet. Fixtures/factories live in `test/fixtures/`.

---

## 18. Forbidden in `Backend/`

- business logic in a controller
- a controller injecting a TypeORM repository, `DataSource`, Redis client, or queue
- a repository method that can return another tenant's row
- inline ownership checks instead of the policy system
- a service importing another module's repository
- `infrastructure/` or `common/` importing from `modules/`
- `synchronize: true`
- returning an entity from a controller
- `process.env` outside `src/config/`
- `console.log`
- an empty `catch {}`
- a non-idempotent job processor
- registering a BullMQ `Worker` in the API role
- registering an HTTP controller in the worker role
- raw `axios`/`fetch` for monitor execution
- `any`, `@ts-ignore`, or non-null assertions to silence the compiler
- circular imports between modules
