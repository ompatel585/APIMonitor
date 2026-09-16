# views/ — Orchestrators

Scope: `Frontend/views/`. Read `Frontend/CLAUDE.md` first.

One subfolder per domain: `views/<domain>/`. A route in `app/` renders exactly
one View.

```text
views/<domain>/
└── XView.tsx     e.g. views/monitors/MonitorCreateView.tsx
```

## Rules

- A View is the only place allowed to call an `api/` hook or read
  `useAppSelector`/`useAppDispatch` for a given screen. It derives
  loading/error/empty state and passes plain props down into `sections/`.
- A View may compose sections from more than one domain (e.g.
  `ProjectDetailView` renders both `sections/projects/` layout and
  `sections/monitors/MonitorTable`) — cross-domain composition belongs here,
  not in `app/`.
- No hand-rolled markup beyond simple layout wrappers (`<div className="space-y-6">`
  and the like). Actual presentation is always a `sections/` component.
- Create `views/<domain>/` only when a file goes in it. Files are flat inside
  the domain folder — no further nesting.
- `app/` pages import only from here — never from `sections/` or `api/`
  directly.
