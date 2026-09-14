# Monitor Execution Pipeline

The core of the product. Every design choice here is driven by one question:
what happens when this runs for 100,000 monitors and a dependency fails?

---

## 1. The Pipeline

```text
Monitor (ACTIVE)
   │  activation registers a repeatable job
   ▼
Scheduler role  ──enqueue──>  queue: monitor-check
   ▼
Worker role: MonitorCheckProcessor
   │  load monitor (tenant-scoped) → skip if paused/deleted
   ▼
infrastructure/http/safe-http.client   SSRF guard, timeout, size cap, redirect cap
   ▼
check-result-evaluator (pure)  →  CheckOutcome
   ▼
MonitorChecksService.record()  →  persist check + update monitor denormalized fields
   ▼
event: monitor.check_completed
   ├──> monitors    status evaluation (threshold) → maybe monitor.status_changed
   ├──> incidents   open / update / resolve
   └──> analytics   rollup
   ▼
event: incident.created | incident.resolved
   ▼
alerts   rule evaluation + dedup + throttle  →  enqueue notification jobs
   ▼
queue: notification  →  NotificationProcessor  →  provider  →  NotificationDelivery
```

---

## 2. Scheduling

**One BullMQ repeatable job per monitor**, `jobId: monitor:{monitorId}`,
`repeat.every = intervalSeconds * 1000`.

- Registered on activation, removed on pause/delete, **re-registered on any
  interval change**. Forgetting the last one is the classic "my monitor stopped
  running" bug — the schedule and entity update happen in one service method.
- The deterministic `jobId` makes re-registration idempotent. Duplicate schedules
  are the worst failure mode available: double the check rate, double the cost,
  and racing incident creation.
- Only `MonitorScheduleService` touches the queue.
- **Exactly one scheduler replica.** Two would double-schedule everything.

**Boot reconciliation.** The scheduler compares active monitors against
registered repeatable jobs and fixes both directions: missing jobs are added,
orphans removed. This makes the schedule self-healing after a Redis flush, a
crash, or a deploy that lost state.

**Scale ceiling and migration path.** Repeatable jobs are clean but Redis-heavy
at very large counts. If monitor count or scheduling lateness crosses the
threshold in ADR-0004, switch to a tick-based dispatcher: a cron job that queries
`WHERE is_active AND next_check_at <= now()` in batches and enqueues one-shot
jobs. The domain services do not change — only `MonitorScheduleService`.

---

## 3. Concurrency and Backpressure

- Worker concurrency is high because checks are I/O bound, but bounded — an
  unbounded worker exhausts sockets and file descriptors.
- Per-host politeness: many monitors may target one domain. Cap concurrent
  in-flight requests per target host so one customer's endpoint is not
  accidentally load-tested.
- **Schedule lateness** (`startedAt - scheduledAt`) is the primary capacity
  signal. Rising lateness means add worker replicas — it is visible long before
  checks are actually dropped.
- Backpressure is queue depth. The scheduler does not slow down; workers scale
  out. If the queue grows unboundedly, that is an alert, not an automatic
  behavior change.

---

## 4. Execution Rules

- **Only `infrastructure/http/safe-http.client`.** Monitor URLs are user-supplied.
  The client enforces scheme allow-listing, post-DNS address checks against
  loopback/link-local/private ranges (including cloud metadata endpoints),
  re-validation after every redirect, a redirect cap, connect and total timeouts,
  and a streaming response size cap.
- Timeout is always shorter than the interval. A check that outlives its interval
  causes pile-up.
- In-check retries are minimal (0–1, per the monitor's retry policy). The next
  interval is the real retry, and the consecutive-failure threshold is what
  distinguishes a blip from an outage.
- Response bodies are captured truncated and only when assertions need them.
- Every result is classified once: `TIMEOUT`, `CONNECTION_ERROR`, `TLS_ERROR`,
  `STATUS_CODE`, `ASSERTION_FAILED`, `DEGRADED`. That classification flows
  through the whole pipeline and is never re-derived.

**A failed check is a successful job.** The job's purpose is to record a result;
it did. Only infrastructure failure (database unreachable) fails the job. Getting
this wrong produces retry storms precisely when the system is least healthy.

---

## 5. Idempotency

Every stage must tolerate double delivery:

| Stage | Mechanism |
| --- | --- |
| Schedule | deterministic `jobId` per monitor |
| Check execution | job id + `scheduledAt` dedup key; a duplicate completes without a second HTTP request |
| Check persistence | unique on `(monitor_id, scheduled_at)`; conflict = already recorded |
| Incident open | partial unique index + Redis lock; unique violation means "already open" |
| Incident event | keyed by the originating check id |
| Alert | dedup key `{ruleId}:{incidentId}:{channelId}` in Redis |
| Notification | provider idempotency key where supported; delivery row is unique per attempt |

---

## 6. Failure and Recovery Detection

Failure and recovery both require **consecutive** thresholds, evaluated by a pure
function in `monitors`:

```ts
evaluate(current, recentResults, thresholds) → MonitorStatus
```

Pure means no clock, no database, fully unit-testable. All threshold and
flap-suppression behavior is proven there rather than discovered in production.

- `DOWN` requires N consecutive failures (default 3).
- `UP` requires M consecutive successes (default 2).
- `DEGRADED` is a success over the latency threshold; it can open an incident if
  the monitor is configured for it.
- A status write happens **only on an actual transition**, and emits
  `monitor.status_changed` exactly once. Repeatedly writing the same status
  generates spurious events and breaks incident dedup.

---

## 7. Incident Processing

`monitor.check_completed` → the incident handler:

1. Confirmed failure, no open incident → **open** (behind the Redis lock; catch
   the unique violation as "already open").
2. Confirmed failure, incident open → **update** `lastFailureAt` and
   `failureCount`; write a throttled timeline entry.
3. Confirmed recovery, incident open → **resolve**, compute duration, emit
   `incident.resolved`.
4. Success, no open incident → nothing.

Handlers are idempotent on the check id. This module never notifies anyone — it
emits events.

Flapping: more than N open/resolve cycles within a window marks the monitor
`isFlapping`, which suppresses repeat notifications while still recording
incidents.

---

## 8. Alert Evaluation and Notification

`incident.created` → `AlertEvaluationService`:
load matching active rules (tenant-scoped) → evaluate conditions (pure function) →
apply dedup and throttle → persist `Alert` rows → enqueue one notification job per
channel.

Four independent suppression mechanisms, all required: per-incident/channel dedup
keys, per-rule throttle intervals, acknowledgement suppression, and flap grouping.
An alert storm is a product failure, not just noise.

Notification jobs carry ids only. The processor loads the channel, renders, and
delivers through the provider adapter, recording a `NotificationDelivery` per
attempt. Delivery retries use exponential backoff with jitter; exhausted
deliveries are dead-lettered with full context and surfaced in the UI — a
silently failed alert is worse than a visibly failed one.

---

## 9. Data Volume

At 100,000 monitors on a 60-second interval: ~144M checks/day. Consequences,
designed in from the start:

- `monitor_checks` is partitioned monthly by `checked_at`; retention drops
  partitions rather than deleting rows.
- Never scan checks for a list view — monitors carry denormalized
  `lastStatus`/`lastCheckAt`/`lastLatencyMs`.
- Uptime and latency come from pre-aggregated rollups in `analytics`
  (hourly/daily), not live aggregation.
- Sparklines read the rollup, never the raw series.
- Retention is enforced by the maintenance worker per plan.

---

## 10. Observability

Per stage: queue depth, wait time, processing time, failure rate, stall count,
schedule lateness, checks/sec, incident open/resolve rate, notification success
rate.

Every log line on this path carries `correlationId`, so one check can be traced
from schedule through incident to delivered notification. Rising schedule lateness
is the earliest warning the system is under-provisioned; alert on it before
checks are actually missed.
