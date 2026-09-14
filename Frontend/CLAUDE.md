# Frontend — Next.js Application

Scope: everything under `Frontend/`. Read the root `CLAUDE.md` first.

The frontend is a **presentation and client-orchestration layer**. It renders
state, collects input, validates it for user experience, and calls the backend.
It holds no business rules that the backend does not also enforce. Any validation
here is a convenience; the backend is the authority.

---

## 1. Stack

Next.js (App Router) · React · TypeScript strict · TanStack Query · Zod ·
Tailwind CSS · Zustand (sparingly) · Vitest + Testing Library · Playwright.

---

## 2. Layers

```text
app/          Route composition. Layouts, pages, loading/error boundaries. NO business logic.
features/     Domain-owned UI, hooks, API bindings, schemas, types. The bulk of the code.
shared/       Domain-agnostic UI primitives and composites. Knows nothing about monitors.
services/     Typed backend API clients. One module per backend domain.
lib/          Infrastructure wiring: http client, query client, socket, env, logger, dates.
hooks/        Generic, domain-free React hooks.
stores/       Global CLIENT state only. Small. See §7.
providers/    React context providers composed at the root.
config/       Routes, navigation, permissions, constants. Static configuration.
types/        Cross-cutting types + the generated API contract.
styles/       Tailwind layers, theme tokens, CSS variables.
middleware.ts Edge middleware: auth redirects and route protection only.
```

### Dependency direction

```text
app  →  features  →  services → lib
                 ↘  shared   → lib
```

- `app/` may import from `features/`, `shared/`, `config/`, `providers/`.
- `features/` may import from `shared/`, `services/`, `lib/`, `hooks/`,
  `config/`, `types/`, `stores/`.
- `shared/` may import from `lib/`, `hooks/`, `types/`, `styles/` — **never from
  `features/`, `services/`, or `stores/`**.
- `lib/` imports only third-party code and `config/`.
- Feature A imports Feature B **only** through `features/b/index.ts`. Reaching
  into `features/b/components/...` from feature A is forbidden.

---

## 3. `app/` — Route Composition Only

A page file should read as an assembly of feature components. Concretely, a page
may: read route params and search params, check auth/redirect, set metadata,
prefetch queries for hydration, and render feature components inside layout.

A page must **not**: contain data transformation, business rules, validation
logic, direct `fetch` calls with hand-written URLs, or inline component
definitions longer than a few lines.

```text
app/
├── layout.tsx
├── (marketing)/          pricing, docs, features, contact — public, static-friendly
├── (auth)/               login, register, forgot-password, reset-password
├── (dashboard)/          authenticated app shell
│   ├── dashboard/        overview, analytics, activity
│   ├── projects/         new, [projectId]/{overview,monitors,incidents,alerts,settings}
│   ├── monitors/         new, [monitorId]/{checks,incidents,analytics}
│   ├── incidents/        [incidentId]
│   ├── alerts/           channels, rules
│   ├── status-pages/     new, [statusPageId]
│   └── settings/         profile, security, notifications, billing, api-keys, team
├── status/[slug]/        PUBLIC status page — unauthenticated, cached, no dashboard imports
└── api/                  Route Handlers — see §4
```

Removed from the original sketch: `app/sitemap/` (Next.js uses
`app/sitemap.ts`, a file, not a folder). Added: `settings/team` (membership
management is required by the authorization model).

Every route segment gets `loading.tsx` and `error.tsx`. Dynamic segments
validate their params before use.

### `app/api/` — Route Handlers

Route Handlers exist for a **narrow** set of reasons only:
- auth callbacks that must set httpOnly cookies
- webhook receivers that must terminate at the Next.js origin (e.g. billing)
- a same-origin proxy for requests that need a server-held secret
- `health`

Route Handlers are **not** a second backend. They never contain business logic,
never talk to a database, never import backend code.

---

## 4. `features/` — Domain Ownership

One directory per domain. A feature owns its UI, its data access, its schemas,
and its types.

```text
features/<domain>/
├── index.ts          PUBLIC API. The only file other features may import.
├── api/              Query/mutation hooks + query key factory. Calls services/.
├── components/       Domain components. Subfolder only when there are enough files to warrant it.
├── hooks/            Domain hooks that are not data fetching.
├── schemas/          Zod schemas for forms (only where the feature has forms).
├── types/            Domain view models. Re-export generated API types; do not redefine them.
├── constants/        Domain constants.
└── utils/            Domain-pure functions.
```

Create a subdirectory only when a file goes in it. A feature with four components
uses a flat `components/`, not `components/{cards,tables,forms,dialogs}/`.

Domains: `auth`, `dashboard`, `projects`, `monitors`, `monitor-checks`,
`incidents`, `alerts`, `status-pages`, `users`, `billing`, `api-keys`.

`index.ts` exports only what other features and `app/` legitimately need —
typically a handful of components and hooks. Everything else stays internal.

---

## 5. `shared/` vs `features/`

`shared/` holds code that would still make sense in a completely different
product. If it mentions a monitor, an incident, or an organization, it is not
shared.

```text
shared/
├── ui/            Primitives: Button, Input, Select, Dialog, Card, Badge, Table, Toast…
├── components/    Composites: layout, navigation, feedback, data-display, empty-state, loading, error
├── forms/         Form field wrappers bound to react-hook-form + Zod
├── charts/        Generic chart wrappers (a StatusTimeline is a feature component, not this)
├── icons/
├── layouts/
└── providers/     Presentation-level providers (theme)
```

**`shared/` is not a dumping ground.** Something goes here only after it is used
by two or more features and has been made domain-agnostic. One-off code stays in
its feature.

---

## 6. Data Fetching — TanStack Query

- All server data flows through TanStack Query. No `useEffect` + `fetch`.
- Every feature defines a **query key factory** in `features/<domain>/api/keys.ts`.
  Never write a query key inline.
  ```ts
  export const monitorKeys = {
    all: ['monitors'] as const,
    lists: () => [...monitorKeys.all, 'list'] as const,
    list: (filters: MonitorFilters) => [...monitorKeys.lists(), filters] as const,
    details: () => [...monitorKeys.all, 'detail'] as const,
    detail: (id: string) => [...monitorKeys.details(), id] as const,
  };
  ```
- Components never call `services/` directly. They use the feature's hooks.
- Mutations invalidate precisely — the affected keys, not `queryClient.clear()`.
- Optimistic updates require a rollback in `onError`.
- Pagination uses `useInfiniteQuery` with the backend's cursor.
- `staleTime` is set deliberately per query. Monitor status is short-lived;
  organization settings are long-lived.
- Server-rendered pages prefetch on the server and hydrate; they do not fetch
  twice.

### `services/`

One module per backend domain, mirroring the backend's resources. A service
function takes typed params, calls the shared HTTP client, and returns a typed
response from `types/api/generated.ts`. Services contain **no React** and **no
business logic** — they are transport.

The HTTP client (`lib/http/`) is configured once: base URL, credentials, request
id propagation, access-token refresh on 401 with a single in-flight refresh, and
translation of the backend error envelope into a typed `ApiError`.

---

## 7. State Management

Pick the leftmost option that works:

| State | Use |
| --- | --- |
| Filters, tabs, pagination, selected id, search | **URL** (`searchParams`) — shareable, back-button correct |
| Open/closed, hover, input draft, step index | **local `useState`** |
| Passing a value down one subtree | **Context** (theme, current org) |
| Anything that came from or goes to the backend | **TanStack Query** |
| Global client-only state used across unrelated routes | **Zustand** |

**Zustand rules.** Permitted stores: sidebar/UI shell state, theme preference,
command palette, and transient cross-route client state. A store must not hold
server data — no monitors, no incidents, no user profile fetched from the API.
Caching server data in Zustand duplicates the query cache and is a defect.
Stores are small, sliced, and typed; no single "app store" god object.

---

## 8. Server / Client Boundaries

- **Server Components are the default.** Add `'use client'` only when you need
  state, effects, browser APIs, or event handlers.
- Push `'use client'` to the leaves. A page should not become a client component
  because one button needs `onClick`.
- Server-only modules (anything reading a non-`NEXT_PUBLIC_` env var, or holding
  a secret) import `server-only` at the top. Browser-only modules import
  `client-only`.
- Secrets never reach a client component — not as a prop, not in a store, not in
  a serialized payload. Only `NEXT_PUBLIC_*` values exist in the browser.
- Server Actions are permitted for form submissions that do not need optimistic
  client state; they validate with the same Zod schema and call the backend API.
  They are not a place for business logic.
- `middleware.ts` does auth redirects and route protection only. No data
  fetching, no business rules.

---

## 9. Validation

- Zod for every form. Schema lives in `features/<domain>/schemas/`.
- The schema is the single source of truth for the form's types
  (`z.infer<typeof schema>`). Do not hand-write a matching interface.
- Client validation is UX. The backend validates independently and its errors
  are surfaced by mapping the error envelope's field errors back onto the form.

---

## 10. Real-Time

The socket client lives in `lib/socket/` and is provided once via
`providers/socket-provider`. Feature code subscribes through a hook in
`features/<domain>/hooks/`, never by importing the raw socket.

Incoming events update the TanStack Query cache (`setQueryData` or a targeted
invalidation). They do not write to Zustand. Every subscription unsubscribes on
unmount. The UI must render correctly with the socket disconnected — real-time is
an enhancement, not a requirement.

---

## 11. Styling

Tailwind only. No CSS-in-JS, no per-component `.css` files. Design tokens are CSS
variables in `styles/`; never hardcode a hex value in a component. Variants come
from `cva`. Conditional classes go through the `cn()` helper. Dark mode is a
class strategy and every component must work in both themes.

---

## 12. Testing

- Vitest + Testing Library, colocated with the code.
- Test behavior through the accessible interface (roles, labels), not
  implementation details or class names.
- Mock at the network boundary with MSW. Do not mock your own hooks to test a
  component that uses them.
- Playwright E2E in `Frontend/e2e/`, covering critical journeys: register →
  create project → create monitor → view results; login; incident acknowledge;
  public status page.

---

## 13. Forbidden in `Frontend/`

- importing anything from `Backend/`
- TypeORM, `pg`, `bullmq`, `ioredis`, or any server-side dependency
- business logic in `app/` pages, layouts, or middleware
- `useEffect` + `fetch` for server data
- server data stored in Zustand or Context
- inline query keys
- a raw `fetch` to the backend outside `services/`
- `shared/` importing from `features/`
- feature A importing feature B's internals
- hardcoded API URLs or colors
- `any`, `@ts-ignore`, non-null assertions used to silence the compiler
- reading `process.env` outside `lib/env/`
- exposing a non-`NEXT_PUBLIC_` value to a client component
- adding a global store because prop drilling felt tedious
