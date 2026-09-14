# Auth Module — Security Kernel

Scope: `Backend/src/modules/auth/`. Read `Backend/src/modules/CLAUDE.md` first.

This module is the security kernel. A mistake here compromises every tenant. No
other module implements authentication or authorization logic — they consume the
guards, decorators, and policies defined here.

---

## 1. Responsibilities

**Authentication** — registration, login, logout, email verification, password
reset, access/refresh token issuance and rotation, revocation, API key
verification.

**Authorization** — the permission catalogue, role definitions, policy
evaluation, guards, and decorators used by every other module.

Not owned here: the user profile (`users`), the organization and membership rows
(`organizations`), the API key resource lifecycle (`api-keys` — this module only
*verifies* them).

---

## 2. Structure

```text
auth/
├── auth.module.ts
├── controllers/          auth.controller.ts, password.controller.ts
├── services/             auth.service.ts, token.service.ts, password.service.ts,
│                         session.service.ts, permission.service.ts
├── strategies/           jwt.strategy.ts, jwt-refresh.strategy.ts, local.strategy.ts, api-key.strategy.ts
├── guards/               jwt-auth.guard.ts, refresh.guard.ts, api-key.guard.ts, policies.guard.ts
├── decorators/           current-user.decorator.ts, public.decorator.ts,
│                         require-permission.decorator.ts, current-org.decorator.ts
├── policies/             Policy handlers per resource type
├── entities/             RefreshToken, PasswordResetToken, EmailVerificationToken
├── dto/{requests,responses}/
├── constants/            permissions.ts (the catalogue), roles.ts
├── types/
└── tests/
```

---

## 3. Passwords

- **Argon2id** only. Never bcrypt, never a raw hash function. Parameters live in
  `auth.config.ts`.
- Hashing and verification happen only in `password.service.ts`.
- Comparison is constant-time (the Argon2 verify function). Never `===`.
- Minimum length 12, checked against a breached-password list. No composition
  rules that push users toward weak predictable passwords.
- A password is never logged, never returned, never stored in plaintext anywhere
  including a queue payload or a cache.
- Changing a password revokes all refresh-token families for that user.

---

## 4. Tokens

### Access token (JWT)
Short-lived (~15 min). Claims: `sub` (userId), `sid` (session id), `jti`, `iat`,
`exp`. **No permissions are embedded** — permissions are resolved per request
from the membership so a role change takes effect immediately rather than at the
next token refresh. Signed with a dedicated secret/key, never the refresh secret.

### Refresh token
Long-lived (~30 days), opaque random value. **Stored hashed** in the
`refresh_tokens` table with `userId`, `familyId`, `expiresAt`, `revokedAt`,
`replacedById`, and device metadata.

Rotation: every refresh issues a new token and marks the old one replaced.
**Reuse detection:** presenting an already-replaced token means the token leaked
— revoke the entire family immediately and force re-authentication.

Delivery: refresh token in an `httpOnly`, `Secure`, `SameSite=Strict` cookie.
Never in `localStorage`.

### Revocation
Logout, password change, and forced logout add the session id to a Redis denylist
with a TTL equal to the access token lifetime. `JwtAuthGuard` checks the denylist
so revocation is effective immediately rather than after expiry.

### Single-use tokens
Password reset and email verification tokens are random, hashed at rest,
single-use, short-expiry, and invalidated on use. Password reset **always**
returns the same success response whether or not the email exists — no user
enumeration. Both endpoints are rate limited per IP and per identifier.

### API keys
Format `apim_<publicId>_<secret>`. Only a hash of the secret is stored. Lookup is
by `publicId`, then constant-time verification of the secret. Keys are scoped to
an organization and carry an explicit permission set — never full access by
default. Shown to the user exactly once at creation.

---

## 5. Guards — Fail Closed

`JwtAuthGuard` is registered **globally**. An endpoint without an explicit
`@Public()` requires authentication. Forgetting a decorator therefore fails
closed, which is the point.

```ts
@Public()                              // no authentication
@RequirePermission('monitor:create')   // permission required
@UseGuards(ApiKeyGuard)                // programmatic access instead of a session
```

`PoliciesGuard` runs after `JwtAuthGuard`, resolves the actor's membership in the
target organization, loads their permissions, and evaluates the declared policy.

`@CurrentUser()` yields the authenticated actor. Never read the user off the raw
request object in a controller or service.

---

## 6. The Authorization Model

```text
User ──< Membership >── Organization
              │
              └── Role ──< Permission
```

- A `User` is a person. A `User` alone grants nothing.
- A `Membership` is a `User`'s role in one `Organization`. **All authority flows
  from membership.**
- `Role` is one of `OWNER`, `ADMIN`, `MEMBER`, `VIEWER` (system roles;
  custom roles are a later extension the model already allows).
- `Permission` is `<resource>:<action>` — `monitor:create`, `incident:resolve`,
  `billing:manage`. The catalogue is exhaustive and lives in
  `constants/permissions.ts`. A permission that is not in the catalogue does not
  exist.

### Two independent layers — both are mandatory

1. **Guard layer** — "may this actor perform this action?" Declared with
   `@RequirePermission`, evaluated by `PoliciesGuard`.
2. **Repository layer** — "is this row reachable by this tenant?" Every
   repository method filters on `organizationId`.

Layer 2 is what actually prevents IDOR. Layer 1 alone is insufficient: an actor
with `monitor:read` in org A must not read a monitor in org B, and only the
tenant-scoped query guarantees that.

### Forbidden

```ts
if (user.id === monitor.userId) { ... }        // never
if (user.role === 'ADMIN') { ... }             // never inline; use a permission
monitorRepo.findOne({ where: { id } })         // never unscoped
```

Resource ownership is resolved by fetching through the tenant-scoped repository.
If the row is not found for this organization, the answer is **404** — never 403,
which would confirm the resource exists.

---

## 7. WebSocket Authorization

Socket connections authenticate with the same JWT verification at handshake.
Joining a room is authorized with the same permission check as the equivalent
REST read. A client may never subscribe to `org:{id}` for an organization it is
not a member of. WebSocket authorization is not a separate, weaker path.

---

## 8. Rate Limiting

Applied at minimum to: login, register, password reset request, password reset
confirm, email verification resend, refresh, and API key authentication. Limits
are per IP **and** per identifier. Backed by Redis so limits hold across
replicas. Failed logins additionally trigger progressive delay and account
lockout after a threshold.

---

## 9. Auditing

These events are recorded with actor, organization, IP, user agent, and
correlation id: login success, login failure, logout, password change, password
reset completion, email verification, refresh reuse detection, role change,
membership change, API key creation, API key revocation.

Audit records never contain credentials.

---

## 10. Forbidden in this module

- embedding permissions in the access token
- storing a refresh token, reset token, or API key secret in plaintext
- returning a different response for "email not found" on password reset
- a permission check written inline instead of declared
- another module implementing its own auth check
- logging a token, a password, or a full auth request body
- `JwtAuthGuard` being applied per-controller instead of globally
- an endpoint marked `@Public()` without a comment explaining why
- trusting any client-supplied `organizationId` without verifying membership
