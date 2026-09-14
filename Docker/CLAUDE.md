# Docker — Infrastructure & Container Configuration

Scope: everything under `Docker/`. Read the root `CLAUDE.md` first.

`Docker/` holds **only** container and infrastructure configuration. Application
source code lives in `Frontend/` and `Backend/` and nowhere else.

---

## 1. What Belongs Here

```text
Docker/
├── backend/
│   ├── Dockerfile              Multi-stage: deps → build → runtime. Serves api, worker, scheduler.
│   ├── Dockerfile.dev          Dev image with watch mode and dev dependencies.
│   └── entrypoint.sh           Waits for dependencies, dispatches on APP_ROLE.
│
├── frontend/
│   ├── Dockerfile              Multi-stage → Next.js standalone output.
│   └── Dockerfile.dev
│
├── postgres/
│   ├── initdb/                 First-boot SQL: extensions, roles. NOT schema — schema is migrations.
│   └── postgresql.dev.conf     Optional dev tuning.
│
├── redis/
│   └── redis.conf              Persistence, maxmemory policy (BullMQ needs `noeviction`).
│
└── nginx/                      Production reverse proxy only. Not used in local dev.
    ├── nginx.conf
    └── conf.d/
```

Compose files live at the **repository root**, not here — they orchestrate the
whole repo and reference `Docker/` for build context.

---

## 2. What MUST NOT Be Here

- application source code of any kind
- `.env` files or any real secret (only `.env.example` at the root)
- migrations or seed data (migrations belong to `Backend/`)
- TLS private keys or certificates
- database dumps or backups
- build artifacts, `node_modules/`
- anything a developer would edit to change product behavior

If you are editing a file in `Docker/` to change how the product behaves rather
than how it is deployed, you are in the wrong directory.

---

## 3. Services

| Service | Image / build | Role |
| --- | --- | --- |
| `postgres` | `postgres:16-alpine` | Primary datastore. Named volume. |
| `redis` | `redis:7-alpine` | Queues, cache, rate limits, locks, pub/sub. |
| `backend-api` | `Docker/backend` | NestJS API + WebSocket gateway. `APP_ROLE=api`. |
| `backend-worker` | same image | BullMQ processors. `APP_ROLE=worker`. Scalable to N replicas. |
| `backend-scheduler` | same image | Repeatable jobs / due-monitor dispatch. `APP_ROLE=scheduler`. **Exactly one replica.** |
| `frontend` | `Docker/frontend` | Next.js. |
| `migrator` | same backend image | One-shot `migration:run`. Runs to completion before API starts. |
| `nginx` | `Docker/nginx` | Production only. TLS termination, routing. |

**The backend API, worker, and scheduler share one image and differ only by
`APP_ROLE`.** This is what makes them independently scalable without splitting
the codebase.

The scheduler must never run more than one replica — duplicate replicas would
double-schedule monitor checks. If it needs to be HA later, the fix is a
Redis-based leader lock, not a second replica.

---

## 4. Development vs Production

**Separate files. Do not try to make one file serve both.**

```text
docker-compose.yml            Base: shared service definitions.
docker-compose.override.yml   Dev (auto-applied): bind mounts, watch mode, exposed DB/Redis ports, dev Dockerfiles.
docker-compose.prod.yml       Prod: prebuilt images, no bind mounts, no exposed DB ports, replicas, resource limits, nginx.
```

| Concern | Development | Production |
| --- | --- | --- |
| Source | bind-mounted, hot reload | baked into the image |
| Build | `Dockerfile.dev` | multi-stage `Dockerfile`, non-root user |
| Postgres/Redis ports | published to host | internal network only |
| Secrets | `.env` file | orchestrator secret store |
| Frontend | `next dev` | `next start` on standalone output |
| Logs | pretty | JSON to stdout |
| Replicas | 1 each | API and worker scaled; scheduler pinned at 1 |

Production runs with:
`docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`

---

## 5. Networking

- One user-defined bridge network. Services address each other by service name
  (`postgres`, `redis`, `backend-api`).
- Only the edge is published: `frontend` and `backend-api` in dev; `nginx` alone
  in production.
- **Postgres and Redis are never published to the host in production.**
- `localhost` inside a container is that container. `DATABASE_HOST=postgres`, not
  `localhost`.

---

## 6. Volumes

- Named volumes for state: `postgres_data`, `redis_data`.
- Bind mounts for source **in development only**.
- `node_modules` is masked with an anonymous volume so the container's install is
  not shadowed by the host's.
- Never bind-mount a host path into a production container.
- Deleting a named volume destroys data — never do it without explicit
  instruction.

---

## 7. Environment Variables

- `.env.example` at the repo root lists every variable with safe placeholders.
  Adding a variable to a compose file means adding it to `.env.example` in the
  same change.
- Compose reads `.env` at the root. `.env` is git-ignored.
- Never hardcode a credential in a compose file or Dockerfile — not even a dev
  one.
- Never use `ARG`/`ENV` for a secret in a Dockerfile; build args are visible in
  image history.
- Each service receives only the variables it needs. The frontend image gets
  `NEXT_PUBLIC_*` only.

---

## 8. Service Dependencies and Health Checks

Every service defines a health check:

| Service | Check |
| --- | --- |
| `postgres` | `pg_isready -U $POSTGRES_USER` |
| `redis` | `redis-cli ping` |
| `backend-api` | `GET /api/v1/health/ready` |
| `backend-worker` | worker-role liveness probe (queue connection + event loop) |
| `frontend` | `GET /api/health` |

Startup order, enforced with `depends_on: condition: service_healthy`:

```text
postgres, redis  →  migrator (runs to completion)  →  backend-api
                                                   →  backend-worker
                                                   →  backend-scheduler
backend-api      →  frontend
```

Migrations run in the one-shot `migrator` service, never in an application
container's entrypoint — otherwise N replicas race to migrate the same database.

`restart: unless-stopped` for long-running services; `restart: "no"` for
`migrator`.

---

## 9. Image Rules

- Multi-stage builds. The runtime stage contains no dev dependencies, no source
  maps for production, no build toolchain.
- Alpine or slim bases, pinned to a major version. Never `:latest`.
- Run as a non-root user in production images.
- `.dockerignore` at each build context excludes `node_modules`, `.env`, `.git`,
  tests, and build output.
- Layer order: package manifests → install → source. Do not invalidate the
  dependency layer on every source change.
- No `docker compose down -v` unless the user explicitly asks — it destroys data.
