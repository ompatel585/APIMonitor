# sections/ — Presentational Pieces

Scope: `Frontend/sections/`. Read `Frontend/CLAUDE.md` first.

One subfolder per domain: `sections/<domain>/`. A section is dumb: props in,
JSX out.

```text
sections/<domain>/
└── XCard.tsx, XFields.tsx, XTable.tsx, XTableRow.tsx, XEmptyState.tsx …
```

## Rules

- **No `api/` import. No `store/` import. No RTK Query hook. No `useAppDispatch`
  or `useAppSelector`.** Everything a section needs — data, callbacks, pending
  state, error — arrives as a prop from the `views/<domain>/` component that
  renders it. If a section seems to need a hook to fetch its own data, that
  logic belongs one layer up, in the View.
- May import `components/`, `hooks/` (non-data ones), `constants/`, `types/`,
  and other sections within the same domain.
- Create `sections/<domain>/` only when a file goes in it. Files inside a
  domain folder are flat — no further nested folders by role (no
  `sections/monitors/forms/`, `sections/monitors/tables/`).
- A section that starts needing a mutation is a sign it should become (or move
  into) a View, not that it should import `api/` directly.
