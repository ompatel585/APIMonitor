# components/ — Domain-Agnostic UI

Scope: `Frontend/components/`. Read `Frontend/CLAUDE.md` first.

Everything here would still make sense in a completely different product. If a
file mentions a monitor, an incident, a project, or an organization, it
belongs in `sections/<domain>/`, not here.

```text
components/
├── button.tsx, input.tsx, label.tsx, select.tsx, dialog.tsx, card.tsx,
│   badge.tsx, table.tsx, toast.tsx, toaster.tsx, spinner.tsx   primitives
├── form-field.tsx           react-hook-form-bound input wrapper
├── error-message.tsx        renders a normalized error from any source
├── full-page-spinner.tsx
├── icons/                   inline SVG icon components
└── CLAUDE.md
```

## Rules

- Never import from `sections/`, `views/`, or `api/`. This directory sits
  below everything domain-specific in the dependency graph.
- A component moves here only after being used by two or more domains and
  made domain-agnostic first. One-off code stays in its owning
  `sections/<domain>/`.
- No data-fetching here, ever — not even generically. If a component needs
  data, that data arrives as a prop.
