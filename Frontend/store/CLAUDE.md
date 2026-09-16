# store/ — Redux Setup

Scope: `Frontend/store/`. Read `Frontend/CLAUDE.md` first.

This directory holds the **shared Redux/RTK Query plumbing only**. It is not
where domain data lives.

```text
store/
├── base-query.ts     fetchBaseQuery wrapper: auth header, x-request-id, 401 refresh-and-retry
├── base-api.ts       the ONE createApi instance (baseApi) — every domain injects into this
├── auth-ui.slice.ts  the sticky "logged out" flag — the only reason a slice exists today
├── index.ts          configureStore, RootState/AppDispatch types, the `store` singleton
├── hooks.ts          useAppDispatch / useAppSelector, typed
└── CLAUDE.md          this file
```

## Rules

- There is exactly one `createApi` call in the whole app: `base-api.ts`. A
  domain's RTK Query endpoints live in `api/<domain>.api.ts` and call
  `baseApi.injectEndpoints(...)` — they never call `createApi` themselves.
- A new Redux slice is added here only for genuine cross-route client-only UI
  state (see `Frontend/CLAUDE.md` §8). If what you're adding could instead be
  derived from an RTK Query query result, it does not belong in a slice.
- `base-query.ts` is the only file allowed to read or write the in-memory
  access token. Nothing outside `store/` should reach into token state
  directly — it is exposed only implicitly, through requests going through
  `baseQuery`.
- Never add a domain-specific reducer key here (e.g. no `monitorsSlice`). If a
  domain thinks it needs local Redux state beyond RTK Query's cache, that is a
  sign the state belongs in the View's `useState`/URL instead — ask before
  adding a slice for it.
