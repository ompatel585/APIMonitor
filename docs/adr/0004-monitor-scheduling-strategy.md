# ADR-0004: Repeatable Jobs for Monitor Scheduling

**Status:** Accepted
**Date:** 2026-09-14

## Context

Every active monitor must be checked on its own interval. Two properties matter
more than anything else:

1. **No duplicates.** A double-scheduled monitor doubles check volume and cost,
   and races incident creation. This is the worst failure mode in the system.
2. **Self-healing.** A Redis flush, a crash, or a deploy must not leave monitors
   silently unscheduled. Silence is indistinguishable from "everything is up".

## Decision

**One BullMQ repeatable job per monitor**, with a deterministic job id.

```ts
queue.add('monitor-check', { monitorId, organizationId, correlationId }, {
  repeat: { every: intervalSeconds * 1000 },
  jobId: `monitor:${monitorId}`,
});
```

- Registered on activation, removed on pause/delete, re-registered on any interval
  change. All three happen in `MonitorScheduleService`, which is the only code
  permitted to touch the queue.
- The deterministic `jobId` makes registration idempotent — re-registering
  replaces rather than duplicates.
- **Boot reconciliation**: the scheduler diffs active monitors against registered
  repeatable jobs and corrects both directions (add missing, remove orphaned).
- **Exactly one scheduler replica**, enforced in compose configuration.

## Consequences

**Easy:** BullMQ owns timing; no polling loop; per-monitor intervals are natural;
reconciliation makes the schedule self-healing.

**Hard:** repeatable jobs consume Redis memory and scheduling overhead
proportional to monitor count. A single scheduler replica is a single point of
failure for *scheduling* (existing jobs keep firing; new registrations stall).

**Accepted:** we monitor schedule lateness (`startedAt - scheduledAt`) as the
capacity signal.

**Migration path** — if monitor count or lateness crosses the threshold, move to a
**tick-based dispatcher**: a cron job querying
`WHERE is_active AND next_check_at <= now()` in batches, enqueuing one-shot jobs.
Only `MonitorScheduleService` changes; domain services and processors are
untouched. Switching requires a new ADR superseding this one.

If the scheduler needs high availability before then, the answer is a Redis
leader lock — **not** a second replica.

## Alternatives Considered

**Tick-based dispatcher from the start.** Scales further and makes the schedule
derivable from the database, but requires building batching, lateness handling,
and duplicate protection up front. Deferred until measurement justifies it.

**Node `setInterval` per monitor in-process.** Rejected: does not survive restarts,
does not distribute, and duplicates across replicas.

**External cron (`k8s CronJob`, system cron).** Rejected: per-monitor intervals
would mean thousands of cron entries, with no visibility into lateness.
