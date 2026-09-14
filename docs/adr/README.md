# Architecture Decision Records

An ADR records a decision where a competent engineer would reasonably ask "why
not the other thing". It captures the alternatives and the reasoning, so a future
change is a deliberate reversal rather than an accidental drift.

## Rules

- One decision per record, numbered sequentially, never renumbered.
- An accepted ADR is **immutable**. To change a decision, write a new ADR that
  supersedes it and mark the old one `Superseded by ADR-XXXX`.
- Write the ADR *before* implementing, while the alternatives are still live.
- Do not write an ADR for an obvious choice. "We use TypeScript" is not a
  decision anyone will question.

## Format

```markdown
# ADR-XXXX: <Title>

**Status:** Proposed | Accepted | Superseded by ADR-YYYY
**Date:** YYYY-MM-DD

## Context
The forces at play. What makes this a real question.

## Decision
What we are doing.

## Consequences
What this makes easy, what it makes hard, and what we accept.

## Alternatives Considered
Each option and why it lost.
```

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-modular-monolith.md) | Modular monolith over microservices | Accepted |
| [0002](0002-runtime-roles.md) | Runtime roles instead of separate worker app | Accepted |
| [0003](0003-typeorm-over-prisma.md) | TypeORM over Prisma | Accepted |
| [0004](0004-monitor-scheduling-strategy.md) | Repeatable jobs for monitor scheduling | Accepted |
| [0005](0005-token-strategy.md) | Short access JWT + rotating refresh tokens | Accepted |
| [0006](0006-no-shared-package-workspace.md) | No shared package; OpenAPI-generated types | Accepted |
| [0007](0007-monitor-check-storage.md) | Partitioned append-only check storage | Accepted |
| [0008](0008-authorization-model.md) | Membership-derived permissions | Accepted |
| [0009](0009-compose-file-split.md) | Separate dev and prod compose files | Accepted |
