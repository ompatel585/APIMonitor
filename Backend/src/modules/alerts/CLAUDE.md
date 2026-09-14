# Alerts Module

Scope: `Backend/src/modules/alerts/`. Read `Backend/src/modules/CLAUDE.md` first.

This module decides **whether and whom** to alert. It does not deliver anything —
delivery belongs to `notifications`. The split is deliberate: rules change with
product policy, delivery changes with providers.

---

## 1. Responsibilities

Owns: `AlertRule` (conditions, targets, throttling), channel *configuration*
(`NotificationChannel` rows), rule evaluation against domain events, alert
deduplication and throttling, escalation policy, and the `Alert` record of what
was decided.

Does not own: SMTP, webhook HTTP calls, provider SDKs, delivery retries, or
delivery receipts. All of that is `notifications`.

---

## 2. Alert Rule Model

```text
AlertRule
├── organizationId          tenancy
├── scope                   ORGANIZATION | PROJECT | MONITOR
├── scopeId                 null for organization scope
├── trigger                 INCIDENT_CREATED | INCIDENT_RESOLVED | INCIDENT_ACKNOWLEDGED
│                           | MONITOR_DEGRADED | MONITOR_FLAPPING | CERT_EXPIRING
├── conditions              severity floor, cause filter, minimum duration
├── channelIds              which configured channels receive it
├── throttle                minimum interval between alerts from this rule
├── escalation              optional: after N minutes unacknowledged, notify the next tier
└── isActive
```

Scope resolution is most-specific-first: a monitor-scoped rule applies before a
project-scoped rule, which applies before an organization-scoped rule. Multiple
rules may match one event; each produces at most one `Alert` per rule, and
deduplication then collapses per channel.

---

## 3. Evaluation Flow

```text
incidents ──incident.created──> AlertEvaluationService
                                    │
                                    ├─ load matching active rules (tenant-scoped)
                                    ├─ evaluate conditions
                                    ├─ apply deduplication + throttle
                                    ├─ persist Alert records
                                    └─ enqueue notification jobs (per channel)
                                             ↓
                                       notifications worker
```

Evaluation is **pure and testable**: `evaluate(event, rules, state) → AlertDecision[]`
in `services/alert-rule-evaluator.ts`, with no I/O. The surrounding service does
the loading and the enqueueing. Every branch of the condition logic is unit
tested without a database.

This module publishes `alert.triggered` and enqueues to the notification queue.
It never calls an email or webhook transport itself.

---

## 4. Deduplication and Throttling

Four independent mechanisms, all required:

1. **Incident-level** — one open incident produces one alert per rule per
   channel. The dedup key is `{ruleId}:{incidentId}:{channelId}`, stored in Redis
   with a TTL covering the incident's expected lifetime.
2. **Rule throttle** — a rule will not fire more often than its configured
   minimum interval, regardless of matching events.
3. **Acknowledgement suppression** — once an incident is acknowledged, repeat and
   escalation alerts for it stop. Resolution alerts still fire.
4. **Flap suppression** — a monitor marked flapping by `incidents` produces a
   single grouped alert, not one per transition.

An alert storm — hundreds of notifications for one outage — is a product-level
failure, not just noise. Treat a regression here as a defect.

---

## 5. Escalation

Optional per rule: if an incident remains unacknowledged after N minutes, notify
the next tier. Escalation is driven by a **delayed job** enqueued at incident
creation, which is cancelled on acknowledgement or resolution. It is never a
polling loop. The delayed job re-checks incident state when it fires — a job that
was not successfully cancelled must verify before acting.

---

## 6. Channel Configuration

Channel rows live here; secrets (webhook signing secrets, provider tokens) are
encrypted at rest and never returned in a response DTO or logged.

A channel must be **verified** before it can receive alerts (email confirmation,
webhook challenge/response). An unverified channel is skipped with a recorded
reason, not silently dropped.

Deleting a channel that is referenced by an active rule is blocked with a `409`
and a domain code — never a silent cascade that leaves a rule notifying nobody.

---

## 7. Interaction

| Direction | Mechanism |
| --- | --- |
| incidents → alerts | `incident.created` / `incident.resolved` / `incident.acknowledged` events |
| monitors → alerts | `monitor.status_changed` for degraded/flapping triggers |
| alerts → notifications | enqueued job carrying `alertId`, `channelId`, `correlationId` |
| alerts → websocket | `alert.triggered` |

The payload sent to `notifications` carries **ids only** — the notification
worker loads what it needs. Never put a rendered message body or a channel secret
in a job payload.

---

## 8. Forbidden in this module

- delivering a notification (no SMTP, no HTTP, no provider SDK here)
- importing `notifications` internals — enqueue a job instead
- evaluating rules without tenant scoping
- an evaluator that performs I/O
- alerting on a raw check failure rather than a confirmed incident
- alerting on an unverified channel
- storing a channel secret in plaintext or returning it in a response
- a rendered message body or a secret inside a job payload
- an escalation implemented as a polling loop
- deleting a channel that an active rule depends on
