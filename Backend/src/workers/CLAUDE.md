# Workers — Background Processing

Scope: `Backend/src/workers/`. Read `Backend/CLAUDE.md` first.

Workers are BullMQ processors. They live inside the backend codebase so they
reuse domain services, entities, and configuration — and they run as a **separate
process and container** so they scale and fail independently of the API.

There is no `apps/worker`. There never will be.

---

## 1. How Separation Works

One codebase, one image, three entrypoints selected by `APP_ROLE`:

```text
src/main.ts       APP_ROLE=api        AppModule        HTTP + WebSocket. PRODUCES jobs.
src/worker.ts     APP_ROLE=worker     WorkerModule     CONSUMES jobs. No HTTP controllers.
src/scheduler.ts  APP_ROLE=scheduler  SchedulerModule  Owns repeatable jobs. Exactly one replica.
```

- `AppModule` imports domain modules and controllers. It **never** imports
  `WorkersModule`.
- `WorkerModule` imports domain modules **without** their controllers, plus the
  processors here.
- Both share `infrastructure/` and `config/`, so a service behaves identically in
  either process.

Why this matters: a slow check must never consume an API request thread; a worker
crash must never take down the API; and worker replicas must scale on queue depth
while API replicas scale on request rate.

Logical separation rules:
- The API registers **queue producers only** — never a BullMQ `Worker`.
- The worker registers **processors only** — never an HTTP controller or gateway.
- Workers reach the database and business rules through **domain services**, never
  through repositories directly.
- Workers never hold WebSocket connections. They publish to Redis pub/sub; the
  API relays to clients.

---

## 2. Structure

```text
workers/
├── workers.module.ts
├── monitor-check/
│   ├── monitor-check.processor.ts     consumes `monitor-check`
│   ├── check-executor.service.ts      performs the HTTP request via infrastructure/http
│   ├── check-result-evaluator.ts      pure: response → CheckOutcome
│   └── tests/
├── notification/
│   ├── notification.processor.ts      consumes `notification`
│   └── tests/
├── incident/
│   └── incident.processor.ts          deferred incident work, escalation timers
├── maintenance/
│   ├── retention.processor.ts         prunes monitor_checks past retention
│   └── schedule-reconciler.processor.ts
└── shared/
    └── base.processor.ts              logging, metrics, error handling, correlation id
```

A processor is **thin**: parse and validate the payload, call domain services,
translate the outcome into a retry or a completion. Business logic belongs in
`modules/`, not here. If a processor is long, logic has leaked into it.

---

## 3. Queues

| Queue | Producer | Processor | Concurrency | Notes |
| --- | --- | --- | --- | --- |
| `monitor-check` | scheduler (repeatable) | `monitor-check.processor` | high (I/O bound) | the hot path |
| `incident` | `monitor-checks` events | `incident.processor` | moderate | must be idempotent |
| `notification` | `alerts` | `notification.processor` | moderate | external providers, retries |
| `maintenance` | scheduler (cron) | `maintenance/*` | 1 | retention, reconciliation |

Queue names are constants in `infrastructure/queue/`. Never a string literal.

---

## 4. Job Payload Contract

```ts
type MonitorCheckJob = {
  monitorId: string;
  organizationId: string;
  scheduledAt: string;      // ISO — for lateness measurement
  correlationId: string;
};
```

Rules:
- **Ids and scalars only.** Never an entity, never a full monitor config — it can
  be stale by the time the job runs, and it bloats Redis.
- **Never a secret.** No tokens, no passwords, no channel credentials, no
  monitor auth headers. The processor loads what it needs.
- Every payload carries a `correlationId` so a check can be traced from schedule
  through incident to notification.
- Payload types are declared contracts in `infrastructure/queue/`, shared by
  producer and consumer. A payload change is a breaking change: jobs already in
  Redis were enqueued with the old shape, so the processor must tolerate both
  during a rollout.

---

## 5. Reliability

| Concern | Rule |
| --- | --- |
| Idempotency | Every processor is safe to run twice. A retried check must not create a second check row, a second incident, or a second notification. |
| Job id | Deterministic where duplicates are possible. Repeatable monitor jobs use `monitor:{monitorId}`. |
| Attempts | `monitor-check` 2 (the next interval retries naturally); `notification` 5. |
| Backoff | Exponential with jitter. Never fixed — synchronized retries stampede. |
| Timeout | Every job has one, always shorter than the monitor's interval. |
| Stalled jobs | BullMQ stall detection enabled; stall count is monitored. |
| Dead letter | Exhausted jobs are recorded with payload, error, and correlation id for replay. Never silently dropped. |
| Retention | `removeOnComplete` bounded, `removeOnFail` bounded. An unbounded queue will exhaust Redis memory. |
| Graceful shutdown | On SIGTERM stop accepting jobs, finish in-flight work within a grace period, then close connections. |
| Poison messages | A payload that can never succeed (deleted monitor) completes with a recorded reason — it does not retry to exhaustion. |

---

## 6. Monitor Check Execution — The Hot Path

```text
scheduler enqueues monitor-check
   ↓
processor loads the monitor via MonitorsService (tenant-scoped)
   ↓ skip if paused/deleted → complete with a reason, do not retry
executes via infrastructure/http (SSRF-guarded, timeout, size cap, redirect cap)
   ↓
check-result-evaluator → CheckOutcome { success, latencyMs, statusCode, cause }
   ↓
MonitorChecksService.record()   ← persists, updates monitor denormalized fields
   ↓
publish monitor.check_completed
   ↓
incidents evaluates → opens / updates / resolves
   ↓
alerts evaluates → enqueues notification jobs
   ↓
notification processor delivers
```

Non-negotiables on this path:
- **Never** use raw `axios`/`fetch`. Monitor URLs are user-supplied; only
  `infrastructure/http` enforces the SSRF, size, and redirect protections.
- A check that fails is a **successful job** — it recorded a result. Only an
  infrastructure error (DB unreachable) is a job failure. Confusing the two
  causes retry storms that multiply load exactly when the system is unhealthy.
- The check result is persisted before any downstream event is published. An
  event without a durable result produces incidents referencing nothing.
- Response bodies are captured truncated, and only when the monitor's assertions
  require it. Never store a full body by default — it is unbounded and may
  contain customer data.

---

## 7. Observability

Every processor logs start and finish with `jobId`, `queue`, `attempt`,
`correlationId`, `organizationId`, `monitorId`, `durationMs`, and outcome.
Metrics: queue depth, wait time, processing time, failure rate, stall count, and
**schedule lateness** (`startedAt - scheduledAt`) — rising lateness is the
earliest signal that worker capacity is short.

A worker exposes a liveness probe (queue connection healthy, event loop
responsive) even though it serves no API.

---

## 8. Forbidden in `workers/`

- registering an HTTP controller or a WebSocket gateway
- registering a BullMQ `Worker` in the API role
- business logic that belongs in a domain service
- calling a repository directly
- raw `axios`/`fetch` for monitor execution
- a non-idempotent processor
- an entity or a secret in a job payload
- fixed backoff
- unbounded `removeOnComplete` / `removeOnFail`
- swallowing an error without logging and without failing the job
- treating a monitor's check failure as a job failure
- more than one scheduler replica
