# Incidents Module

Scope: `Backend/src/modules/incidents/`. Read `Backend/src/modules/CLAUDE.md` first.

An incident is an **open period of confirmed bad state** for a monitor. This
module owns incident creation, the state machine, deduplication, timeline
events, and resolution.

It does not decide who to notify — that is `alerts`. It does not evaluate check
results — it consumes the evaluation `monitors`/`monitor-checks` already
produced.

---

## 1. The Core Invariant

> **At most one open incident per monitor at any time.**

Everything in this module exists to preserve that. Violating it produces
duplicate incidents, duplicate alert storms, and a status page that contradicts
itself.

It is enforced in two independent places:

1. A **partial unique index** in Postgres:
   `UNIQUE (monitor_id) WHERE resolved_at IS NULL`
2. A short-lived **Redis lock** keyed by `monitor:{monitorId}:incident` around
   the open-or-create path.

The database constraint is the real guarantee; the lock avoids routine contention
and wasted work. Never rely on an application-level `findOpen()` check alone —
two workers can pass that check concurrently. Catch the unique violation and
treat it as "already open".

---

## 2. Lifecycle

```text
        confirmed failure
               ↓
           OPEN ──acknowledge──> ACKNOWLEDGED
               │                      │
               └──── recovery ────────┴──> RESOLVED (terminal)
```

- `OPEN` — created when `monitors` confirms a transition to `DOWN` (after the
  consecutive-failure threshold, never on a single failed request).
- `ACKNOWLEDGED` — a human has taken ownership. Suppresses repeat/escalation
  notifications; does **not** stop monitoring and does **not** resolve.
- `RESOLVED` — terminal. Set when recovery is confirmed (consecutive-success
  threshold) or by explicit manual resolution. A resolved incident is never
  reopened; a new failure opens a new incident.

Recorded fields: `startedAt`, `acknowledgedAt`/`acknowledgedBy`, `resolvedAt`,
`resolvedBy` (null for automatic), `durationSeconds` (computed on resolve),
`cause` (the classified failure), `severity`.

---

## 3. Failure Classification

Every incident carries a classified cause; it drives alert routing and status
page copy.

```text
TIMEOUT              request exceeded timeoutMs
CONNECTION_ERROR     DNS failure, refused, network unreachable
TLS_ERROR            certificate invalid or expired
STATUS_CODE          responded, but the status was not expected
ASSERTION_FAILED     status acceptable, but a body/header assertion failed
DEGRADED             succeeded but exceeded the latency threshold
```

Classification happens once, in the check executor, and is carried through the
event. This module stores it — it does not re-derive it.

---

## 4. Deduplication and Flapping

- A repeated failure while an incident is already open **updates** that incident
  (`lastFailureAt`, failure count, a timeline entry). It never creates a second.
- Incident creation requires the confirmed threshold from `monitors`. This module
  trusts that evaluation rather than re-implementing it.
- Recovery requires the consecutive-success threshold. A single success does not
  resolve.
- Flap detection: if a monitor opens and resolves more than N incidents within a
  window, mark it `flapping`. A flapping monitor suppresses repeat notifications
  and surfaces a distinct UI state, but it still records incidents.

---

## 5. Event Flow

```text
monitor-checks  ──monitor.check_completed──>  incidents
                                                 │
                                                 ├─ open / update / resolve
                                                 │
                                                 ├──incident.created───> alerts, websocket
                                                 └──incident.resolved──> alerts, websocket
```

This module **never** imports `alerts` or `notifications`. It publishes events.
Handlers must be idempotent: the same `monitor.check_completed` delivered twice
must not open two incidents or write two timeline entries. Use the check id as
the idempotency key.

---

## 6. Timeline

An incident owns an append-only `incident_events` timeline: `OPENED`,
`FAILURE_OBSERVED` (throttled — do not write one per check for a long outage),
`ACKNOWLEDGED`, `COMMENT_ADDED`, `RESOLVED`, `AUTO_RESOLVED`. Entries are
immutable; a correction is a new entry.

---

## 7. Queries and Indexes

Required indexes:
```text
(organization_id, started_at DESC)                  incident list
(monitor_id) WHERE resolved_at IS NULL              the open-incident invariant
(organization_id, resolved_at) WHERE resolved_at IS NULL   open-incident dashboards
(project_id, started_at DESC)                       project scoping
```

Incident lists use cursor pagination on `(started_at, id)`. Open-incident counts
for a dashboard come from a maintained counter or a covered index — never a full
scan per page load.

---

## 8. Forbidden in this module

- creating an incident without the tenant-scoped ownership chain
- relying on an application-level check alone to enforce one open incident
- opening an incident from a single failed request
- resolving from a single successful request
- reopening a resolved incident
- importing `alerts` or `notifications`
- sending a notification from this module
- re-deriving failure classification
- a non-idempotent event handler
- writing a timeline entry per check during a long outage
- mutating a timeline entry
