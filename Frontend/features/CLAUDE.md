# Frontend Features — Domain Ownership

Scope: `Frontend/features/`. Read `Frontend/CLAUDE.md` first.

A feature owns one domain's UI, data access, schemas, and types. Most frontend
code lives here. `app/` composes features; it does not contain them.

---

## 1. Anatomy

```text
features/<domain>/
├── index.ts          PUBLIC API — the only file other features and app/ may import
├── api/
│   ├── keys.ts       Query key factory. No inline keys anywhere.
│   ├── queries.ts    useXList, useX — read hooks
│   └── mutations.ts  useCreateX, useUpdateX — write hooks with invalidation
├── components/       Domain components
├── hooks/            Domain hooks that are not data fetching
├── schemas/          Zod schemas (only if the feature has forms)
├── types/            View models; re-export generated API types, never redefine them
├── constants/
└── utils/            Pure domain functions
```

**Create a directory only when a file goes in it.** A feature with four
components uses a flat `components/`, not four empty category folders. Add
`components/forms/` etc. only once the flat folder is genuinely hard to scan.

---

## 2. The Public API Rule

`index.ts` exports only what `app/` and other features legitimately need —
typically a few components and hooks. Everything else is internal.

```ts
// features/monitors/index.ts
export { MonitorList } from './components/MonitorList';
export { MonitorStatusBadge } from './components/MonitorStatusBadge';
export { useMonitor, useMonitorList } from './api/queries';
export type { MonitorListFilters } from './types';
```

```ts
import { MonitorList } from '@/features/monitors';              // correct
import { MonitorList } from '@/features/monitors/components/MonitorList'; // forbidden
```

Reaching past `index.ts` couples features to each other's internals and makes any
refactor a cross-feature change.

---

## 3. Cross-Feature Dependencies

Allowed, and expected:
- `incidents` renders `MonitorStatusBadge` from `monitors`' public API
- `dashboard` composes widgets from several features
- any feature uses `shared/`

Forbidden:
- importing another feature's internal file
- a circular dependency between two features
- `shared/` importing from any feature
- duplicating another feature's component because importing felt awkward — if the
  export is missing, add it to that feature's `index.ts`

If two features need the same domain-agnostic piece, it moves to `shared/` after
being made domain-free. If they need the same *domain* piece, the owning feature
exports it.

---

## 4. Data Access

Components never call `services/` directly and never call `fetch`. They use the
feature's hooks, which call `services/`, which call the shared HTTP client.

```text
component → features/<domain>/api/queries → services/<domain> → lib/http
```

Every feature defines its query key factory in `api/keys.ts`. Mutations invalidate
precise keys. A mutation that invalidates everything is a defect.

---

## 5. Types

The backend's OpenAPI document generates `Frontend/types/api/generated.ts`. A
feature **re-exports** those types; it does not hand-write a parallel interface
that will silently drift.

```ts
// features/monitors/types/index.ts
import type { components } from '@/types/api/generated';
export type Monitor = components['schemas']['MonitorResponseDto'];

// View models built on top are fine:
export type MonitorListFilters = { status?: MonitorStatus; projectId?: string; search?: string };
```

Form types come from `z.infer<typeof schema>` — never hand-written alongside a
schema.

---

## 6. Domains

`auth` · `dashboard` · `projects` · `monitors` · `monitor-checks` · `incidents` ·
`alerts` · `status-pages` · `users` · `billing` · `api-keys`

These mirror the backend modules deliberately — one owner per concept on both
sides makes the contract obvious.

---

## 7. Forbidden in `features/`

- importing another feature's internals
- a circular feature dependency
- `fetch`/`axios` outside `services/`
- inline query keys
- server state in Zustand
- hand-written types that duplicate the generated API contract
- business rules the backend does not also enforce
- a component reaching into `lib/http` directly
- empty placeholder directories
