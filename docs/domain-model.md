# Domain Model

Entities, relations, invariants, and lifecycle. Authoritative for naming.

---

## 1. Aggregate Map

```text
Organization
├── Membership ──> User
├── ApiKey
├── Subscription / Plan
├── NotificationChannel
├── AlertRule
├── StatusPage ──> (selected Monitors)
└── Project
    └── Monitor
        ├── MonitorCheck        (high volume, append-only)
        └── Incident
            └── IncidentEvent   (append-only timeline)
                └── Alert ──> NotificationDelivery
```

`Organization` is the tenancy root. Every tenant-scoped row resolves to exactly
one organization, and every such row carries a denormalized indexed
`organization_id` even when it could be reached by a join — that denormalization
is what makes mandatory tenant filtering cheap and uniform.

---

## 2. Entities

### User
Identity only. `email` (citext, unique), `passwordHash`, `emailVerifiedAt`,
`name`, `avatarUrl`, `lastLoginAt`. Not tenant-scoped — a user may belong to
several organizations. Soft-deletable.

A user alone confers no authority. All access flows through `Membership`.

### Organization
`name`, `slug` (unique), `ownerId`, `planId`. Soft-deletable. Deleting an
organization is a background job, not a cascade delete — the check volume makes a
synchronous cascade unusable.

### Membership
`userId`, `organizationId`, `role` (`OWNER` | `ADMIN` | `MEMBER` | `VIEWER`),
`invitedBy`, `acceptedAt`. Unique on `(userId, organizationId)`.

Invariant: every organization has at least one `OWNER`. Removing or demoting the
last owner is rejected with `409`.

### Project
`organizationId`, `name`, `slug` (unique per organization), `description`.
Soft-deletable. A grouping boundary, not a permission boundary — permissions are
organization-scoped with optional project-scoped rules.

### Monitor
`organizationId`, `projectId`, `name`, `type`, `url`, `method`, `headers`
(encrypted), `body`, `intervalSeconds`, `timeoutMs`, `expectedStatusCodes`,
`assertions`, `retryPolicy`, `followRedirects`, `degradedThresholdMs`,
`consecutiveFailureThreshold`, `consecutiveSuccessThreshold`, `isActive`,
`status`, and denormalized `lastCheckAt`, `lastStatus`, `lastLatencyMs`.

Invariants:
- `timeoutMs < intervalSeconds * 1000`
- `organizationId` is immutable
- `isActive` (intent) is distinct from `status` (observed state)
- an active monitor has exactly one repeatable job

### MonitorCheck
`monitorId`, `organizationId`, `checkedAt`, `success`, `statusCode`,
`latencyMs`, `cause`, `errorMessage`, `responseSizeBytes`, `assertionResults`,
`region`.

The volume table. Append-only: no `updatedAt`, no soft delete, no updates ever.
Time-partitioned by `checked_at` (monthly), retention enforced by the maintenance
worker per plan. Response bodies are stored truncated and only when assertions
require them.

### Incident
`monitorId`, `organizationId`, `projectId`, `status` (`OPEN` | `ACKNOWLEDGED` |
`RESOLVED`), `cause`, `severity`, `startedAt`, `acknowledgedAt`,
`acknowledgedBy`, `resolvedAt`, `resolvedBy`, `durationSeconds`,
`failureCount`, `isFlapping`.

**Invariant: at most one incident per monitor with `resolvedAt IS NULL`**,
enforced by `UNIQUE (monitor_id) WHERE resolved_at IS NULL`. Resolved is
terminal; a new failure opens a new incident.

### IncidentEvent
`incidentId`, `type`, `message`, `actorId`, `metadata`, `createdAt`. Append-only
and immutable — a correction is a new entry. `FAILURE_OBSERVED` entries are
throttled so a long outage does not write one row per check.

### AlertRule
`organizationId`, `scope`, `scopeId`, `trigger`, `conditions`, `channelIds`,
`throttleSeconds`, `escalation`, `isActive`. Most-specific scope wins.

### NotificationChannel
`organizationId`, `type` (`EMAIL` | `WEBHOOK` | `SLACK` | ...), `config`
(secrets encrypted), `verifiedAt`, `isActive`. Unverified channels never receive
alerts. Deletion is blocked while an active rule references it.

### Alert
`organizationId`, `ruleId`, `incidentId`, `channelId`, `triggeredAt`,
`dedupKey`, `status`. The record of a decision; delivery is separate.

### NotificationDelivery
`alertId`, `channelId`, `attempt`, `status`, `providerMessageId`, `error`,
`deliveredAt`. Owned by `notifications`.

### StatusPage
`organizationId`, `slug` (globally unique — it is a public URL), `title`,
`description`, `customDomain`, `isPublic`, `password`, `monitorIds`, theme.
The public read model is cached and never queries the dashboard's tables
directly under load.

### ApiKey
`organizationId`, `name`, `publicId`, `secretHash`, `permissions`, `lastUsedAt`,
`expiresAt`, `revokedAt`. Secret shown once at creation.

### RefreshToken
`userId`, `tokenHash`, `familyId`, `expiresAt`, `revokedAt`, `replacedById`,
`userAgent`, `ipAddress`. Rotation with reuse detection: presenting a replaced
token revokes the whole family.

---

## 3. Key Indexes

```sql
-- tenancy (every tenant-scoped table)
CREATE INDEX ON <table> (organization_id);

-- monitors
CREATE UNIQUE INDEX ON monitors (project_id, name) WHERE deleted_at IS NULL;
CREATE INDEX ON monitors (organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ON monitors (is_active, next_check_at) WHERE deleted_at IS NULL;

-- monitor_checks (partitioned by checked_at)
CREATE INDEX ON monitor_checks (monitor_id, checked_at DESC);
CREATE INDEX ON monitor_checks (organization_id, checked_at DESC);

-- incidents
CREATE UNIQUE INDEX ON incidents (monitor_id) WHERE resolved_at IS NULL;  -- THE invariant
CREATE INDEX ON incidents (organization_id, started_at DESC);
CREATE INDEX ON incidents (project_id, started_at DESC);

-- auth
CREATE UNIQUE INDEX ON users (email) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ON memberships (user_id, organization_id);
CREATE INDEX ON refresh_tokens (family_id);
CREATE UNIQUE INDEX ON api_keys (public_id);

-- public status pages
CREATE UNIQUE INDEX ON status_pages (slug);
```

---

## 4. Soft Deletion Policy

Soft-delete: `User`, `Organization`, `Project`, `Monitor`, `StatusPage` — restore
is a real product requirement and history must remain coherent.

Hard-delete or never delete: `MonitorCheck` (retention job removes partitions),
`IncidentEvent` (immutable), `RefreshToken` (revoke, then prune).

Every query on a soft-deletable entity filters `deleted_at IS NULL` unless
explicitly restoring. Unique indexes on soft-deletable tables are partial, so a
deleted row does not block reuse of its name.

---

## 5. State Machines

**Monitor `isActive`:** `CREATED → ACTIVE ⇄ PAUSED → DELETED (soft)`
**Monitor `status`:** `PENDING → UP ⇄ DEGRADED ⇄ DOWN`, with `PAUSED` frozen.
Transitions require the consecutive threshold — never a single check.

**Incident:** `OPEN → ACKNOWLEDGED → RESOLVED`, and `OPEN → RESOLVED`.
`RESOLVED` is terminal.

**Alert:** `PENDING → SENT | SUPPRESSED | FAILED`.

---

## 6. Cross-Entity Invariants

1. At most one open incident per monitor.
2. Every organization has at least one `OWNER`.
3. An active monitor has exactly one repeatable job.
4. A monitor's `organizationId` equals its project's.
5. An alert rule's channels belong to the same organization.
6. A status page references only monitors in its own organization.
7. `timeoutMs < intervalSeconds * 1000`.
8. An unverified channel never receives an alert.

Invariants 1 and 2 are enforced in the database. The rest are enforced in the
service layer with tests proving each.
