# Frontend — Next.js Application

Scope: everything under `Frontend/`. Read the root `CLAUDE.md` first.

The frontend is a **presentation and client-orchestration layer**. It renders
state, collects input, validates it for user experience, and calls the backend.
It holds no business rules that the backend does not also enforce. Any validation
here is a convenience; the backend is the authority.

---

## 1. Stack

Next.js (App Router) · React · TypeScript strict · Redux Toolkit + RTK Query ·
Zod · Tailwind CSS · Vitest + Testing Library · Playwright.

---

## 2. Layers

Every layer below is a **top-level directory directly under `Frontend/`**.
There is no domain nesting above `sections/` and `views/` — a domain gets one
subfolder inside each of `api/`, `sections/`, `views/`, `schemas/`; it never
gets its own top-level directory.

```text
app/          Route composition. Layouts, pages, loading/error boundaries. NO business logic.
views/        Orchestrators. views/<domain>/. Call api/ hooks, compose sections/. The "smart" layer.
sections/     Presentational pieces. sections/<domain>/. Props in, JSX out. No data-fetching.
api/          RTK Query slices. api/<domain>.api.ts, injected into the single shared base-api.
store/        Redux store setup: base-query, base-api, root store, typed hooks, UI slices.
components/   Domain-agnostic UI primitives and composites. Knows nothing about monitors.
schemas/      Zod schemas. schemas/<domain>/. Source of truth for form types.
constants/    Domain-agnostic OR domain constants that don't warrant their own module.
hooks/        Generic, domain-free React hooks (plus small cross-domain hooks like org-id lookup).
lib/          Infrastructure wiring: env, dates, class-name helper.
providers/    React context / Redux providers composed at the root.
config/       Routes, navigation, permissions, constants. Static configuration.
types/        Cross-cutting types + the generated API contract.
styles/       Tailwind layers, theme tokens, CSS variables.
middleware.ts Edge middleware: auth redirects and route protection only.
```

### Dependency direction

```text
app  →  views  →  sections → components → lib
              ↘  api      → store      → lib
```

- `app/` route **pages** may import from `views/`, `providers/`, `config/`.
  They do **not** import `sections/` or `api/` directly — a page renders
  exactly one View. A route **layout** (`layout.tsx`) is shell chrome shared
  by every page under it, not a page itself — it may call a small, trivial
  `api/` hook directly (e.g. the dashboard shell's logout button) when that
  chrome does not belong to any single View. Prefer a View when the logic
  grows past a couple of lines.
- `views/<domain>/` may import from `api/<domain>.api.ts`, `sections/<domain>/`,
  `sections/<other-domain>/` (cross-domain composition is expected at the view
  layer), `components/`, `hooks/`, `schemas/<domain>/`, `constants/`.
- `sections/<domain>/` may import from `components/`, `hooks/`, `constants/`,
  `types/`. **Sections never call an API hook and never import from `api/` or
  `store/`.** A section receives everything through props. A **type-only**
  import from `api/<domain>.api.ts` (e.g. `import type { Monitor } from
  '@/api/monitors.api'`) is fine — it costs nothing at runtime and lets a
  section's props stay in sync with the OpenAPI contract. The forbidden thing
  is a *value* import: a hook, `baseApi`, `store`, or a dispatch.
- `api/` may import from `store/` (to reuse `baseApi`) and `types/`. It never
  imports `sections/` or `views/`.
- `components/` may import from `lib/`, `hooks/`, `types/`, `styles/` — never
  from `sections/`, `views/`, or `api/`.
- `store/` imports only third-party code and `config/`.
- One domain's `sections/`/`views/` files reach another domain's `sections/`
  only through that domain's files directly — there is no `index.ts`
  re-export gate the way features used to have one; keep cross-domain imports
  intentional and reviewed.

---

## 3. `app/` — Route Composition Only

A page file renders exactly one View and nothing else. Concretely, a page may:
read route params and search params, set metadata, and render a single
`views/<domain>/XView`.

A page must **not**: contain data transformation, business rules, validation
logic, direct `fetch` calls, call an `api/` hook itself, render a `sections/`
component directly, or contain inline component definitions longer than a few
lines.

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

## 4. `views/` — Orchestrators

One subfolder per domain: `views/<domain>/`. A View is the only thing a route
renders. It owns: calling `api/` hooks, deriving loading/error/empty state,
composing one or more `sections/` components, and wiring callbacks (mutations,
navigation) down into them as props.

```text
views/<domain>/
└── XView.tsx     e.g. views/monitors/MonitorCreateView.tsx
```

A View contains **no markup of its own beyond simple layout wrappers** — the
actual presentation is a `sections/` component. A View is where you'd look to
answer "what API calls does this screen make and what does it do on success."

Domains: `auth`, `dashboard`, `projects`, `monitors`, `monitor-checks`,
`incidents`, `alerts`, `status-pages`, `users`, `billing`, `api-keys`.

---

## 5. `sections/` — Presentational Pieces

One subfolder per domain: `sections/<domain>/`. A section is a dumb component:
props in, JSX out. No `api/` import, no Redux dispatch, no data-fetching hook of
any kind. Anything it needs — data, callbacks, loading state — arrives as a
prop from the View that renders it.

```text
sections/<domain>/
└── XCard.tsx, XFields.tsx, XTable.tsx, XTableRow.tsx, XEmptyState.tsx …
```

This is what used to be `features/<domain>/components/`. The rename reflects
the new rule: these files may not reach into `api/` themselves anymore — only
the View above them may.

---

## 6. `components/` vs `sections/`

`components/` holds code that would still make sense in a completely different
product. If it mentions a monitor, an incident, or an organization, it belongs
in `sections/<that-domain>/`, not `components/`.

```text
components/
├── button.tsx, input.tsx, select.tsx, dialog.tsx, card.tsx, badge.tsx, table.tsx, toast.tsx …  (primitives)
├── error-message.tsx, full-page-spinner.tsx                                                    (composites)
├── icons/
└── layouts/
```

**`components/` is not a dumping ground.** Something goes here only once it is
domain-agnostic. One-off, domain-specific code stays in `sections/<domain>/`.

---

## 7. Data Fetching — RTK Query

- All server data flows through RTK Query. No `useEffect` + `fetch`, no
  hand-rolled service client.
- There is exactly **one** `createApi` instance: `store/base-api.ts`
  (`baseApi`). Every domain injects its endpoints into it via
  `baseApi.injectEndpoints(...)` in `api/<domain>.api.ts`. This is what lets one
  domain's mutation invalidate another domain's tag (e.g. `auth`'s login
  invalidates `users`' `CurrentUser` tag) without cross-module dispatch
  gymnastics.
- `store/base-query.ts` wraps `fetchBaseQuery`: sets the base URL from
  `lib/env/client.ts`, attaches the in-memory access token, sets
  `x-request-id`, and on a `401` (except from `/auth/refresh` itself) acquires
  an `async-mutex` `Mutex`, calls `/auth/refresh` once, and retries the
  original request with the new token — or clears the token and lets the 401
  propagate.
- Tag types are declared once on `baseApi` (`CurrentUser`, `Membership`,
  `Project`, `Monitor`, …) and referenced by every domain's `providesTags` /
  `invalidatesTags`. A mutation that invalidates everything is a defect.
- Optimistic updates use `onQueryStarted` with `dispatch(api.util.updateQueryData(...))`
  and `patch.undo()` in the `catch`.
- Cursor pagination uses RTK Query's `serializeQueryArgs` / merge pattern for
  high-volume collections (checks, incidents).
- `keepUnusedDataFor` is set deliberately per endpoint. Monitor status is
  short-lived; organization settings are long-lived.

```text
sections component (props) ← views/<domain>/XView.tsx ← api/<domain>.api.ts (RTK Query hook) ← store/base-query.ts
```

### `api/`

One file per backend domain: `api/<domain>.api.ts`. Each file injects its
endpoints into the shared `baseApi` and exports the generated hooks
(`useLoginMutation`, `useListProjectsQuery`, …). An `api/` file contains **no
JSX** — it is the RTK Query slice only. Request/response types come from
`types/api/generated.ts`; never hand-write a type that duplicates the OpenAPI
contract.

---

## 8. State Management

Pick the leftmost option that works:

| State | Use |
| --- | --- |
| Filters, tabs, pagination, selected id, search | **URL** (`searchParams`) — shareable, back-button correct |
| Open/closed, hover, input draft, step index | **local `useState`** |
| Passing a value down one subtree | **Context** (theme) |
| Anything that came from or goes to the backend | **RTK Query cache** (`store/base-api.ts`) |
| Global client-only UI state used across unrelated routes | **A small Redux slice in `store/`** |

**Redux slice rules.** Permitted: sidebar/UI shell state, theme preference,
the auth "logged out" sticky flag, command palette state. A slice must not hold
server data — no monitors, no incidents, no user profile fetched from the API.
Duplicating RTK Query's own cache in a hand-written slice is a defect. Slices
are small and typed; there is one root reducer (`store/index.ts`) composed of
`baseApi.reducer` plus a handful of small UI slices — no single "app state" god
slice.

---

## 9. Server / Client Boundaries

- **Server Components are the default.** Add `'use client'` only when you need
  state, effects, browser APIs, event handlers, or a Redux/RTK Query hook.
- Push `'use client'` to the leaves. A page should not become a client
  component because one button needs `onClick`.
- Server-only modules (anything reading a non-`NEXT_PUBLIC_` env var, or
  holding a secret) import `server-only` at the top. Browser-only modules
  (including `store/base-query.ts`) import `client-only`.
- Secrets never reach a client component — not as a prop, not in the Redux
  store, not in a serialized payload. Only `NEXT_PUBLIC_*` values exist in the
  browser.
- `middleware.ts` does auth redirects and route protection only. No data
  fetching, no business rules.

---

## 10. Validation

- Zod for every form. Schema lives in `schemas/<domain>/`.
- The schema is the single source of truth for the form's types
  (`z.infer<typeof schema>`). Do not hand-write a matching interface.
- Client validation is UX. The backend validates independently and its errors
  are surfaced by mapping the error envelope back onto the form.

---

## 11. Real-Time

The socket client lives in `lib/socket/` and is provided once via
`providers/socket-provider`. A View subscribes through a hook in `hooks/` or a
small domain hook, never by importing the raw socket.

Incoming events patch the RTK Query cache directly
(`dispatch(api.util.updateQueryData(...))`) or trigger a targeted
`invalidateTags`. They do not write to a Redux UI slice. Every subscription
unsubscribes on unmount. The UI must render correctly with the socket
disconnected — real-time is an enhancement, not a requirement.

---

## 12. Styling

Tailwind only. No CSS-in-JS, no per-component `.css` files. Design tokens are
CSS variables in `styles/`; never hardcode a hex value in a component. Variants
come from `cva`. Conditional classes go through the `cn()` helper in
`lib/utils/cn.ts`. Dark mode is a class strategy and every component must work
in both themes.

---

## 13. Testing

- Vitest + Testing Library, colocated with the code.
- Test behavior through the accessible interface (roles, labels), not
  implementation details or class names.
- Mock at the network boundary with MSW. Do not mock your own hooks to test a
  component that uses them.
- Playwright E2E in `Frontend/e2e/`, covering critical journeys: register →
  create project → create monitor → view results; login; incident acknowledge;
  public status page.

---

## 14. Forbidden in `Frontend/`

- importing anything from `Backend/`
- TypeORM, `pg`, `bullmq`, `ioredis`, or any server-side dependency
- business logic in `app/` pages, layouts, or middleware
- `useEffect` + `fetch` for server data
- server data stored in a Redux slice or Context
- a second `createApi` instance — everything injects into the one `baseApi`
- a `sections/<domain>/` component importing from `api/` or `store/`
- an `app/` page rendering a `sections/` component directly (must go through a View)
- creating a top-level domain directory instead of a subfolder under
  `sections/`, `views/`, `api/`, or `schemas/`
- hardcoded API URLs or colors
- `any`, `@ts-ignore`, non-null assertions used to silence the compiler
- reading `process.env` outside `lib/env/`
- exposing a non-`NEXT_PUBLIC_` value to a client component
- adding a Redux slice because prop drilling felt tedious
