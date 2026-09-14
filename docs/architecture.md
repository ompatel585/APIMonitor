   # APIMonitor — Architecture

   Status: **proposed, pending approval**. No application code exists yet.

   ---

   ## 1. Architecture Definition

   APIMonitor is a **three-boundary modular monolith with detachable workers**.

   ```text
   Frontend/   Next.js App Router client
   Backend/    NestJS application — all business logic, persistence, background processing
   Docker/     Container and infrastructure configuration only
   ```

   Three properties define it:

   **Modular monolith.** The backend is one deployable codebase divided into domain
   modules with enforced boundaries. Not microservices — the coordination cost is
   not justified at this stage, and the domains share a transactional database.
   Not a big ball of mud — module boundaries are explicit and enforced, so
   extracting a service later is a contained change rather than an excavation.

   **Detachable workers.** The backend boots into one of three runtime roles — `api`,
   `worker`, `scheduler` — from the same image. Domain logic lives once; execution
   contexts scale independently. Check execution never competes with HTTP requests
   for the same process.

   **Contract-driven frontend/backend split.** The frontend is a pure client. Its
   only coupling to the backend is the OpenAPI contract, from which its types are
   generated. No shared code, no shared package, no leaked entities.

   ---

   ## 2. Architectural Principles

   1. **Domain ownership.** Every concept has exactly one owner — one backend
      module, one frontend feature. Ambiguous ownership is the root of most
      long-term decay.
   2. **Strict layering.** Transport → business logic → persistence. A layer may
      call downward, never upward, never around.
   3. **Dependency direction is one-way.** `shared`/`common`/`infrastructure` never
      depend on domains. Cycles are forbidden.
   4. **The database is the last line of tenancy defense.** Guards can be forgotten;
      a repository that cannot express an unscoped query cannot leak data.
   5. **Fail closed.** Global auth guard, opt-out public routes, startup config
      validation, `whitelist` validation. The default is "denied".
   6. **Idempotency by default** for anything a worker or webhook can run twice.
   7. **DRY with a limit.** One concept, one implementation — but two things that
      merely look alike stay separate. A wrong abstraction costs more than a small
      duplication.
   8. **Explicit over implicit.** No magic strings, no ambient singletons, no hidden
      `process.env` reads.
   9. **Separation of concerns / single responsibility.** If describing a unit needs
      "and", split it.
   10. **YAGNI.** No abstraction without a second caller or a concretely planned
      seam.
   11. **Scale is a design input, not a later optimization.** Check ingestion,
      incident deduplication, and alert throttling are designed for volume now.
   12. **Optimize for Claude Code effectiveness.** Explicit boundaries and a
      hierarchical `CLAUDE.md` system mean an agent working in a directory knows the
      rules that apply there without reading the whole repository.

   ---

   ## 3. Final Repository Tree

   ```text
   APIMonitor/
   │
   ├── CLAUDE.md
   ├── README.md
   ├── package.json                  Root scripts only (no runtime deps) — npm workspaces
   ├── .env.example
   ├── .gitignore
   ├── .editorconfig
   ├── docker-compose.yml
   ├── docker-compose.override.yml   Development (auto-applied)
   ├── docker-compose.prod.yml       Production
   │
   ├── Frontend/
   │   ├── CLAUDE.md
   │   ├── app/
   │   │   ├── layout.tsx  page.tsx  sitemap.ts  robots.ts
   │   │   ├── (marketing)/   pricing/ docs/ features/ contact/
   │   │   ├── (auth)/        login/ register/ forgot-password/ reset-password/ verify-email/
   │   │   ├── (dashboard)/
   │   │   │   ├── dashboard/   overview/ analytics/ activity/
   │   │   │   ├── projects/    new/ [projectId]/{overview,monitors,incidents,alerts,settings}/
   │   │   │   ├── monitors/    new/ [monitorId]/{checks,incidents,analytics,settings}/
   │   │   │   ├── incidents/   [incidentId]/
   │   │   │   ├── alerts/      channels/ rules/
   │   │   │   ├── status-pages/ new/ [statusPageId]/
   │   │   │   └── settings/    profile/ security/ notifications/ billing/ api-keys/ team/
   │   │   ├── status/[slug]/
   │   │   └── api/             auth/callback/ webhooks/billing/ health/
   │   │
   │   ├── features/         CLAUDE.md + auth, dashboard, projects, monitors (CLAUDE.md),
   │   │                     monitor-checks, incidents, alerts, status-pages, users,
   │   │                     billing, api-keys
   │   ├── shared/           ui/ components/ forms/ charts/ icons/ layouts/ providers/
   │   ├── services/         http clients per backend domain
   │   ├── hooks/            use-debounce, use-copy, use-media-query, use-query-params…
   │   ├── stores/           ui-store, theme-store (client state only)
   │   ├── providers/        query-provider, auth-provider, socket-provider, theme-provider
   │   ├── lib/              http/ query/ socket/ env/ logger/ date/ utils/
   │   ├── config/           routes, navigation, permissions, constants
   │   ├── types/            api/generated.ts (generated) + common
   │   ├── styles/
   │   ├── e2e/              Playwright
   │   └── middleware.ts
   │
   ├── Backend/
   │   ├── CLAUDE.md
   │   ├── src/
   │   │   ├── main.ts  worker.ts  scheduler.ts
   │   │   ├── app.module.ts  worker.module.ts  scheduler.module.ts
   │   │   ├── common/            decorators guards interceptors filters pipes middleware
   │   │   │                      exceptions dto constants enums types utils
   │   │   ├── config/            app auth database redis queue mail + validation.ts
   │   │   ├── infrastructure/    CLAUDE.md + database redis queue websocket logger http mailer
   │   │   ├── modules/           CLAUDE.md
   │   │   │   ├── auth/          CLAUDE.md
   │   │   │   ├── users/  organizations/  projects/
   │   │   │   ├── monitors/      CLAUDE.md
   │   │   │   ├── monitor-checks/
   │   │   │   ├── incidents/     CLAUDE.md
   │   │   │   ├── alerts/        CLAUDE.md
   │   │   │   ├── notifications/  status-pages/  analytics/  billing/  api-keys/
   │   │   ├── workers/           CLAUDE.md + monitor-check/ notification/ incident/ maintenance/
   │   │   └── health/
   │   └── test/                  integration/ e2e/ fixtures/
   │
   ├── Docker/
   │   ├── CLAUDE.md
   │   ├── backend/    Dockerfile  Dockerfile.dev  entrypoint.sh
   │   ├── frontend/   Dockerfile  Dockerfile.dev
   │   ├── postgres/   initdb/  postgresql.dev.conf
   │   ├── redis/      redis.conf
   │   └── nginx/      nginx.conf  conf.d/
   │
   ├── docs/
   │   ├── architecture.md  domain-model.md  monitor-execution.md
   │   ├── api-conventions.md  security.md  testing.md
   │   ├── local-development.md  implementation-phases.md
   │   └── adr/
   │
   └── scripts/
      ├── generate-api-types.ts   OpenAPI → Frontend/types/api/generated.ts
      ├── seed-dev.ts
      └── check-boundaries.ts     CI dependency-rule enforcement
   ```

   Changes from the original sketch, with reasons:

   | Change | Reason |
   | --- | --- |
   | Removed `app/sitemap/` | Next.js uses `app/sitemap.ts`, a file |
   | Added `settings/team` | The authorization model requires membership management |
   | Added `verify-email` route | Email verification is in scope |
   | Added `billing`, `api-keys` frontend features | They exist as backend modules; ownership must mirror |
   | No `packages/` | See ADR-0006 — the OpenAPI contract is sufficient |
   | Added `worker.ts`/`scheduler.ts` entrypoints | Role separation without splitting the codebase |
   | Added `scripts/check-boundaries.ts` | Dependency rules must be machine-enforced |
   | Dropped per-category component subfolders | Created on demand, not upfront |

   ---

   ## 4. Frontend Architecture

   **`app/` — route composition.** Pages read params, check auth, set metadata,
   prefetch, and assemble feature components. No business logic, no data
   transformation, no inline `fetch`. Route groups separate marketing, auth,
   dashboard, and the public status page, each with its own layout and auth posture.

   **`features/` — domain ownership.** The bulk of the code. Each feature owns UI,
   query hooks, schemas, and types behind a public `index.ts`. Cross-feature imports
   go through that file only.

   **`shared/` — domain-agnostic reuse.** UI primitives and composites that would
   make sense in a different product. `shared/` never imports a feature. It is not a
   dumping ground — code arrives only after two features need it and it has been made
   domain-free.

   **`services/` — transport.** Typed clients mirroring backend resources. No React,
   no business logic.

   **`lib/` — infrastructure.** HTTP client (auth refresh, error translation, request
   ids), query client, socket, env parsing, logging, dates.

   **`stores/` — client state only.** Zustand for UI shell state. Server state lives
   in TanStack Query, and duplicating it into a store is a defect.

   **State selection**, leftmost that works: URL → local state → context → TanStack
   Query → Zustand.

   **Server/client boundary.** Server Components by default; `'use client'` pushed to
   the leaves. `server-only`/`client-only` markers enforce the split. Only
   `NEXT_PUBLIC_*` reaches the browser.

   ---

   ## 5. Backend Architecture

   ```text
   Middleware → Guard → Pipe → Controller → Service → Repository → TypeORM → PostgreSQL
                                    ↑ Interceptor / Exception Filter
   ```

   **Controller** — transport only. Parse, delegate to one service call, return a
   mapped DTO. No business logic, no TypeORM, no queue access.

   **Service** — all business logic, orchestration, transaction boundaries, typed
   domain exceptions. May call another module's exported service; never another
   module's repository.

   **Repository** — all data access, with mandatory tenant scoping. The rest of the
   app does not know TypeORM exists.

   **Entity** — persistence shape. Never leaves the backend.

   **DTO** — the wire contract. Requests validated by class-validator, responses
   produced by explicit mappers.

   **`common/`** — domain-agnostic cross-cutting code. **`infrastructure/`** —
   technical adapters. Neither imports from `modules/`.

   **`modules/`** — the business: auth, users, organizations, projects, monitors,
   monitor-checks, incidents, alerts, notifications, status-pages, analytics,
   billing, api-keys. Modules communicate through exported services and domain
   events; the graph is acyclic.

   ---

   ## 6. Worker Architecture

   One image, three roles selected by `APP_ROLE`:

   | Role | Entrypoint | Root module | Responsibility |
   | --- | --- | --- | --- |
   | `api` | `main.ts` | `AppModule` | HTTP + WebSocket; **produces** jobs |
   | `worker` | `worker.ts` | `WorkerModule` | **consumes** jobs; no controllers |
   | `scheduler` | `scheduler.ts` | `SchedulerModule` | repeatable jobs; exactly one replica |

   `AppModule` never imports `WorkersModule`, so the API registers no BullMQ
   `Worker`. `WorkerModule` imports domain modules without controllers, so the worker
   serves no HTTP. Both share `infrastructure/` and `config/`, so a service behaves
   identically in either process.

   Workers call **domain services**, never repositories — business rules stay in one
   place whether triggered by a request or a job. Workers never hold socket
   connections; they publish to Redis pub/sub and the API relays.

   This is the answer to "separate processes without `apps/worker`": separation is a
   composition-root concern, not a directory-layout concern.

   ---

   ## 7. Docker Architecture

   `Docker/` holds Dockerfiles and service configuration; compose files live at the
   root and orchestrate the repo.

   Services: `postgres`, `redis`, `migrator` (one-shot), `backend-api`,
   `backend-worker` (scalable), `backend-scheduler` (pinned to one replica),
   `frontend`, and `nginx` in production.

   Development and production use **separate compose files**. Dev bind-mounts source
   and publishes database ports; production bakes images, exposes only the edge, runs
   non-root, and scales replicas. Migrations run in the `migrator` service so N
   replicas never race.

   Health checks gate startup order:
   `postgres,redis → migrator → api/worker/scheduler → frontend`.

   ---

   ## 8. Database Architecture

   PostgreSQL + TypeORM, `synchronize: false` everywhere, migrations always.

   UUID v7 primary keys generated in the application (time-sortable, index-friendly).
   Every tenant-scoped table carries an indexed `organization_id`; composite indexes
   lead with it. `timestamptz` in UTC. Soft deletion only where restore is a real
   requirement — never on `monitor_checks`.

   `monitor_checks` is the volume problem: append-only, no `updated_at`, no soft
   delete, time-partitioned, retention enforced by a scheduled job, and never scanned
   to render a list. Monitors carry denormalized `lastStatus`/`lastCheckAt`/
   `lastLatencyMs` for list views; aggregates come from `analytics`.

   The one-open-incident invariant is a partial unique index
   (`UNIQUE (monitor_id) WHERE resolved_at IS NULL`), not an application check.

   Transactions are opened by services and passed down. Raw SQL lives only in
   repositories and is always parameterized.

   Full model: `docs/domain-model.md`.

   ---

   ## 9. Redis / BullMQ Architecture

   Queues: `monitor-check` (hot path), `incident`, `notification`, `maintenance`.
   Names and default options are constants in `infrastructure/queue/`.

   Producers are injected services — only domain services enqueue. Payloads carry
   ids, a timestamp, and a correlation id; never entities, never secrets.

   Every job: bounded attempts, exponential backoff with jitter, an explicit timeout
   shorter than the monitor interval, bounded completion/failure retention, and
   idempotent processing. Exhausted jobs are dead-lettered with enough context to
   replay, never silently dropped.

   Scheduling uses one repeatable job per monitor with a deterministic
   `jobId` (`monitor:{monitorId}`), so re-registration replaces rather than
   duplicates. The scheduler reconciles on boot, making the schedule self-healing.
   Migration path to a tick-based dispatcher is recorded in ADR-0004.

   Redis also backs session revocation, rate limiting, distributed locks, and
   pub/sub. Its BullMQ instance uses `noeviction` — an evicted job is a lost job.

   Full pipeline: `docs/monitor-execution.md`.

   ---

   ## 10. Authentication Architecture

   Owned entirely by `modules/auth/`.

   Argon2id passwords. Short-lived access JWT carrying identity but **no
   permissions** — permissions resolve per request so a role change is immediate.
   Long-lived opaque refresh tokens stored hashed, rotated on every use, with family
   revocation on reuse detection, delivered in an httpOnly `SameSite=Strict` cookie.
   Revocation via a Redis session denylist so logout is immediate.

   Email verification and password reset use single-use, hashed, short-expiry tokens.
   Password reset responses never reveal whether an email exists. API keys are a
   parallel credential: `apim_<publicId>_<secret>`, hashed at rest, organization-
   scoped, explicitly permissioned, shown once.

   `JwtAuthGuard` is global; public endpoints opt out with `@Public()`. Forgetting a
   decorator fails closed.

   ---

   ## 11. Authorization Architecture

   ```text
   User ──< Membership >── Organization
               └── Role ──< Permission
   ```

   A user alone grants nothing; all authority flows from membership. Permissions are
   `<resource>:<action>` from an exhaustive catalogue. Roles: `OWNER`, `ADMIN`,
   `MEMBER`, `VIEWER`, with custom roles as a later extension the model already
   supports.

   Two independent, both-mandatory layers:

   1. **Guard** — `@RequirePermission('monitor:create')` evaluated by
      `PoliciesGuard`: may this actor perform this action?
   2. **Repository** — every method filters on `organizationId`: is this row even
      reachable?

   Layer 2 is what actually prevents IDOR. Inline ownership checks
   (`if (user.id === resource.userId)`) are forbidden. Cross-tenant access returns
   **404**, never 403, so existence is not leaked. WebSocket room joins run the same
   permission check as the equivalent REST read.

   ---

   ## 12. API Architecture

   `/api/v1/`, plural kebab-case nouns, nesting that mirrors ownership
   (`/projects/:projectId/monitors`). Global `ValidationPipe` with `whitelist` and
   `forbidNonWhitelisted`.

   One response envelope, one error envelope with stable machine-readable codes, one
   cursor pagination contract — all in `common/dto/`. Cursor pagination for
   high-volume collections; offset only for small bounded lists. `Idempotency-Key`
   supported on retryable mutations.

   Swagger decorators are mandatory. The OpenAPI JSON is always generated and is the
   source for the frontend's types.

   Full conventions: `docs/api-conventions.md`.

   ---

   ## 13. WebSocket Architecture

   Socket.IO on the API process. Handshake authentication reuses JWT verification.
   Rooms are tenant-scoped (`org:{id}`, `project:{id}`, `monitor:{id}`) and joining
   runs the same permission check as the REST equivalent.

   Events: `monitor.status_changed`, `monitor.check_completed`, `incident.created`,
   `incident.resolved`, `alert.triggered`. Payloads are contracts with ids and
   scalars — no entities, no secrets.

   Workers publish to Redis pub/sub; the API relays to rooms. This keeps socket state
   on the API tier and lets workers stay stateless.

   Real-time is an enhancement: every view must be correct with the socket down.

   ---

   ## 14. Dependency Graph

   Allowed:

   ```text
   Frontend/app → Frontend/features → Frontend/{shared,services,lib,hooks,config,types}
   Frontend → (HTTP/WS) → Backend API

   Backend controller → service → repository → TypeORM → PostgreSQL
   Backend modules → infrastructure → {PostgreSQL, Redis}
   Backend module A → module B's exported service
   Backend module → domain event → subscribing module
   Backend service → queue producer → BullMQ → worker processor → domain service
   ```

   Forbidden:

   ```text
   shared            → features
   feature A         → feature B internals
   Frontend          → TypeORM / backend entities / backend repositories
   Frontend/app      → business logic
   controller        → TypeORM / Redis / BullMQ
   controller        → another module's repository
   service           → another module's repository
   repository        → another repository
   infrastructure    → modules
   common            → modules
   workers           → repositories (go through services)
   Docker/           → application source
   any               → circular import
   ```

   Enforced by ESLint boundary rules plus `scripts/check-boundaries.ts` in CI.

   ---

   ## 15. CLAUDE.md Hierarchy

   Twelve files. Each exists because it carries rules not derivable from the code
   around it.

   ```text
   CLAUDE.md                                    Root architectural contract
   Frontend/CLAUDE.md                           Next.js architecture and boundaries
   Frontend/features/CLAUDE.md                  Feature anatomy, public API rule
   Frontend/features/monitors/CLAUDE.md         Status presentation, real-time, form
   Backend/CLAUDE.md                            NestJS architecture, layering, roles
   Backend/src/modules/CLAUDE.md                Module boundaries, events, module graph
   Backend/src/modules/auth/CLAUDE.md           Tokens, guards, the permission model
   Backend/src/modules/monitors/CLAUDE.md       Lifecycle, scheduling, status evaluation
   Backend/src/modules/incidents/CLAUDE.md      State machine, one-open invariant
   Backend/src/modules/alerts/CLAUDE.md         Rule evaluation, dedup, escalation
   Backend/src/infrastructure/CLAUDE.md         Adapters, SSRF client, Redis/DB rules
   Backend/src/workers/CLAUDE.md                Role separation, job reliability
   ```

   Deliberately **not** created: `Frontend/app/`, `Frontend/shared/`,
   `Backend/src/common/`, and most modules. Their rules fit in the parent file, and a
   file that only restates its parent trains agents to skim.

   ---

   ## 16. ADRs

   `docs/adr/` records decisions where a reasonable engineer would ask "why not the
   other thing". Nine records cover the monolith choice, runtime roles, TypeORM,
   scheduling strategy, the token model, the absence of a shared package, the check
   storage strategy, the authorization model, and the compose split. Each is
   immutable once accepted — a change is a new ADR that supersedes it.

   ---

   ## 17. Implementation Phases

   See `docs/implementation-phases.md`. Phase 0 is the directory skeleton and
   tooling; no business feature is built until the foundation, auth, and tenancy are
   in place, because retrofitting tenancy into existing queries is the single most
   expensive mistake available here.
