# monitor-checks — Check History

Scope: `Backend/src/modules/monitor-checks/`. Read `Backend/CLAUDE.md` and
`Backend/src/workers/CLAUDE.md` first.

Owns the append-only, high-volume ledger of individual monitor check results,
and applies the resulting status transition to the owning `Monitor`.

```text
monitor-checks/
├── entities/monitor-check.entity.ts        no updatedAt, no soft delete — see root CLAUDE.md §7
├── repositories/monitor-checks.repository.ts
├── services/monitor-checks.service.ts       record() — the single write path
├── services/monitor-checks-retention.service.ts
├── events/monitor-check-completed.event.ts
└── monitor-checks.module.ts
```

## Rules

- `MonitorChecksService.record()` is the **only** way a check result is
  persisted. It runs inside one transaction: insert the check row, evaluate
  the next status via `monitors`' pure `evaluate()`, apply it through
  `MonitorsService.applyCheckResult` — never through `MonitorsRepository`
  directly (a service never touches another module's repository, root
  CLAUDE.md §3). The `monitor.check_completed` event is emitted only after
  the transaction commits.
- This module never enqueues a job and never calls `SafeHttpClient` — that is
  `workers/monitor-check/`'s job. This module is pure persistence + status
  application + eventing.
- Retention (`MonitorChecksRetentionService.purgeExpired()`) is driven by a
  `@Cron` job that lives in the **scheduler** process only (see
  `src/scheduler/`) — never registered from the API or worker role, to avoid
  duplicate deletes from multiple replicas.
- No endpoint reads `monitor_checks` yet — that is deferred to the analytics
  phase (`docs/implementation-phases.md` Phase 9), which reads pre-aggregated
  rollups, never this raw table, from the API.
