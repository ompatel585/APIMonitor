# ADR-0009: Separate Development and Production Compose Files

**Status:** Accepted
**Date:** 2026-09-14

## Context

Development and production want genuinely opposite things from the same service
definitions:

| | Development | Production |
| --- | --- | --- |
| Source | bind-mounted, hot reload | baked into the image |
| Database ports | published to the host | never exposed |
| Secrets | a local `.env` | an orchestrator secret store |
| Replicas | one of each | API and worker scaled |
| Logs | pretty-printed | JSON |

Expressing both in one file means environment conditionals, and a conditional
that is wrong in the production branch is discovered in production.

## Decision

**Three files, layered by Compose's own merge semantics.**

```text
docker-compose.yml            Base: service definitions, networks, volumes, dependencies
docker-compose.override.yml   Development — applied AUTOMATICALLY by `docker compose up`
docker-compose.prod.yml       Production — applied EXPLICITLY
```

```bash
docker compose up -d                                              # dev
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d   # prod
```

The default invocation is the safe one. Production requires deliberately naming
its file — you cannot reach production configuration by accident, and you cannot
accidentally ship dev's bind mounts and exposed database ports.

Supporting decisions:
- Migrations run in a one-shot `migrator` service, never in an application
  entrypoint — otherwise N replicas race to migrate the same database.
- `backend-scheduler` is pinned to exactly one replica in both files (ADR-0004).
- Health checks gate startup order:
  `postgres,redis → migrator → api/worker/scheduler → frontend`.

## Consequences

**Easy:** `docker compose up` just works for a new developer with no flags; the
production file is explicit and reviewable on its own; no environment
conditionals inside service definitions.

**Hard:** a change to a shared property must be checked against both overlay
files; three files to read to know a production service's final shape.

**Accepted:** Compose is the orchestrator for local development and small
deployments. If this moves to Kubernetes, the prod file is replaced by manifests
and the base plus override remains for local work — the split is what makes that
substitution clean.

## Alternatives Considered

**One file with profiles and env interpolation.** Rejected: conditionals in a
config file are hard to review, and the failure mode is a dev setting reaching
production silently.

**Entirely separate, duplicated files.** Rejected: the shared parts drift, and the
drift is discovered when production behaves differently for a reason nobody can
find.

**Compose for dev only, Kubernetes for production now.** Rejected as premature —
but the split above is what makes that migration straightforward when it is
warranted.
