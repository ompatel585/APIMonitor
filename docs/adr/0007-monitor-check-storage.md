# ADR-0007: Partitioned Append-Only Check Storage

**Status:** Accepted
**Date:** 2026-09-14

## Context

`monitor_checks` is the volume table. At 100,000 monitors on a 60-second
interval it receives roughly **144 million rows per day**. It dominates every
storage and query decision in the system.

Two distinct access patterns: recent detail (the last N checks for one monitor)
and historical aggregates (uptime and p95 latency over 30 days). They have
nothing in common — serving both from one live query shape will fail at one of
them.

## Decision

**PostgreSQL, append-only, partitioned by time, with pre-aggregated rollups.**

1. **Append-only.** No `updated_at`, no soft delete, no `UPDATE` ever. A check is
   a fact about a moment.
2. **Range partitioning** on `checked_at`, monthly. Retention drops partitions
   rather than issuing `DELETE` — dropping is instant and produces no bloat.
3. **Denormalized current state on `monitors`** (`lastStatus`, `lastCheckAt`,
   `lastLatencyMs`), updated on ingestion. List views never touch the check table.
4. **Rollup tables** (`analytics`, hourly and daily) built by a worker. Charts and
   uptime percentages read rollups, never the raw series.
5. Truncated response bodies, stored only when assertions require them.
6. Per-plan retention enforced by the maintenance worker.

Stay on PostgreSQL rather than adding a time-series database: one operational
system, transactional consistency with the rest of the domain, and partitioning
plus rollups covers the requirement.

## Consequences

**Easy:** retention is a partition drop; list views are fast regardless of history;
aggregates are pre-computed; one database to operate and back up.

**Hard:** partition management needs automation (creating next month's partition
is a scheduled job, and a missed one means failed inserts); rollups add an
ingestion-to-visibility lag of minutes for aggregate views; raw-series queries
beyond the retention window are simply unavailable.

**Accepted:** aggregate views are eventually consistent by a few minutes. Current
status is not — it updates on the monitor row immediately.

**Revisit if** raw-series query patterns outgrow partitioning, at which point
TimescaleDB (still Postgres, so a contained migration) or ClickHouse for
analytics-only becomes worth the second system.

## Alternatives Considered

**A single unpartitioned table.** Rejected: `DELETE`-based retention on a table
this size produces unusable bloat and vacuum pressure.

**TimescaleDB now.** Genuinely well-suited, but adds an extension dependency
before we have measured that plain partitioning is insufficient. The migration
path stays open precisely because we stayed on Postgres.

**ClickHouse / InfluxDB.** Rejected for now: a second datastore, a second
operational burden, and no transactional consistency with the domain — for a
problem partitioning plus rollups already solves at the planned scale.

**Aggregating live with the intent to optimize later.** Rejected explicitly. This
is the decision that is impossible to reverse cheaply once dashboards depend on
it.
