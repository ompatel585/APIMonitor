# ADR-0006: No Shared Package Workspace; OpenAPI-Generated Types

**Status:** Accepted
**Date:** 2026-09-14

## Context

The frontend needs types matching the backend's API. The usual monorepo answer is
`packages/shared-types`, imported by both.

Two problems. First, the repository has three permanent top-level boundaries;
`packages/` would add a fourth. Second — and more important — a shared package is a
standing invitation to leak. It starts as types, then someone adds a validation
helper, then a constant that is really a business rule, and eventually a type
imported from a TypeORM entity. At that point the frontend depends on the
backend's persistence model.

## Decision

**No `packages/` workspace.** The contract is the **OpenAPI document the backend
already produces**.

```text
Backend Swagger decorators
   → OpenAPI JSON (generated at build)
   → scripts/generate-api-types.ts
   → Frontend/types/api/generated.ts   (committed, never hand-edited)
```

Frontend features re-export from the generated file; they never hand-write a
parallel interface.

## Consequences

**Easy:** the backend is unambiguously the single source of truth; types cannot
drift from the documented API, because they are derived from it; no shared-package
tooling, versioning, or build ordering; entities structurally cannot reach the
frontend.

**Hard:** a generation step must run after any contract change (a CI check fails
if the committed file is stale); Swagger decorators become load-bearing, not
optional documentation — which is a feature, since it forces the API to stay
documented.

**Accepted:** only the API contract is shared. Genuinely universal constants would
be duplicated — and at the observed scale that is a handful of values, which is
cheaper than a package that erodes the boundary.

**Revisit if** a third consumer appears (a CLI, a mobile app, a public SDK). At
that point a generated *client* package — still generated from OpenAPI, never
hand-written — becomes worth the tooling.

## Alternatives Considered

**`packages/shared-types` with hand-written types.** Rejected: drifts from reality
silently, and leaks by gravity.

**tRPC.** Genuinely excellent end-to-end type safety, but it couples the frontend
to the backend's TypeScript at build time and works against a public documented
REST API, which this product needs for its API-key consumers.

**No generation; hand-written frontend types.** Rejected: guaranteed drift, and
the drift is discovered at runtime by users.
