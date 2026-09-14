# Testing Strategy

Tests exist to let us change the system confidently. A test that breaks on a
refactor without a behavior change is a liability, not an asset.

**Test files are never committed to this repository.** The workflow is
write → run locally → confirm it passes → delete the test file → then stage
and push. No `*.spec.ts`, `*.e2e-spec.ts`, `*.int-spec.ts`, Vitest spec, or
Playwright spec, and no `tests/`/`test/`/`e2e/` directory content, is ever
pushed to GitHub. Everything below describes how tests are written and run
locally during development — not what ends up in the pushed tree.

---

## 1. Layers

### Backend

| Type | Location | Tool | Scope |
| --- | --- | --- | --- |
| Unit | `src/modules/<domain>/tests/` | Jest | Services, mappers, validators, pure evaluators. Dependencies mocked. |
| Integration | `test/integration/` | Jest + Testcontainers | Repositories, migrations, processors against real Postgres/Redis. |
| E2E | `test/e2e/` | Jest + Supertest | Full HTTP through the real app, real DB, mocked external providers. |

### Frontend

| Type | Location | Tool | Scope |
| --- | --- | --- | --- |
| Unit | beside source | Vitest | Utils, pure hooks, schemas. |
| Component | beside component | Vitest + Testing Library | Rendering, interaction, states. |
| Integration | beside feature | Vitest + MSW | A feature's hooks + components against a mocked API. |
| E2E | `Frontend/e2e/` | Playwright | Critical journeys against a running stack. |

### Workers

Processor logic is unit tested with mocked services; the queue path is integration
tested with a real Redis; the full pipeline (schedule → check → incident → alert)
gets one integration test against a **local HTTP fixture server**.

---

## 2. What Must Be Tested

**Always:**
- Every authorization path — including a test proving a foreign tenant gets 404
  on read, update, and delete. Non-negotiable, every module.
- Pure evaluators: monitor status thresholds, alert rule conditions, check result
  classification. These are where the product's correctness lives.
- Incident state machine transitions, including the one-open-incident invariant
  under concurrency.
- Idempotency: every processor tested by running the same job twice and asserting
  a single effect.
- Every migration: applies, rolls back, and preserves data.
- Validation rules on every DTO.

**Usually not:**
- Presentational components with no logic
- Thin controllers with no branching (covered by E2E)
- Framework behavior
- Getters, mappers with no transformation

Coverage is a signal, not a target. An untested authorization path blocks a merge
regardless of the percentage.

---

## 3. Rules

- **No shared test database.** Integration tests use disposable Testcontainers
  instances. A test that requires the dev database to be in a particular state is
  broken.
- **No public network.** Monitor execution tests hit a local fixture server that
  can simulate slow responses, timeouts, TLS errors, redirects, and large bodies.
  A test that depends on `example.com` is flaky by construction.
- **No shared mutable state between tests.** Each test seeds what it needs through
  factories in `test/fixtures/` and cleans up.
- **Deterministic time.** Anything involving intervals, thresholds, or expiry uses
  a controlled clock. Never `setTimeout` to wait for something.
- **Test behavior, not implementation.** Frontend tests query by role and label,
  not class names. Backend tests assert outcomes, not that a mock was called.
- **Mock at the boundary.** MSW for the frontend's network layer; real
  implementations inside the boundary. Do not mock your own hook to test a
  component that uses it.
- **One reason to fail.** A test asserting six unrelated things tells you nothing
  when it breaks.

---

## 4. Fixtures

`Backend/test/fixtures/` provides factories that build a valid graph by default
and accept overrides:

```ts
const { organization, user, project, monitor } = await seedMonitorContext({
  monitor: { intervalSeconds: 60 },
});
```

Factories always produce tenant-consistent data. Hand-built entity literals drift
and hide invariant violations.

---

## 5. E2E Journeys

Playwright covers what a broken deploy would most obviously break:

1. Register → verify email → login
2. Create project → create monitor → see it appear with `PENDING`
3. Monitor goes down → incident appears → acknowledge → resolve
4. Configure a notification channel → verify it
5. Create and view a public status page (unauthenticated)
6. Login, logout, token refresh continuity

Run against the docker-compose stack with seeded data, in CI on every PR.

---

## 6. CI

On every pull request, in order:

```text
typecheck  →  lint  →  boundary check  →  build
```

There is no CI test-run step. Test files are deleted locally before every
push (see the top of this document), so no spec files exist in the pushed
tree for CI to execute. All test verification happens on the developer's
machine, once, before the push — not in CI, not from the remote repo.

`scripts/check-boundaries.ts` enforces the dependency rules from the root
`CLAUDE.md`. A boundary violation fails the build like a type error — the
architecture is machine-enforced, not merely documented.
