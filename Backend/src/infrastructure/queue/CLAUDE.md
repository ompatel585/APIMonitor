# infrastructure/queue/ — BullMQ Abstraction

Scope: `Backend/src/infrastructure/queue/`. Read `Backend/CLAUDE.md` and
`Backend/src/workers/CLAUDE.md` first.

This is the only place BullMQ is configured. Nothing outside this directory
imports `bullmq` or `@nestjs/bullmq` directly except a queue's producer
(here) and its processor (`workers/`).

```text
queue/
├── queue.module.ts                 @Global BullModule.forRootAsync + registerQueue
├── queue.constants.ts              QUEUE_NAMES, deterministic job-id helpers
├── monitor-check-job.payload.ts    MonitorCheckJobPayload contract
├── monitor-check-queue.producer.ts register/remove/list repeatable monitor-check jobs
└── CLAUDE.md
```

## Rules

- `QueueModule` is `@Global()` so both `AppModule` (API role — producer only)
  and `WorkerModule`/`SchedulerModule` can inject `BullModule`'s exports
  without re-declaring the connection.
- A producer here never processes a job — it only calls `Queue.add()` /
  `Queue.getRepeatableJobs()` / `Queue.removeRepeatableByKey()`. Processing
  lives exclusively in `workers/`.
- Job payloads are ids and scalars only — never an entity, never a secret.
  See `workers/CLAUDE.md` §4 for the full contract.
- Job ids for repeatable monitor checks are deterministic
  (`monitor:{monitorId}`) so re-registering the same monitor (e.g. after an
  interval change) replaces rather than duplicates the repeatable job.
- Adding a new queue means adding its name to `QUEUE_NAMES` here — never a
  string literal at a call site.
