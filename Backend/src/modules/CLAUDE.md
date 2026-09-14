# Backend Domain Modules

Scope: `Backend/src/modules/`. Read `Backend/CLAUDE.md` first.

This directory is the business of the product. Everything here is a domain
module; nothing here is technical plumbing.

---

## 1. Module Boundaries

Each module owns one aggregate and its rules. Ownership means: the entity, its
repository, its business rules, its DTOs, and its endpoints live in exactly one
module.

| Module | Owns | Notes |
| --- | --- | --- |
| `auth` | Credentials, tokens, sessions, permission model, guards, policies | The security kernel |
| `users` | User profile and preferences | Not credentials — those are `auth` |
| `organizations` | Organization, Membership, Role, invitations | The tenancy root |
| `projects` | Project | Groups monitors within an organization |
| `monitors` | Monitor definition, schedule config, enable/disable | Definition only, not execution |
| `monitor-checks` | MonitorCheck results, ingestion, retention | High-volume, append-only |
| `incidents` | Incident lifecycle, state machine, deduplication | |
| `alerts` | AlertRule, channel configuration, rule evaluation | Decides *whether* to notify |
| `notifications` | Delivery adapters, receipts, delivery retries | Decides *how* to deliver |
| `status-pages` | StatusPage config + public read model | Public, unauthenticated surface |
| `analytics` | Uptime/latency aggregation and read models | Read-only over checks |
| `billing` | Plan, subscription, usage limits, provider webhooks | |
| `api-keys` | Programmatic credentials | Issued per organization |

`alerts` vs `notifications` is a deliberate split: rules change with product
policy, delivery changes with providers. Do not merge them.

---

## 2. Inter-Module Communication

Allowed:
- Module A injects module B's exported **service**.
- Module A subscribes to a domain event module B publishes.
- Module A enqueues a job module B's processor consumes.

Forbidden:
- importing another module's repository
- importing another module's entity to query it (import for a typed relation only)
- reaching into another module's internal service that is not in `exports`
- a circular import between two modules

When two modules need each other, that is a design signal. Resolve it with a
domain event rather than a bidirectional injection.

### Dependency direction between modules

```text
organizations ← projects ← monitors ← monitor-checks
                                   ↘  incidents → alerts → notifications
                              analytics ← monitor-checks, incidents
                        status-pages → monitors, incidents (read-only)
auth → users, organizations, api-keys
billing → organizations
```

Arrows point from dependent to dependency. `notifications` never imports
`monitors`. `monitor-checks` never imports `incidents` — it publishes an event and
the incident module reacts.

---

## 3. Events

Modules whose state changes matter to others publish domain events rather than
calling downstream modules directly.

```text
monitor.check_completed     monitor-checks  →  incidents, analytics, websocket
monitor.status_changed      monitors        →  websocket, status-pages cache
incident.created            incidents       →  alerts, websocket
incident.resolved           incidents       →  alerts, websocket
alert.triggered             alerts          →  notifications, websocket
notification.delivered      notifications   →  audit
```

Event contracts live in the **publishing** module's `events/`. A payload carries
ids, a timestamp, a correlation id, and the minimum scalar data — never an
entity, never a secret. Handlers are idempotent: the same event delivered twice
must not produce a second incident or a second notification.

---

## 4. Adding a New Module

1. Confirm no existing module owns the concept. Extending an existing module is
   usually correct.
2. Define the aggregate, its invariants, and its tenancy path to `organizationId`.
3. Create only the directories you will actually fill.
4. Entity + migration. Index `organization_id` and every FK.
5. Repository with mandatory tenant scoping on every method.
6. Service with the business rules and typed exceptions.
7. Controller with guards, permission decorators, DTOs, Swagger.
8. Register permissions for the new resource in the `auth` permission catalogue.
9. Export only the service.
10. Tests, including a cross-tenant denial test.
11. A module `CLAUDE.md` **only if** the domain has rules not derivable from the
    code — a lifecycle, a state machine, a concurrency concern.

---

## 5. Rules That Apply to Every Module

- Every tenant-scoped query filters on `organizationId`. No exceptions.
- Every endpoint is guarded and permission-checked. `@Public()` is a deliberate,
  reviewed decision.
- Cross-tenant access returns 404.
- Services throw typed domain exceptions; they never throw raw `HttpException`.
- No business logic in a controller.
- No queue or Redis access outside a service (via the injected producer).
- Entities never leave the backend.
- Anything a worker can run twice is idempotent.
