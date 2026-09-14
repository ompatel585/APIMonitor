# ADR-0005: Short Access JWT + Rotating Refresh Tokens

**Status:** Accepted
**Date:** 2026-09-14

## Context

Stateless JWTs scale well but cannot be revoked before expiry. For a product that
manages other people's infrastructure credentials, "logout does not take effect
for 24 hours" is not acceptable. Neither is a database read on every request,
which is what fully stateful sessions cost.

A second question: should permissions be embedded in the access token? Embedding
avoids a lookup, but means a revoked role stays effective until the token expires.

## Decision

**Two tokens with different properties.**

*Access token* — JWT, ~15 minutes, `sub`, `sid`, `jti`, `iat`, `exp`.
**No permissions embedded.** Sent as `Authorization: Bearer`.

*Refresh token* — opaque random value, ~30 days, stored **hashed** with
`familyId`, `expiresAt`, `revokedAt`, `replacedById`, and device metadata.
Delivered in an httpOnly, Secure, SameSite=Strict cookie.

**Rotation with reuse detection.** Every refresh issues a new token and marks the
old one replaced. Presenting an already-replaced token means the token leaked:
revoke the entire family immediately.

**Revocation** via a Redis session denylist keyed on `sid`, with a TTL equal to
the access token lifetime. The auth guard checks it, so logout and password change
take effect within seconds, not at expiry.

**Permissions resolved per request** from the actor's membership.

## Consequences

**Easy:** a short revocation window without a database read per request; leaked
refresh tokens are detected rather than merely expiring; a role change takes
effect immediately.

**Hard:** a Redis denylist lookup on every authenticated request (cheap, and Redis
is already a hard dependency); permission resolution per request (cached per
request, and correctness is worth the cost); clients must handle 401-then-refresh.

**Accepted:** a revoked session may survive for up to the access token lifetime if
Redis is unavailable. We fail closed on denylist errors rather than fail open.

## Alternatives Considered

**Long-lived JWT only.** Rejected: no revocation. Disqualifying for this product.

**Fully stateful sessions.** Rejected: a database read per request, and the
stateless property is genuinely useful for the worker and API split.

**Permissions embedded in the access token.** Rejected: a removed team member
would keep their permissions until the token expired — exactly the window that
matters most.

**Refresh token in `localStorage`.** Rejected: readable by any XSS. httpOnly
cookies remove that class of theft.
