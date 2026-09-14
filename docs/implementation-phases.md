# Implementation Phases

Build order. Each phase is independently verifiable and leaves the system in a
working state. Do not start a phase before its predecessor is complete and
tested.

The ordering has one governing rule: **tenancy and authorization come before any
business feature.** Retrofitting `organizationId` into existing queries is the
most expensive mistake available in this codebase, and it is silent until it
leaks data.

---

## Phase 0 — Foundation

Directory skeleton, tooling, no business logic.

- Root `package.json` (npm workspaces, scripts only — no runtime deps),
  `.gitignore`, `.editorconfig`, `.env.example`
- `Backend/`: NestJS scaffold, TypeScript strict, ESLint + Prettier, path aliases
- `Frontend/`: Next.js scaffold, TypeScript strict, Tailwind, ESLint + Prettier
- `Docker/`: dev Dockerfiles for backend and frontend; postgres and redis config
- Root `docker-compose.yml` + `docker-compose.override.yml`; the stack comes up
- ESLint boundary rules + `scripts/check-boundaries.ts`
- CI: typecheck, lint, boundary check
- Git repository initialized

**Done when:** `npm run dev` brings up Postgres, Redis, backend, and frontend;
typecheck, lint, and the boundary check pass on an empty codebase.

---

## Phase 1 — Backend Infrastructure

No domain code yet. Everything domain code will depend on.

- `config/` with startup validation — the process refuses to boot on a missing var
- `infrastructure/database/`: TypeORM wiring, `data-source.ts`, base entity
  (UUID v7 + timestamps), transaction helper, `migrator` service, first empty
  migration
- `infrastructure/redis/`: connection factory (separate cache/bullmq/pubsub
  clients), cache service, lock service
- `infrastructure/logger/`: Pino, redaction, `AsyncLocalStorage` request context
- `infrastructure/http/`: **the SSRF-hardened client, with its test suite** — built
  now so nothing is ever tempted to use raw `axios`
- `common/`: error envelope, exception hierarchy, global filter, response
  interceptor, request-id middleware, pagination DTOs, validation pipe config
- `health/`: liveness and readiness
- Swagger bootstrap + `scripts/generate-api-types.ts`

**Done when:** the API boots, `/health/ready` reports Postgres and Redis, a
deliberately broken env var crashes startup, and the SSRF client's tests pass
including the redirect-to-localhost case.

---

## Phase 2 — Identity and Tenancy

The security kernel. Nothing built on a shaky foundation here can be made safe
later.

- `users`, `organizations` (+ `Membership`), `auth` modules
- Entities and migrations: `users`, `organizations`, `memberships`,
  `refresh_tokens`, `password_reset_tokens`, `email_verification_tokens`
- Argon2id hashing; register, login, logout, refresh with rotation and reuse
  detection; email verification; password reset; Redis session denylist
- Permission catalogue, roles, `PoliciesGuard`, `@RequirePermission`,
  `@CurrentUser`, `@Public`; **global** `JwtAuthGuard`
- Repository base pattern enforcing tenant scoping
- Organization creation on registration; invitations and membership management
- Rate limiting on all auth endpoints
- Cross-tenant denial tests

**Done when:** a user can register, verify, log in, refresh, and log out; a member
of org A receives 404 for org B's resources; refresh reuse revokes the family; and
an endpoint without `@Public()` is inaccessible unauthenticated.

---

## Phase 3 — Frontend Foundation

- App Router structure, route groups, layouts, `middleware.ts`
- `lib/`: http client (refresh-on-401 with a single in-flight refresh, error
  translation, request ids), query client, env parsing
- `providers/`: query, auth, theme
- `shared/ui`: the primitive set (Button, Input, Select, Dialog, Card, Badge,
  Table, Toast, Form fields)
- `features/auth`: login, register, forgot/reset password, verify email
- `services/` + generated API types from Phase 2's OpenAPI
- Dashboard shell: navigation, org switcher, protected routes
- Playwright set up; the auth journey passes

**Done when:** a user can register and log in through the UI, a protected route
redirects when unauthenticated, and expiry triggers a silent refresh rather than a
logout.

---

## Phase 4 — Projects and Monitors (CRUD only)

No execution yet — definition and management.

- `projects` module: entity, migration, repository, service, controller, tests
- `monitors` module: entity, migration, repository, service, controller,
  validators (`timeoutMs < interval`, SSRF write-time URL check, plan limits),
  status evaluator as a **pure function with full unit tests**
- Frontend `projects` and `monitors` features: list, detail, create/edit form,
  pause/resume
- Monitors are created and stored but never executed

**Done when:** full CRUD works end to end with authorization, monitors show
`PENDING`, and the status evaluator's tests cover every threshold and flap case.

---

## Phase 5 — Execution Pipeline

The core. The first phase where the product does something.

- `worker.ts` / `scheduler.ts` entrypoints, `WorkerModule` / `SchedulerModule`
- `infrastructure/queue/`: queue constants, typed payloads, producer
- `MonitorScheduleService`: register/remove/reconcile with deterministic job ids
- `monitor-checks` module: entity (partitioned), ingestion service, retention job
- `workers/monitor-check/`: processor, executor (safe HTTP client), pure result
  evaluator
- Monitor status transitions + `monitor.status_changed`
- Docker: `backend-worker` and `backend-scheduler` services
- Integration test of the full path against a local fixture server

**Done when:** an active monitor is checked on schedule by a separate worker
container, results persist, status transitions respect thresholds, pausing stops
checks, changing the interval reschedules, and a scheduler restart reconciles
without duplicating jobs.

---

## Phase 6 — Incidents

- `incidents` module: entities, migration with the **partial unique index**,
  repository, service, state machine, Redis lock
- Event handling for `monitor.check_completed`; open/update/resolve
- Timeline (`incident_events`) with throttled failure entries
- Flap detection
- Acknowledge and manual resolve endpoints
- Frontend `incidents` feature: list, detail, timeline, acknowledge
- Concurrency test proving two simultaneous failures produce one incident

**Done when:** a failing monitor opens exactly one incident after the threshold,
recovery resolves it, the timeline is coherent, and the concurrency test passes.

---

## Phase 7 — Alerts and Notifications

- `alerts` module: `AlertRule`, channel configuration, **pure** rule evaluator,
  dedup keys, throttling, escalation via delayed jobs
- `notifications` module: delivery adapters (email first, then webhook with HMAC
  signing), delivery records, retries with backoff, dead-lettering
- `workers/notification/`
- Channel verification flows
- Frontend `alerts` feature: rules, channels, verification, delivery history
- Alert storm test: one incident with many matching rules produces bounded,
  deduplicated notifications

**Done when:** an incident produces exactly the intended notifications,
acknowledgement suppresses repeats, a flapping monitor does not storm, and a
failed delivery is visible rather than silent.

---

## Phase 8 — Real-Time

- WebSocket gateway with handshake auth and permission-checked room joins
- Redis pub/sub relay from workers to the API
- Event contracts for the five domain events
- Frontend socket provider + feature subscriptions that patch the query cache
- Verification that every view is correct with the socket disconnected

**Done when:** a status change appears live without a refetch, a client cannot
join another organization's room, and disconnecting degrades to polling with no
broken UI.

---

## Phase 9 — Analytics and Status Pages

- `analytics` module: hourly/daily rollups, uptime and latency aggregates,
  rollup worker
- Frontend charts reading rollups, never the raw series
- `status-pages` module: configuration, **separate public read model**, caching,
  per-slug rate limiting
- Public `status/[slug]` route — unauthenticated, cached, no dashboard imports

**Done when:** analytics render from pre-aggregated data, and the public page
serves under load without touching `monitor_checks`.

---

## Phase 10 — Billing, API Keys, Production Readiness

- `billing`: plans, subscriptions, usage limits enforced at monitor creation,
  provider webhooks (signature-verified, idempotent)
- `api-keys`: issuance, scoped permissions, verification guard, revocation
- `docker-compose.prod.yml`, production Dockerfiles (multi-stage, non-root),
  nginx with TLS
- Backups, metrics, alerting on schedule lateness and queue depth
- Full E2E suite in CI
- Load test of the check pipeline

---

## Sequencing Rules

- **Never** build a feature before its tenancy and authorization exist.
- **Never** build execution before the SSRF-hardened client exists.
- **Never** build alerts before incidents — alerting on raw checks is the
  architecture we are explicitly avoiding.
- **Never** build analytics on live aggregation with the intent to optimize later.
- A phase is complete only when its tests pass, including the cross-tenant denial
  tests.
