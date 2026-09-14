# ADR-0001: Modular Monolith Over Microservices

**Status:** Accepted
**Date:** 2026-09-14

## Context

APIMonitor has clearly separable domains — auth, monitors, checks, incidents,
alerts, notifications, billing — and an execution workload (check processing) with
a very different scaling profile from the API. That combination is the usual
argument for microservices.

Against it: a small team, domains that share a transactional database, and
invariants that span aggregates (the one-open-incident-per-monitor rule spans
monitors and incidents). Distributed transactions or eventual consistency would be
required to preserve those invariants across services.

## Decision

A **modular monolith** in `Backend/`: one deployable codebase, domain modules with
enforced boundaries, one PostgreSQL database.

Boundaries are real, not aspirational:
- a module exports its service; never its repository
- cross-module calls go through exported services or domain events
- `common/` and `infrastructure/` never import from `modules/`
- boundaries are machine-enforced by ESLint rules and `scripts/check-boundaries.ts`

## Consequences

**Easy:** transactional consistency across aggregates; one deploy; local reasoning
and debugging; refactoring a boundary is a compile-time problem, not a versioned
API migration.

**Hard:** one language and runtime for all domains; one database's scaling limits;
no per-domain independent deployment.

**Accepted:** we may need to extract a service later. Because modules already
communicate through explicit service interfaces and events, extraction is a
contained change — replace an injected service with a client — rather than an
excavation.

## Alternatives Considered

**Microservices from day one.** Rejected: the coordination, deployment, and
observability cost is not justified at this size, and the cross-aggregate
invariants would require sagas we do not need.

**Serverless functions.** Rejected: check execution is long-running and
connection-pool-hungry; cold starts and per-invocation pricing are a poor fit for
continuous polling.

**A single unstructured application.** Rejected: this is the default outcome
without enforced boundaries, and it forecloses extraction entirely.
