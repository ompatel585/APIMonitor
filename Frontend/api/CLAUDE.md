# api/ — RTK Query Slices

Scope: `Frontend/api/`. Read `Frontend/CLAUDE.md` first.

One file per backend domain: `api/<domain>.api.ts`. Each file injects its
endpoints into the single shared `baseApi` (`store/base-api.ts`) via
`baseApi.injectEndpoints(...)` and re-exports the generated hooks.

```text
api/
├── auth.api.ts
├── users.api.ts
├── projects.api.ts
├── monitors.api.ts
└── CLAUDE.md
```

## Rules

- Never call `createApi` here. There is exactly one instance, in `store/`.
- Tag types are declared once, centrally, in `store/base-api.ts`'s
  `tagTypes`. Adding a new tag means adding it there first.
- No JSX in this directory. An `api/*.api.ts` file is the query/mutation
  definitions only — no components, no hooks that aren't RTK Query's own
  generated ones.
- Request/response types come from `types/api/generated.ts`. A domain may
  re-export a narrowed alias (e.g. `export type Monitor = components['schemas']['MonitorResponseDto']`)
  but never hand-writes a parallel shape.
- Mutations that change a list must invalidate that list's tag
  (`{ type: 'X', id: 'LIST' }`), not every tag of that type.
- Optimistic updates belong in `onQueryStarted` on the mutation itself, not in
  the View that calls it.
- `sections/` and `views/` import hooks from here; this directory never
  imports from `sections/` or `views/`.
