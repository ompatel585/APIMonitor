# Monitors Feature (Frontend)

Scope: `Frontend/features/monitors/`. Read `Frontend/features/CLAUDE.md` first.

The most complex frontend domain: high-frequency data, real-time updates, a
large configuration form, and charts over high-volume series.

---

## 1. Boundaries

Owns: monitor list and detail UI, the create/edit form and its schema, status
presentation, monitor-scoped query hooks, and the monitor real-time
subscription.

Does not own: check result tables and latency charts (`monitor-checks`), incident
UI (`incidents`), alert rule UI (`alerts`), or the generic chart primitives
(`shared/charts`).

Exports for other features (via `index.ts`): `MonitorStatusBadge`,
`MonitorSelect`, `useMonitor`, `useMonitorList`, and the `Monitor`/`MonitorStatus`
types. Everything else stays internal.

---

## 2. Status Presentation — One Source of Truth

`PENDING` · `UP` · `DEGRADED` · `DOWN` · `PAUSED`

The mapping from status to label, color token, and icon lives in exactly one
place: `constants/monitor-status.ts`. Every component reads from it.

```ts
export const MONITOR_STATUS_PRESENTATION = {
  UP:       { label: 'Up',       tone: 'success', icon: CheckCircle },
  DEGRADED: { label: 'Degraded', tone: 'warning', icon: AlertTriangle },
  DOWN:     { label: 'Down',     tone: 'danger',  icon: XCircle },
  PAUSED:   { label: 'Paused',   tone: 'neutral', icon: PauseCircle },
  PENDING:  { label: 'Pending',  tone: 'neutral', icon: Clock },
} as const;
```

A `switch (status)` over colors inside a component is forbidden — that is exactly
the duplication that produces a red badge in one view and an amber one in
another. Status is **never** derived on the client from raw check results; the
backend owns that evaluation.

---

## 3. Query Strategy

```ts
export const monitorKeys = {
  all: ['monitors'] as const,
  lists: () => [...monitorKeys.all, 'list'] as const,
  list: (f: MonitorListFilters) => [...monitorKeys.lists(), f] as const,
  details: () => [...monitorKeys.all, 'detail'] as const,
  detail: (id: string) => [...monitorKeys.details(), id] as const,
};
```

| Query | `staleTime` | Notes |
| --- | --- | --- |
| list | 30s | Real-time events patch it; polling is the fallback only |
| detail | 30s | |
| form metadata (projects, channels) | 5m | Rarely changes |

- List filters live in the **URL**, not in a store. A filtered list must be
  shareable and back-button correct.
- Pagination is `useInfiniteQuery` over the backend cursor. Never load all
  monitors.
- Mutations invalidate `monitorKeys.lists()` and the specific `detail(id)` — never
  the whole cache.
- Pause/resume uses an optimistic update with a rollback in `onError`, because the
  latency is visible and the operation is unambiguous. Create/update/delete do
  not — a failed optimistic create is more confusing than a brief spinner.

---

## 4. Real-Time

`useMonitorRealtime(projectId)` subscribes to `monitor.status_changed` and
`monitor.check_completed` and patches the query cache with `setQueryData`.

- Events patch the cache; they never write to Zustand or component state.
- Patch, don't refetch — a status change for one monitor must not trigger a list
  refetch for all of them.
- Unsubscribe on unmount, always.
- The UI must be fully correct with the socket disconnected. Real-time is an
  enhancement layered on polling, not a requirement.
- `monitor.check_completed` is high frequency. Batch or throttle cache patches;
  do not re-render the list on every individual check.

---

## 5. The Monitor Form

The largest form in the product. Schema in `schemas/monitor-form.schema.ts`, one
Zod schema, types via `z.infer`. Create and edit share the schema and the
component — never two divergent copies.

Client-side rules that mirror backend validation (and are **not** the authority):
- `timeoutMs < intervalSeconds * 1000`
- `intervalSeconds` from the allowed set, filtered by the organization's plan
- URL must be `http`/`https`
- at least one expected status code or assertion

Backend field errors from the error envelope are mapped back onto form fields, so
a rule that exists only on the server still lands on the right input. The form is
sectioned (Basics / Request / Assertions / Schedule / Alerting) and each section
is a component — not one thousand-line file.

---

## 6. Performance

- The list is virtualized past ~100 rows.
- `MonitorStatusBadge` and list rows are memoized; a single status change must not
  re-render the whole table.
- Charts belong to `monitor-checks` and load lazily — the monitor detail page must
  render without waiting for charting code.
- Never fetch full check history to render a sparkline; the backend provides a
  pre-aggregated series.

---

## 7. Forbidden in this feature

- deriving monitor status on the client from raw checks
- status colors decided inside a component
- importing `incidents`/`alerts` internals
- storing monitors in Zustand
- list filters in component state instead of the URL
- fetching all monitors without pagination
- a refetch where a cache patch is correct
- duplicating the form between create and edit
- treating client validation as authoritative
- re-rendering the list on every `check_completed` event
