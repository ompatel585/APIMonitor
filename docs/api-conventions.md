# API Conventions

All endpoints follow these rules. Deviation requires an ADR.

---

## 1. Versioning and Naming

Prefix `/api/v1/`. Version bumps only for breaking changes; additive changes ship
in the current version.

Plural, kebab-case nouns. Nesting mirrors ownership, at most two levels deep.

```text
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:projectId
PATCH  /api/v1/projects/:projectId
DELETE /api/v1/projects/:projectId

GET    /api/v1/projects/:projectId/monitors
POST   /api/v1/projects/:projectId/monitors
GET    /api/v1/monitors/:monitorId              # flat once the id is globally unique
GET    /api/v1/monitors/:monitorId/checks
GET    /api/v1/monitors/:monitorId/incidents
```

No verbs in paths. Genuine non-CRUD actions use a sub-resource:

```text
POST /api/v1/monitors/:monitorId/actions/pause
POST /api/v1/incidents/:incidentId/actions/acknowledge
```

Organization scope comes from the authenticated context, not the path. A client
never supplies an `organizationId` to select a tenant.

---

## 2. Methods and Status Codes

| Method | Use | Success |
| --- | --- | --- |
| `GET` | read | `200` |
| `POST` | create / action | `201` / `200` |
| `PATCH` | partial update | `200` |
| `PUT` | full replace (rare) | `200` |
| `DELETE` | remove | `204` |

| Code | Meaning |
| --- | --- |
| `400` | malformed request or validation failure |
| `401` | missing or invalid credentials |
| `403` | authenticated but lacking permission **in a tenant the actor belongs to** |
| `404` | not found — **also** returned for another tenant's resource |
| `409` | conflict (duplicate slug, last owner, channel in use) |
| `422` | domain rule violation on a well-formed request |
| `429` | rate limited (`Retry-After` required) |
| `500` | unexpected — never leaks internals |

`404` for cross-tenant access is deliberate. `403` confirms the resource exists.

---

## 3. Response Envelope

Success:
```json
{ "data": { }, "meta": { "requestId": "..." } }
```

Collection:
```json
{
  "data": [],
  "meta": {
    "requestId": "...",
    "pagination": { "nextCursor": "...", "hasMore": true, "limit": 50 }
  }
}
```

Error — one shape for every failure:
```json
{
  "error": {
    "code": "MONITOR_INTERVAL_INVALID",
    "message": "Interval must be one of the supported values.",
    "details": [{ "field": "intervalSeconds", "code": "not_allowed", "message": "..." }]
  },
  "meta": { "requestId": "...", "timestamp": "2026-01-01T00:00:00.000Z" }
}
```

`code` is stable and machine-readable — clients branch on it, never on `message`.
`details` is present only for field-level validation and maps directly onto form
fields. Production responses never include a stack trace, SQL, entity names, or
internal hostnames.

---

## 4. Pagination

**Cursor** for high-volume or real-time collections (checks, incidents, activity):

```text
GET /api/v1/monitors/:id/checks?limit=50&cursor=<opaque>
```

The cursor is opaque, base64-encoded, and encodes the sort tuple
(`checkedAt`, `id`). Clients never construct one. Offset pagination on a growing
table produces duplicates and skips — that is why it is not used here.

**Offset** only for small bounded lists (projects, channels, team members):

```text
GET /api/v1/projects?page=1&limit=20
```

Default `limit` 20, maximum 100. `limit` is validated, never passed through.

---

## 5. Filtering and Sorting

```text
?status=DOWN&projectId=<uuid>&search=api&createdAfter=2026-01-01T00:00:00Z
?sort=-createdAt          # '-' prefix = descending
```

Filterable and sortable fields are an explicit per-endpoint allow-list backed by
an index. Arbitrary client-driven sorting on an unindexed column is a denial of
service, not a feature. Multi-value filters repeat the key
(`?status=DOWN&status=DEGRADED`).

---

## 6. Validation

Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`,
`transform: true`, `transformOptions: { enableImplicitConversion: false }`.

Every request DTO declares every accepted field with class-validator decorators.
Unknown fields are rejected, not ignored — silent acceptance hides client bugs and
is a mass-assignment risk.

UUID params use `ParseUUIDPipe`. Dates are ISO 8601 UTC. Never accept a raw query
object into a repository.

---

## 7. Authentication

- `Authorization: Bearer <access token>` for user sessions.
- `X-API-Key: apim_<publicId>_<secret>` for programmatic access.
- Refresh token in an httpOnly `SameSite=Strict` cookie; it is never sent in a
  body or read by JavaScript.

`401` for missing/invalid/expired credentials, with a distinct `code` for
"expired" so the client refreshes rather than logging the user out.

---

## 8. Authorization

Every endpoint declares its permission:

```ts
@RequirePermission('monitor:create')
```

`@Public()` is the only opt-out and requires a comment explaining why. The guard
answers "may this actor act"; the repository's mandatory tenant filter answers "is
this row reachable". Both always apply.

---

## 9. Idempotency

Mutating endpoints a client may retry accept `Idempotency-Key`. The key, request
hash, and response are cached in Redis for 24 hours. A replay with the same key
returns the original response; a different body with the same key returns `409`.

Required on: monitor creation, incident acknowledgement, notification channel
creation, and every billing mutation.

---

## 10. Rate Limiting

Applied per IP and per identity. Headers on every limited endpoint:
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, plus
`Retry-After` on `429`.

Tighter limits on authentication, password reset, and public status pages.
Limits are backed by Redis so they hold across replicas.

---

## 11. Documentation

Every endpoint carries `@ApiOperation`, `@ApiResponse` for success **and**
documented failures, and `@ApiTags`. Every DTO property carries `@ApiProperty`
with a description and an example. An undocumented endpoint is incomplete.

Swagger UI is served outside production only. The OpenAPI JSON is always
generated — it is the source for `Frontend/types/api/generated.ts` via
`scripts/generate-api-types.ts`.

---

## 12. Public Endpoints

The public status page API (`/api/v1/public/status/:slug`) is unauthenticated and
therefore:
- exposes a **separate, minimal read model** — never the dashboard DTOs
- never returns internal ids, URLs, headers, or org/project names not explicitly
  published
- is aggressively cached and rate limited per IP and per slug
- is served from pre-computed data, never a live aggregation over checks

Treat every field added here as a deliberate publication decision.
