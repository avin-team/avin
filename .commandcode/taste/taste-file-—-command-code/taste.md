# Taste File — Command Code

- Prefers Jira over GitHub for issue tracking (Atlassian-based, e.g., nemole.atlassian.net). Confidence: 0.85
- Prefers multi-context monorepo documentation layout: root `CONTEXT-MAP.md` pointing to per-package `CONTEXT.md` files, with `docs/adr/` at both root and per-package levels. Confidence: 0.70
- Speaks Vietnamese and prefers Vietnamese responses. Confidence: 0.95
- Frontend code structure follows feature-based organization: `features/{feature-name}/components`, `features/{feature-name}/hooks`, `features/{feature-name}/utils`, etc. Avoids dumping everything into a flat `components/` folder. Confidence: 0.90
- Does NOT use barrel files (index.ts re-exporting everything). Prefers direct imports from each module. Confidence: 0.90
- Uses TanStack Form (with `useForm`, `form.Field`, `form.Subscribe`) for form state management — not react-hook-form or other form libraries. Confidence: 0.85
- Uses Supabase alongside (not replacing) existing better-auth + drizzle-orm stack. Wants Supabase for storage and realtime messaging while keeping better-auth for authentication and drizzle for database queries. Confidence: 0.85
- Uses Zustand for complex client-side state (mentioned as future need, not for simple state). Confidence: 0.75
- Prefers minimal, recommendation-only changes — do only what is advised, avoid over-engineering or extra scope. Confidence: 0.75
- Uses Resend for transactional email delivery. Confidence: 0.70
- Prefers AI agent to commit and push code directly without asking for confirmation each time. Confidence: 0.85
- Wants coding rules/standards synthesized into a document for AI agents to follow before implementation begins. Confidence: 0.70
- Uses `file://` URIs to point to reference files when giving instructions (e.g., `file:///path/to/boilerplate/__root.tsx`). Confidence: 0.70
- Uses `bun x ultracite` as the project linter/formatter — `bun x ultracite check` for linting and `bun x ultracite fix` for auto-fixing. Confidence: 0.85
- Prefers `const` arrow function components (`export const Foo = () => (...)`) over `function` declarations, per `func-style` lint rule. Confidence: 0.80
- Prefers implicit return for arrow components when body is only JSX (`() => (...)` not `() => { return (...); }`), per `arrow-body-style` lint rule. Confidence: 0.75
- Enforces alphabetically sorted keys in object literals (`sort-keys` lint rule). Confidence: 0.75
- Organizes TanStack Router routes into logical groups: `(public)/` for storefront/marketing pages, `_authenticated/` for protected routes behind a shared session guard layout, and `(errors)/` for error pages. Session guards belong in the group layout (`route.tsx`), not repeated on individual routes. Confidence: 0.80
- TanStack Router route groups (parenthesized directories like `(auth)/`, `(public)/`) MUST contain a `route.tsx` layout file. Empty groups without a shared layout cause incorrect URL generation and 404s. If a group has no shared layout, flatten the routes directly into `routes/` instead. Confidence: 0.85
- In TanStack Router, `<Link to={...}>` and `navigate({ to: ... })` must use full URL paths (e.g., `/dashboard`, `/login`), NOT route IDs (e.g., `/_authenticated/dashboard`, `/(auth)/login`). Conversely, `useSearch({ from: ... })` and `useRouteContext({ from: ... })` use route IDs, NOT URL paths. Confidence: 0.85
- Prefers integration/workflow tests that verify main flows are working (e.g., fill form → submit → correct API calls), rather than exhaustive unit tests for individual input validation edge cases. Confidence: 0.65
- All regex literals must include the `u` (unicode) flag (e.g., `/đăng nhập/iu`, not `/đăng nhập/i`), enforced by ultracite lint. Confidence: 0.80
- Test helper functions (`renderForm`, `fillAndSubmit`, etc.) must be defined at top-level module scope, not nested inside `describe` blocks. Confidence: 0.75
- Prefers entire card components to be clickable navigation links, not just a small link/button inside the card (e.g., wrapping the whole card in TanStack Router `<Link>` rather than having only a "View more" link at the bottom). Confidence: 0.70

- Zero tolerance for inline lint suppression comments (e.g., `/* oxlint-disable */`, `// oxlint-disable-next-line`). Fix the underlying code issues instead of suppressing them. If a rule genuinely does not apply to the project, disable it at the config level (`oxlint.config.ts`), not inline. Confidence: 0.85
- Prefers disabling inapplicable lint rules in the config file (`oxlint.config.ts`) rather than scattering inline disable comments throughout source files. Confidence: 0.75
- SVG icons are React components in `components/icons/`, accepting `SVGProps<SVGSVGElement>` with `...props` spread onto `<svg>`. Uses `fill="currentColor"` for CSS-color inheritance and `viewBox="0 0 32 32"` for consistent sizing. Named exports follow `{Name}Icon` convention (e.g., `FacebookIcon`, `YouTubeIcon`). Confidence: 0.75
