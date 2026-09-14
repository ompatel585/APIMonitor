# APIMonitor — Root Architectural Contract

This file is the highest-level architectural contract for this repository. Every
other `CLAUDE.md` in this repo refines it for a narrower scope. Where a nested
file adds a rule, it wins for that directory. Where it is silent, this file
applies.

Read this file before making any change. Read the nested `CLAUDE.md` for the
directory you are touching before writing code in it.

---

## 1. Project Purpose

APIMonitor is a production-grade monitoring/observability SaaS. Customers
register, create projects, define HTTP/API monitors, and the system executes
those monitors on a recurring schedule from background workers. Results feed
uptime and latency analytics, failure detection, incident lifecycle management,
alert rule evaluation, notification delivery, and public status pages.

The system is designed for a large number of monitors executing continuously. A
change that works for 100 monitors but not 100,000 is not an acceptable change.

**Domain vocabulary** (use these words exactly; do not invent synonyms):

| Term | Meaning |
| --- | --- |
| `Organization` | Billing and ownership boundary. Every tenant-scoped row belongs to exactly one. |
| `Membership` | A `User`'s role within an `Organization`. Authorization is derived from this, never from `User` alone. |
| `Project` | A grouping of monitors inside an organization. |
| `Monitor` | A configured, schedulable check definition (URL, method, interval, assertions). |
| `MonitorCheck` | One execution result of a monitor. High-volume, append-only, time-series shaped. |
| `Incident` | An open period of degraded/failed state for a monitor. Opened on confirmed failure, resolved on confirmed recovery. |
| `AlertRule` | A condition that, when matched by an incident/monitor event, produces notifications. |
| `NotificationChannel` | A configured delivery destination (email, webhook, etc.). |
| `StatusPage` | A public, unauthenticated view over a selected set of monitors. |
| `ApiKey` | A programmatic credential scoped to an organization. |

---

## 2. Architecture Style

A **three-boundary modular monolith with detachable workers**.

```text
Frontend/   Next.js App Router client. Presentation + client-side orchestration.
Backend/    NestJS application. ALL business logic, persistence, and job processing.
Docker/     Container and infrastructure configuration ONLY. Never application code.
```

These three directories are the top-level architectural boundaries and are
permanent. **Do not** restructure into `apps/web`, `apps/api`, `apps/worker`, or
any other layout. Do not add a `packages/` workspace (see §12).

The backend is one codebase that boots into one of several **runtime roles**
(`api`, `worker`, `scheduler`). Same image, same code, different entrypoint and
different loaded modules. This keeps domain logic in one place while letting the
API and background processing scale as separate containers.

---

## 3. Dependency Direction

Dependencies flow strictly downward. An arrow means "may import from".

```text
Frontend/app            (routes — composition only)
        ↓
Frontend/features       (domain UI + hooks + client API calls)
        ↓
Frontend/shared, services, lib, config
        ↓
        ⇢ HTTP / WebSocket over the network ⇠
        ↓
Backend/src/modules     (domain: controllers → services → repositories)
        ↓
Backend/src/infrastructure  (database, redis, queue, websocket, logger, http)
        ↓
PostgreSQL / Redis
```

And for background processing:

```text
Backend/src/modules/*/services   (enqueue via a queue producer)
        ↓
Backend/src/infrastructure/queue (BullMQ abstraction)
        ↓
Backend/src/workers/*            (processors)
        ↓
Backend/src/modules/*/services   (workers call domain services — never repositories directly)
```

### Forbidden dependencies

These are hard errors, not preferences. Enforced by ESLint boundary rules and by
review.

```text
shared            →  features              (shared must never know a domain exists)
feature A         →  feature B internals   (only a feature's public index.ts is importable)
Frontend          →  TypeORM               (never)
Frontend          →  backend entities      (never)
Frontend          →  backend repositories  (never)
Frontend/app      →  business logic        (routes compose; they do not decide)
controller        →  TypeORM repository    (controllers never touch persistence)
controller        →  Redis / BullMQ client (controllers never touch queue internals)
controller        →  another module's repository
service           →  another module's repository (use the other module's service)
repository        →  another module's repository
infrastructure    →  modules               (infrastructure is domain-agnostic)
common            →  modules               (common is domain-agnostic)
workers           →  repositories directly (workers go through domain services)
Docker/           →  application source    (config only)
anything          →  circular imports      (never)
```

Exceptions are permitted only through an explicitly documented public interface
(a module's exported service, or a feature's `index.ts`). If you believe you need
an exception, stop and ask rather than adding the import.

---

## 4. Coding Conventions

### Language

- TypeScript everywhere, `strict: true`. `any` is forbidden; use `unknown` plus a
  narrowing guard. `@ts-ignore` is forbidden; `@ts-expect-error` requires a
  comment explaining why and a linked issue.
- No default exports except where a framework demands it (Next.js pages,
  layouts, route handlers, `middleware.ts`). Named exports everywhere else.
- Prefer `type` for object shapes and unions; use `interface` only when you need
  declaration merging or class implementation.
- No enums in shared contract types — use `as const` objects plus a derived union.
  Backend-internal TypeORM enums are the exception (they map to Postgres enums).

### Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Directories | `kebab-case` | `monitor-checks/` |
| React components (file + symbol) | `PascalCase` file, `PascalCase` symbol | `MonitorStatusBadge.tsx` |
| React hooks | `use-kebab.ts` → `useCamel` | `use-monitor-list.ts` → `useMonitorList` |
| Backend files | `kebab-case.<role>.ts` | `monitors.service.ts`, `create-monitor.dto.ts` |
| Classes | `PascalCase` | `MonitorsService`, `CreateMonitorDto` |
| Functions/variables | `camelCase` | `evaluateCheckResult` |
| Constants | `SCREAMING_SNAKE_CASE` | `DEFAULT_CHECK_TIMEOUT_MS` |
| DB tables | `snake_case`, plural | `monitor_checks` |
| DB columns | `snake_case` | `created_at`, `organization_id` |
| Queue names | `kebab-case`, singular domain | `monitor-check`, `notification` |
| Env vars | `SCREAMING_SNAKE_CASE`, prefixed by concern | `DATABASE_URL`, `REDIS_HOST` |

Booleans read as assertions: `isActive`, `hasIncident`, `canEdit`. Never
`flag`, `status2`, `check2`.

### Do Not Repeat Yourself

DRY is a first-class rule in this repo, with a deliberate limit.

**Before writing any new utility, component, hook, service, type, constant,
guard, or query — search for an existing one.** Use grep/glob across the relevant
boundary. Duplicating an existing abstraction is a defect even if the new code
works.

- One concept, one implementation, one owner. Date formatting lives in one place.
  Pagination lives in one place. HTTP client configuration lives in one place.
- If the same logic appears a second time, extract it to the nearest **common
  ancestor layer** — not into `shared/` reflexively. Two components in
  `features/monitors` share code → it goes in `features/monitors`, not `shared/`.
- If the same logic appears in two different features, it belongs in `shared/`
  (frontend) or `common/` (backend) — and it must be made domain-agnostic first.
- Repeated string literals become named constants in the owning module.
- Repeated query shapes become a repository method, not a copied query builder.

**The limit:** do not abstract on the first repetition if the two uses are
coincidentally similar rather than conceptually the same. Two things that look
alike today but change for different reasons must stay separate. Prefer a small
amount of duplication over a wrong abstraction that couples two domains. When in
doubt, duplicate once, abstract on the third occurrence, and name the concept
when you do.

### Other principles this repo follows

- **Single responsibility.** A file, class, or function does one thing. If you
  need "and" to describe it, split it.
- **Separation of concerns.** Transport, business logic, and persistence never
  mix in one unit. This is the layering rule in §5, stated generally.
- **Explicit over implicit.** No hidden globals, no ambient singletons, no magic
  strings. Dependencies arrive through constructor injection or props.
- **Fail fast, fail loud.** Validate at the boundary, throw typed domain errors,
  never silently swallow. An empty `catch {}` is a defect.
- **Least privilege.** Every query is tenant-scoped. Every endpoint is guarded.
  Every secret is server-only.
- **YAGNI.** Do not build for a requirement nobody has stated. Do not create an
  abstraction with exactly one implementation unless it is a seam we have
  concretely planned for.
- **Composition over inheritance.** Deep class hierarchies are forbidden;
  compose services and providers instead.
- **Idempotency by default** for anything a worker or webhook can run twice.
- **Immutability at boundaries.** Do not mutate function arguments, DTOs, or
  props. Return new values.
- **Boy Scout rule, bounded.** Leave touched code better than you found it, but
  do not refactor unrelated domains in the same change (see §10).

---

## 5. Layering Rules (Backend)

```text
HTTP Request
   ↓ Middleware        (request id, correlation id, raw-body where needed)
   ↓ Guard             (authentication, then authorization)
   ↓ Pipe              (validation + transformation of DTOs)
   ↓ Controller        (transport only: parse, delegate, shape response)
   ↓ Service           (ALL business logic, transactions, orchestration)
   ↓ Repository        (ALL data access; owns query construction)
   ↓ TypeORM → PostgreSQL
   ↑ Interceptor       (response envelope, timing, logging)
   ↑ Exception Filter  (typed error → HTTP response)
```

**Controllers MUST NOT** contain business logic, touch a TypeORM repository or
`DataSource`, build queries, execute monitor logic, touch Redis or BullMQ
directly, or reach into another module's internals. A controller method should be
readable in a few lines: destructure input, call one service method, return.

**Services** own business logic, cross-entity orchestration, transaction
boundaries, and calls to other modules' services. They never receive or return
HTTP objects (`Request`, `Response`).

**Repositories** own persistence. Every repository method is tenant-scoped by
required arguments — an `organizationId` (or a chain to one) is not optional.

**Entities** are persistence models only. They never leave the backend, never
appear in a controller signature, and never carry business methods beyond
trivial computed getters.

**DTOs** are the transport contract — input validation via `class-validator`,
output shaping via mappers. Entities are mapped to response DTOs explicitly; never
return an entity from a controller.

---

## 6. Security Rules

- **Multi-tenancy is enforced in the repository layer.** Every query that reads
  or writes tenant data takes an `organizationId` and filters on it. A repository
  method that can return another tenant's row is a critical defect.
- **Authorization is never an inline ownership check.** No
  `if (user.id === resource.userId)` scattered in services. Use the policy/guard
  system described in `Backend/src/modules/auth/CLAUDE.md`.
- **Never trust a client-supplied id.** Resolve it through a tenant-scoped
  repository read; a 404 (not a 403) is the correct response for a resource in
  another tenant, to avoid leaking existence.
- **Secrets are server-only.** No secret ever appears in a `NEXT_PUBLIC_*` var, a
  client component, a client bundle, an error message, or a log line.
- **Passwords** are hashed with Argon2id. Never logged, never returned, never
  compared with `===`.
- **Tokens.** Short-lived access JWT, long-lived rotating refresh token stored
  hashed and revocable. Refresh reuse detection revokes the family.
- **Never log**: passwords, JWTs, refresh tokens, API key secrets, DB
  credentials, webhook secrets, full request bodies of auth endpoints, or PII
  beyond identifiers.
- **Never expose in a production API response**: stack traces, SQL, driver
  errors, entity/column names, internal hostnames, or library versions.
- **SSRF is a real risk** — monitors fetch user-supplied URLs. Monitor execution
  must go through the hardened HTTP client in
  `Backend/src/infrastructure/http/`, which enforces allow/deny rules, blocks
  private/link-local address ranges, caps redirects, and caps response size.
  Never use raw `axios`/`fetch` for monitor execution.
- Rate limit authentication, password reset, and public status page endpoints.
- All input validated at the boundary. No endpoint accepts unvalidated data.

---

## 7. Database Rules

- PostgreSQL + TypeORM.
- **`synchronize` is `false` in every environment, always.** Schema changes ship
  as migrations in `Backend/src/infrastructure/database/migrations/`.
- Every migration is reviewed for lock behavior. Index creation on large tables
  uses `CONCURRENTLY`. Adding a `NOT NULL` column to a large table is a
  multi-step migration, never a single statement.
- Primary keys are UUID v7 (time-sortable) generated in the application layer,
  not `uuid_generate_v4()` in the DB.
- Every tenant-scoped table carries `organization_id` with a foreign key and an
  index. Composite indexes lead with `organization_id`.
- Every table has `created_at` and `updated_at` (`timestamptz`). Soft deletion
  (`deleted_at`) only where restore is a real product requirement — not by
  default, and never on high-volume append-only tables.
- `monitor_checks` is high-volume and append-only: no soft delete, no
  `updated_at`, time-based partitioning planned, retention enforced by a
  scheduled job.
- Multi-write operations run in a transaction owned by the service layer.
- Money is `numeric`, never float. Timestamps are `timestamptz`, always UTC.
- Never write raw SQL in a service. Raw SQL lives in a repository method and is
  parameterized — string interpolation into SQL is forbidden.

---

## 8. API Rules

- All routes under `/api/v1/`. Versioning via URI.
- Plural, kebab-case resource nouns: `/api/v1/projects/:projectId/monitors`.
- Verbs: `GET` list/read, `POST` create, `PATCH` partial update, `PUT` full
  replace (rare), `DELETE` remove. Never a verb in the path except for genuine
  non-CRUD actions, which use `POST /resource/:id/actions/<verb>`.
- Status codes: `200` ok, `201` created, `204` no content, `400` validation,
  `401` unauthenticated, `403` unauthorized, `404` not found (also used to mask
  cross-tenant access), `409` conflict, `422` domain rule violation, `429` rate
  limited, `500` unexpected.
- Cursor-based pagination for high-volume collections (checks, incidents);
  offset pagination is permitted only for small, bounded lists.
- One error envelope for every failure, defined in `Backend/src/common/`. Every
  error carries a stable machine-readable `code`.
- Every endpoint is documented with Swagger decorators. An undocumented endpoint
  is an incomplete endpoint.
- Mutating endpoints that a client may retry accept an `Idempotency-Key` header.

Full conventions: `docs/api-conventions.md`.

---

## 9. Environment Variables

- Never read `process.env` outside `Backend/src/config/` (backend) or
  `Frontend/lib/env/` (frontend). Everywhere else, inject typed config.
- All variables are validated at startup with a schema. A missing or malformed
  required variable crashes the process immediately — it never falls back to a
  default in production.
- `.env.example` at the repo root is the single source of truth for what exists.
  Adding a variable means updating `.env.example` in the same change.
- `.env*` files are git-ignored except `.env.example`. Never commit a real secret.
- Frontend: only `NEXT_PUBLIC_*` reaches the browser. Anything else is
  server-only and must be imported through a module marked `server-only`.

---

## 10. Git Practices

- Conventional Commits: `feat(monitors): add interval validation`. Scope is the
  domain or boundary (`frontend`, `backend`, `docker`, `monitors`, `auth`, ...).
- One logical change per commit. Migrations ship in the same commit as the entity
  change that requires them.
- Branches: `feat/<scope>-<short-description>`, `fix/...`, `chore/...`,
  `docs/...`.
- Never commit: `.env`, secrets, `node_modules/`, build output, `*.pem`, dumps.
- Do not modify an unrelated domain in the same commit. If a change requires
  touching another domain, say so explicitly in the summary and keep it minimal.

---

## 11. Testing

| Layer | Tool | Location |
| --- | --- | --- |
| Backend unit (services, mappers, pure logic) | Jest | beside source in `tests/` inside the module |
| Backend integration (repositories, migrations) | Jest + Testcontainers | `Backend/test/integration/` |
| Backend E2E (HTTP through the real app) | Jest + Supertest | `Backend/test/e2e/` |
| Worker processors | Jest (unit) + Testcontainers (integration) | module `tests/` + `Backend/test/integration/` |
| Frontend unit (utils, hooks) | Vitest | beside source |
| Frontend component | Vitest + Testing Library | beside component |
| Frontend E2E | Playwright | `Frontend/e2e/` |

Rules: tests never hit the public internet; monitor execution tests use a local
HTTP fixture server. Integration tests use a disposable Postgres/Redis, never a
shared dev database. Business logic requires a test; presentational components
generally do not. Coverage is a signal, not a target — an untested authorization
path is a blocker regardless of the number.

Full strategy: `docs/testing.md`.

---

## 12. Shared Types Between Frontend and Backend

**We do not introduce a `packages/` workspace.** The benefit does not justify
the tooling cost at this size, and it would violate the three-directory
boundary.

The frontend's contract with the backend is the **OpenAPI document the backend
already produces**. Types are generated from it into
`Frontend/types/api/generated.ts` by `scripts/generate-api-types.ts`. The
generated file is committed and never hand-edited.

This means:
- The backend is the single source of truth for the contract.
- The frontend gets exact types without importing backend code.
- TypeORM entities, repositories, services, and internal DTO classes are **never**
  visible to the frontend.

Revisit only if a third consumer (a CLI, a second app) appears. Recorded as
`docs/adr/0006-no-shared-package-workspace.md`.

---

## 13. Claude Code Workflow

Follow this sequence for every task:

1. Read this file, then the `CLAUDE.md` files on the path to the directory you
   are changing (most specific last).
2. Understand the requirement. Ask if it is ambiguous rather than guessing.
3. Inspect the existing implementation before writing anything.
4. Identify the owning domain. Work belongs to exactly one module/feature.
5. Reuse existing abstractions. Search before you create (see DRY, §4).
6. Do not duplicate a utility, service, hook, or component that already exists.
7. Make the smallest architectural change that satisfies the requirement.
8. Implement.
9. Run type checking.
10. Run linting.
11. Run the relevant tests.
12. Review dependency boundaries against §3.
13. Review security implications against §6 — especially tenancy and authorization.
14. Review database and API changes: migration correctness, index impact,
    breaking-change risk, Swagger updated.
15. Summarize exactly what changed and why, including anything you deliberately
    did not do.

### Claude MUST NOT

- create folders that are not justified by an actual file being placed in them
- duplicate a utility, component, hook, service, or type that already exists
- put business logic in a controller
- put business logic in a Next.js page, layout, or route handler
- dump domain code into `shared/` or `common/`
- create global state for something that is server state
- bypass an authorization guard or policy
- bypass validation
- access the database from a controller
- expose a secret to the client bundle
- introduce a circular dependency
- modify an unrelated domain without stating why
- create an abstraction with no second caller and no concrete planned seam
- set `synchronize: true`
- use `any`, `@ts-ignore`, or a non-null assertion to silence the compiler
- run a destructive database command against anything but a disposable test DB

---

## 14. Commands

```bash
# root
npm run dev              # compose up the full local stack
npm run typecheck        # both workspaces
npm run lint             # both workspaces

# Backend/
npm run start:dev        # API role, watch mode
npm run start:worker     # worker role
npm run migration:generate -- <Name>
npm run migration:run
npm run test | test:integration | test:e2e

# Frontend/
npm run dev | build | typecheck | lint | test | test:e2e
```

---

## 15. Documentation Map

| Document | Purpose |
| --- | --- |
| `docs/architecture.md` | Full architectural narrative and rationale |
| `docs/domain-model.md` | Entities, relations, invariants, lifecycle |
| `docs/monitor-execution.md` | The scheduling → check → incident → alert pipeline |
| `docs/api-conventions.md` | REST, pagination, errors, idempotency, versioning |
| `docs/security.md` | Threat model, authn/authz, tenancy, SSRF, secrets |
| `docs/testing.md` | Test strategy per layer |
| `docs/local-development.md` | Getting the stack running |
| `docs/implementation-phases.md` | The build order |
| `docs/adr/` | Architectural decision records |

---

## 16. Current Status

**The repository is at the architecture stage.** Only documentation and
`CLAUDE.md` files exist. No application code, no `package.json`, no directory
skeleton has been created yet.

Do not implement business features. The next step is Phase 0 in
`docs/implementation-phases.md`, and only after explicit approval.
