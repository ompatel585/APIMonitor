# ADR-0008: Membership-Derived Permissions with Mandatory Tenant Scoping

**Status:** Accepted
**Date:** 2026-09-14

## Context

The default way authorization decays is familiar:

```ts
if (user.id === monitor.userId) { ... }
if (user.role === 'ADMIN') { ... }
```

These checks spread, diverge, and are eventually forgotten on one new endpoint —
which is all an attacker needs. IDOR is consistently among the most common and
most damaging vulnerability classes in multi-tenant SaaS.

Two things must be true at once: a coherent permission model that supports teams
and roles, and a structural guarantee that one tenant's data is unreachable from
another even when a developer forgets something.

## Decision

```text
User ──< Membership >── Organization
              └── Role ──< Permission
```

A `User` alone grants nothing. **All authority flows from `Membership`.**
Permissions are `<resource>:<action>` from an exhaustive catalogue. Roles
(`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) are named permission sets; custom roles are
a later extension the model already accommodates.

**Two independent, both-mandatory layers:**

1. **Guard layer** — `@RequirePermission('monitor:create')`, evaluated by
   `PoliciesGuard`, which resolves the actor's membership in the target
   organization. Answers *may this actor perform this action*.
2. **Repository layer** — every method that reads or writes tenant data takes an
   `organizationId` and filters on it. Answers *is this row even reachable*.

Layer 2 is the real defense. Layer 1 can be forgotten on a new endpoint; a
repository whose methods cannot express an unscoped query cannot leak.

`JwtAuthGuard` is registered globally, so a missing decorator fails closed.
Cross-tenant access returns **404** — `403` would confirm the resource exists.
WebSocket room joins run the same permission check as the equivalent REST read.

## Consequences

**Easy:** authorization is declarative and greppable; adding a role is a
catalogue change, not a code sweep; a forgotten guard still cannot cross tenants;
permission changes take effect immediately (ADR-0005).

**Hard:** every repository method carries an extra parameter, which is verbose and
occasionally feels redundant. That verbosity is the point — it makes the unsafe
version visibly wrong in review.

**Accepted:** permission resolution costs a lookup per request (cached per
request). Correctness over microseconds.

## Alternatives Considered

**Inline ownership checks.** Rejected: the exact failure mode described above.

**Permissions in the JWT.** Rejected: see ADR-0005 — revocation latency on the
one change that matters most.

**Row-level security in PostgreSQL.** Genuinely strong, and a plausible future
addition. Rejected as the primary mechanism now: it requires per-request session
variables, interacts awkwardly with connection pooling, and makes debugging
harder. Repository-level scoping gives most of the guarantee with far less
operational complexity.

**A full policy engine (Casbin, OPA).** Rejected: more machinery than a
four-role, ~40-permission model needs. The catalogue approach can grow into one if
custom roles arrive.
