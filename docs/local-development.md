# Local Development

> Applies from Phase 0 onward. The repository is currently at the architecture
> stage — none of these commands work yet.

---

## 1. Prerequisites

Docker Desktop (Compose v2), Node.js 22 LTS, npm 10+, Git. Nothing else needs to
be installed on the host — Postgres and Redis run in containers.

---

## 2. First Run

```bash
git clone <repo> APIMonitor && cd APIMonitor
cp .env.example .env          # defaults work for local development
npm install                   # workspace install
npm run dev                   # compose up the full stack
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Swagger | http://localhost:4000/api/docs |
| Postgres | localhost:5432 (dev only) |
| Redis | localhost:6379 (dev only) |

```bash
npm run db:migrate            # apply migrations
npm run db:seed               # seed a dev org, user, project, monitors
```

Seeded login: `dev@apimonitor.local` / `DevPassword123!`

---

## 3. Everyday Commands

```bash
# root
npm run dev            # full stack
npm run dev:down       # stop (keeps volumes)
npm run logs           # tail all services
npm run typecheck      # both workspaces
npm run lint
npm run check-boundaries

# Backend/
npm run start:dev                            # API, watch mode
npm run start:worker:dev                     # worker
npm run start:scheduler:dev                  # scheduler
npm run migration:generate -- <Name>
npm run migration:run
npm run migration:revert
npm run test | test:integration | test:e2e

# Frontend/
npm run dev | build | test | test:e2e
npm run generate:api-types                   # OpenAPI → types/api/generated.ts
```

Never `docker compose down -v` unless you intend to destroy the database.

---

## 4. Running Roles Separately

The three roles come up as separate containers automatically. To run one on the
host against containerized dependencies:

```bash
docker compose up -d postgres redis
cd Backend
APP_ROLE=api       npm run start:dev
APP_ROLE=worker    npm run start:worker:dev
APP_ROLE=scheduler npm run start:scheduler:dev
```

Run **one** scheduler. Two will double-schedule every monitor.

---

## 5. Database Work

```bash
# after changing an entity
npm run migration:generate -- AddMonitorRetryPolicy
# READ AND EDIT the generated file before running it
npm run migration:run
```

Generated migrations are a starting point, not an answer. Check for: accidental
column drops, index creation on a large table without `CONCURRENTLY`, a
`NOT NULL` added without a default or a backfill, and a rename generated as
drop + add (which loses data).

`synchronize` is `false` everywhere. If the schema seems out of date, you are
missing a migration.

---

## 6. Queue Inspection

```bash
docker compose exec redis redis-cli
> KEYS bull:monitor-check:*
> LLEN bull:monitor-check:wait
```

A growing `wait` list means workers are behind — scale `backend-worker` or check
for a stuck processor. Schedule lateness is the metric that matters; queue length
is the symptom.

---

## 7. Testing Locally

```bash
cd Backend
npm run test                  # unit — no containers needed
npm run test:integration      # spins up Testcontainers, needs Docker running
npm run test:e2e

cd ../Frontend
npm run test
npm run test:e2e              # needs the stack up
```

Integration tests never touch your dev database — they create disposable
containers.

---

## 8. Troubleshooting

| Symptom | Cause |
| --- | --- |
| Backend can't reach the DB | Using `localhost` instead of `postgres` inside a container |
| Monitors never run | Scheduler not running, or a monitor is inactive; check reconciliation logs |
| Monitors run twice | More than one scheduler replica |
| Frontend types out of date | Run `npm run generate:api-types` after a backend contract change |
| Startup crash on boot | A required env var is missing — that is intended behavior; read the validation error |
| Port already in use | Something else on 3000/4000/5432/6379 |
| Stale `node_modules` in a container | Rebuild: `docker compose build --no-cache <service>` |

---

## 9. Before Opening a PR

```bash
npm run typecheck && npm run lint && npm run check-boundaries
cd Backend && npm run test && npm run test:integration
cd ../Frontend && npm run test
```

And confirm: new env vars are in `.env.example`, new endpoints have Swagger
decorators and a permission, new repository methods filter on `organizationId`,
and a cross-tenant denial test exists for anything new that reads data.
