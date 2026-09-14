# Monitors Module — Core Domain

Scope: `Backend/src/modules/monitors/`. Read `Backend/src/modules/CLAUDE.md` first.

The monitor is the product's central aggregate. This module owns the monitor
**definition and lifecycle**. It does **not** own execution (that is `workers/` +
`infrastructure/http/`), results (`monitor-checks`), incidents (`incidents`), or
notifications (`alerts`/`notifications`).

Keeping definition separate from execution is what allows the check pipeline to
scale independently.

---

## 1. Ownership Chain

```text
Organization → Project → Monitor
```

Every monitor carries both `projectId` and a denormalized `organizationId`. The
denormalization is deliberate: it lets every repository method filter by tenant
in a single indexed predicate without a join. It is set on creation and is
immutable — a monitor never moves between organizations.

All queries filter on `organizationId`. A monitor fetched by id alone is a defect.

---

## 2. Monitor Configuration

Core fields: `name`, `type` (`HTTP` initially), `url`, `method`, `headers`,
`body`, `intervalSeconds`, `timeoutMs`, `expectedStatusCodes`, `assertions`,
`retryPolicy`, `followRedirects`, `degradedThresholdMs`, `isActive`,
`consecutiveFailureThreshold`, `consecutiveSuccessThreshold`.

Rules:
- `intervalSeconds` is validated against an allow-list and against the
  organization's plan limits (`billing` is consulted, not duplicated).
- `timeoutMs` must be strictly less than `intervalSeconds * 1000`. A check that
  can outlive its own interval causes pile-up.
- `url` is validated at write time by the same SSRF policy the executor enforces
  at runtime. Both checks are required — DNS can change between them.
- Secret headers (auth tokens for the monitored endpoint) are encrypted at rest
  and never returned in a response DTO or logged.

---

## 3. Lifecycle

```text
CREATED ──activate──> ACTIVE ──pause──> PAUSED ──resume──> ACTIVE
                        │                  │
                        └──── delete ──────┴──> DELETED (soft)
```

`status` (derived from check results) is separate from `isActive` (the user's
intent):

```text
PENDING    no check has completed yet
UP         last confirmed evaluation succeeded
DEGRADED   succeeded but exceeded the degraded latency threshold
DOWN       failure confirmed by the consecutive-failure threshold
PAUSED     user disabled it; not scheduled, status frozen
```

A single failed request does **not** set `DOWN`. Status transitions only after
the configured consecutive threshold, which is what suppresses flapping.

### Transition rules
- Creating an active monitor registers its schedule.
- Pausing removes the repeatable job and **does not** resolve open incidents; a
  paused monitor with an open incident is a real state the UI must show.
- Changing `intervalSeconds` or `isActive` **must** re-register the schedule.
  This is the most common source of "monitor stopped running" bugs — the schedule
  and the entity are updated in the same service method, in one transaction with
  the schedule change applied after commit.
- Soft deletion removes the schedule and leaves historical checks and incidents
  intact for reporting.

---

## 4. Scheduling — How a Monitor Becomes a Job

The **scheduler role** owns dispatch. Monitors do not schedule themselves.

Chosen model: a BullMQ **repeatable job per monitor**, keyed deterministically by
`monitorId`, registered on activation and removed on pause/delete.

```text
MonitorsService.activate()
   → MonitorScheduleService.register(monitor)
      → queue.add('monitor-check', { monitorId, organizationId }, {
            repeat: { every: intervalSeconds * 1000 },
            jobId: `monitor:${monitorId}`,
        })
```

Rules:
- The deterministic `jobId` guarantees that re-registering replaces rather than
  duplicates. Duplicate schedules are the worst failure mode in this system —
  they double the check rate and can double-open incidents.
- Only `MonitorScheduleService` touches the queue. Controllers never do.
- On boot, the scheduler reconciles: every active monitor has exactly one
  repeatable job; orphaned jobs for deleted or paused monitors are removed. This
  makes the schedule self-healing after a Redis flush or a crash.
- Exactly one scheduler replica runs. See `Docker/CLAUDE.md`.

If monitor counts outgrow per-monitor repeatable jobs, the migration path is a
tick-based dispatcher that polls `next_check_at` in batches. That path is
recorded in `docs/adr/0004-monitor-scheduling-strategy.md`; do not switch without
updating it.

---

## 5. Interaction With Other Modules

| Direction | Mechanism |
| --- | --- |
| monitors → queue | `MonitorScheduleService` registers/removes repeatable jobs |
| worker → monitors | the processor reads the monitor definition through `MonitorsService` |
| worker → monitor-checks | the processor persists the result through `MonitorChecksService` |
| monitor-checks → incidents | event `monitor.check_completed`; monitors does **not** call incidents |
| monitors → websocket | event `monitor.status_changed` when status actually transitions |
| monitors → billing | read-only plan limit check on create/update |

This module **never** imports `incidents`, `alerts`, or `notifications`. It
publishes events; downstream modules react. This keeps the dependency graph
acyclic.

---

## 6. Status Evaluation

Status evaluation is a **pure function** in `services/monitor-status-evaluator.ts`:

```ts
evaluate(current: MonitorStatus, recentResults: CheckOutcome[], config: ThresholdConfig): MonitorStatus
```

Pure means fully unit-testable with no database and no clock. Every threshold and
flap-suppression rule is exercised there. Do not scatter status logic across the
service, the processor, and the repository — it lives in this one function.

A status write happens only on an actual transition, and it emits
`monitor.status_changed` exactly once. Writing the same status repeatedly
generates spurious events and defeats incident deduplication.

---

## 7. Data Volume

Monitors are low-volume (thousands per org); their checks are high-volume
(millions). Never join `monitors` to the full `monitor_checks` table to compute a
list view — the list uses a denormalized `lastCheckAt`, `lastStatus`,
`lastLatencyMs` on the monitor row, updated by the ingestion path. Aggregates come
from `analytics`, never from an ad-hoc query here.

---

## 8. Forbidden in this module

- executing an HTTP check here (execution lives in the worker + hardened client)
- importing `incidents`, `alerts`, or `notifications`
- touching BullMQ outside `MonitorScheduleService`
- a controller calling the schedule service directly
- a query that omits `organizationId`
- updating `intervalSeconds` or `isActive` without re-registering the schedule
- a non-deterministic `jobId`
- returning encrypted monitor headers in a response
- computing uptime by scanning `monitor_checks` here
- allowing `timeoutMs >= intervalSeconds * 1000`
