# Security

Threat model and the controls that answer it.

---

## 1. Top Threats

| # | Threat | Primary control |
| --- | --- | --- |
| 1 | **Cross-tenant data access (IDOR)** | Mandatory `organizationId` filtering in every repository method |
| 2 | **SSRF via monitor URLs** | Hardened outbound client; user-supplied URLs are the product |
| 3 | Credential compromise | Argon2id, rotating refresh tokens with reuse detection, immediate revocation |
| 4 | Privilege escalation | Membership-derived permissions resolved per request, never from a token claim |
| 5 | Secret exposure | Server-only boundaries, logger redaction, encrypted secrets at rest |
| 6 | Alert/notification abuse | Channel verification, webhook signing, rate limits |
| 7 | Public status page leakage | Separate minimal read model, explicit publication decisions |
| 8 | DoS via expensive queries | Allow-listed filters/sorts, cursor pagination, rate limits |

Threats 1 and 2 are structural to this product. Everything else is standard SaaS
hygiene.

---

## 2. Multi-Tenancy

Enforced in **two independent layers**, both mandatory:

1. **Guard layer** — `@RequirePermission` + `PoliciesGuard` resolve the actor's
   membership and permissions for the target organization.
2. **Repository layer** — every method that reads or writes tenant data takes an
   `organizationId` and filters on it.

Layer 2 is the real defense. A guard can be forgotten on a new endpoint; a
repository whose methods cannot express an unscoped query cannot leak.

```ts
// forbidden
findOne(id: string) { return this.repo.findOne({ where: { id } }); }

// required
findOne(id: string, organizationId: string) {
  return this.repo.findOne({ where: { id, organizationId, deletedAt: IsNull() } });
}
```

Cross-tenant access returns **404**. `403` would confirm the resource exists.

Every module ships a test proving a foreign tenant receives 404 on read, update,
and delete. That test is not optional.

---

## 3. SSRF — The Product-Specific Risk

The product fetches URLs its users supply. Naive implementation means any
customer can read the cloud metadata endpoint or scan the internal network.

`infrastructure/http/safe-http.client.ts` is the only permitted path for monitor
execution and enforces:

- **Scheme allow-list**: `http`, `https` only. No `file:`, `gopher:`, `ftp:`.
- **Post-DNS address validation**: resolve first, then reject loopback
  (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16` — this is the cloud
  metadata endpoint — and `fe80::/10`), private ranges (`10/8`, `172.16/12`,
  `192.168/16`), unique-local IPv6, and `0.0.0.0`.
- **Re-validation after every redirect.** A `302` to `127.0.0.1` is the classic
  bypass. Validating only the initial URL is not protection.
- Hard redirect cap.
- Connect and total timeouts.
- Streaming response size cap with abort.
- No proxy or credential forwarding.
- No DNS rebinding window: pin the validated address for the connection.

Validation happens at **write time and at execution time**. Both are required —
DNS can change in between.

Never call raw `axios`/`fetch` for monitor execution. That rule appears in four
CLAUDE.md files because it is the single most likely way to reintroduce this.

---

## 4. Authentication Controls

- **Argon2id** password hashing. Minimum length 12, breached-password check, no
  composition rules that push users toward predictable passwords.
- **Access JWT** ~15 min, identity claims only, **no permissions embedded** — so a
  revoked role takes effect on the next request, not the next refresh.
- **Refresh token** opaque, stored hashed, rotated on use, family-revoked on
  reuse detection, delivered httpOnly/Secure/SameSite=Strict.
- **Revocation** via a Redis session denylist checked by the auth guard, so logout
  and password change are immediate.
- **Single-use tokens** for reset and verification: random, hashed at rest,
  short-expiry, invalidated on use.
- **No user enumeration**: password reset, registration, and login return uniform
  responses and timing.
- **API keys**: `apim_<publicId>_<secret>`, hashed at rest, org-scoped, explicitly
  permissioned, shown once, revocable, with `lastUsedAt` tracking.
- **Rate limits and lockout** on login, reset, verification resend, and refresh.

---

## 5. Authorization Controls

Permissions derive from `Membership`, never from `User`, never from a token
claim, never from an inline comparison.

```ts
// forbidden anywhere in the codebase
if (user.id === monitor.userId) { ... }
if (user.role === 'ADMIN') { ... }
```

Permissions are `<resource>:<action>` from an exhaustive catalogue. A permission
not in the catalogue does not exist. WebSocket room joins run the same check as
the equivalent REST read — real-time is not a weaker path.

---

## 6. Secrets

| Secret | Handling |
| --- | --- |
| Passwords | Argon2id, never logged, never returned |
| Refresh tokens | hashed at rest, httpOnly cookie |
| API key secrets | hashed at rest, shown once |
| Monitor auth headers | encrypted at rest, never returned, never in a job payload |
| Channel credentials | encrypted at rest, never returned |
| Webhook signing secrets | encrypted at rest; outbound webhooks are HMAC-signed with a timestamp |
| DB/Redis credentials | env only, never logged |

Never in a `NEXT_PUBLIC_*` variable, a client bundle, a job payload, a log line,
an error message, a URL query string, or a git commit.

Logger redaction is configured once in `infrastructure/logger/redaction.ts`, not
left to call sites.

---

## 7. Input and Output

- Global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted` — unknown
  fields are rejected, closing mass-assignment.
- All SQL parameterized; string interpolation into SQL is forbidden.
- Output encoding and React's default escaping handle XSS;
  `dangerouslySetInnerHTML` requires sanitization and a review comment.
- Status page custom content is sanitized server-side — it is attacker-controlled
  content rendered on a public page.
- CSRF: the refresh cookie is `SameSite=Strict`; state-changing requests use the
  bearer token, not ambient cookie authority.

---

## 8. Transport and Headers

TLS everywhere in production, terminated at nginx. HSTS, CSP, `X-Content-Type-
Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`X-Frame-Options` except where status page embedding is explicitly supported.
CORS is an explicit origin allow-list — never `*` with credentials.

---

## 9. Auditing

Recorded with actor, organization, IP, user agent, and correlation id: login
success/failure, logout, password change, reset completion, email verification,
refresh reuse detection, role and membership changes, API key create/revoke,
monitor create/update/delete, channel changes, billing changes.

Audit records never contain credentials. They are append-only.

---

## 10. Review Checklist

For any change touching data access, auth, or user input:

- [ ] Every new repository method takes and filters on `organizationId`
- [ ] Every new endpoint declares a permission or a justified `@Public()`
- [ ] Cross-tenant access returns 404, not 403
- [ ] A cross-tenant denial test exists
- [ ] No inline ownership comparison
- [ ] Outbound requests to user-supplied URLs go through the safe client
- [ ] No secret in a log, response, job payload, or client bundle
- [ ] New env vars are validated at startup and added to `.env.example`
- [ ] New filterable/sortable fields are allow-listed and indexed
- [ ] Migrations do not lock a large table
- [ ] New public status page fields are a deliberate publication decision
