# ADR-0003: TypeORM Over Prisma

**Status:** Accepted
**Date:** 2026-09-14

## Context

An earlier structure draft for this project used Prisma. The requirements
specify TypeORM. Both are viable; the decision needs recording because the
earlier draft exists in the repository and would otherwise look like drift.

The workload has two shapes: ordinary CRUD, and a high-volume append-only table
(`monitor_checks`) that needs partitioning, custom indexes, and careful migration
control.

## Decision

**TypeORM**, with `synchronize: false` in every environment and migrations as the
only schema mechanism.

Supporting reasons beyond the requirement:
- First-class NestJS integration; the repository pattern the layering already
  mandates maps directly onto TypeORM repositories.
- Migrations are plain TypeScript, so table partitioning, `CREATE INDEX
  CONCURRENTLY`, and multi-step backfills are expressible without escaping the
  tool.
- Entities as decorated classes fit Nest's DI and `class-transformer` conventions.

## Consequences

**Easy:** Nest integration, full control over migrations and raw SQL where needed,
partitioning and custom index strategies.

**Hard:** weaker type inference than Prisma on query results; easier to write an
N+1 or an accidentally unscoped query. Mitigated by confining all query
construction to repositories, where the tenant filter is mandatory and reviewable
in one place.

**Accepted:** the previous Prisma-based draft in
`Backend/APIMonitor structure Backend.txt` is superseded and should be deleted at
Phase 0.

## Alternatives Considered

**Prisma.** Strong type inference and a good migration story, but its generated
client resists the repository abstraction this architecture depends on, and
partitioning plus advanced index work would require escape hatches anyway.

**Kysely / raw SQL.** Best control and performance, but hand-rolling entity
mapping and migrations is work that does not differentiate this product.

**Drizzle.** Attractive, but a smaller Nest ecosystem and less operational track
record at the check volume planned here.
