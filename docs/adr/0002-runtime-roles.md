# ADR-0002: Runtime Roles Instead of a Separate Worker Application

**Status:** Accepted
**Date:** 2026-09-14

## Context

Check execution must not compete with HTTP requests for the same process: a slow
check would consume a request-handling thread, and a worker crash would take down
the API. The two workloads also scale on different signals — request rate versus
queue depth.

The conventional answer is a separate `apps/worker` application. That is
explicitly ruled out here: the repository has three top-level boundaries
(`Frontend/`, `Backend/`, `Docker/`) and they are permanent. It also has a real
cost — either the worker duplicates domain logic, or a shared library appears and
the "separate app" becomes a deployment detail with extra packaging overhead.

## Decision

One backend codebase, **three runtime roles** selected by `APP_ROLE`, each with its
own entrypoint and composition root:

| Role | Entrypoint | Root module | Registers |
| --- | --- | --- | --- |
| `api` | `src/main.ts` | `AppModule` | controllers, gateway, queue **producers** |
| `worker` | `src/worker.ts` | `WorkerModule` | queue **processors** only |
| `scheduler` | `src/scheduler.ts` | `SchedulerModule` | repeatable job registration |

`AppModule` never imports `WorkersModule`, so the API registers no BullMQ
`Worker`. `WorkerModule` imports domain modules without their controllers, so the
worker serves no HTTP. Both share `infrastructure/` and `config/`.

One Docker image; the entrypoint dispatches on `APP_ROLE`.

## Consequences

**Easy:** domain logic exists once and behaves identically whether triggered by a
request or a job; one image to build, scan, and ship; independent scaling and
failure isolation between API and workers.

**Hard:** the composition roots must be maintained deliberately — importing
`AppModule` from the worker would silently collapse the separation. This is
covered by a boundary check and stated in `Backend/src/workers/CLAUDE.md`.

**Accepted:** the worker image carries the API's dependencies. The size cost is
minor compared to maintaining two packaging pipelines.

## Alternatives Considered

**`apps/worker` in a monorepo.** Rejected: violates the fixed top-level structure,
and forces either duplicated logic or a shared package.

**Workers in the API process.** Rejected: this is the failure mode the whole design
avoids — a slow check must never occupy a request thread.

**A runtime flag inside one module tree.** Rejected: conditionals inside modules
are easy to get wrong and hard to verify. Separate composition roots make the
separation structural.
