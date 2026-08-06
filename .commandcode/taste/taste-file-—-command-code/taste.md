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
- Prefers AI agent to commit and push code directly without asking for confirmation each time. Confidence: 0.60
- Do NOT commit code unless the user has explicitly said to commit (e.g., "commit", "oki commit the code"). Work silently in the working tree; the user will say when to commit. Confidence: 0.90

- Prefers prototype-first approach: mock UI/frontend first, get approval on the prototype design, then implement real logic. User explicitly says "tôi chỉ cần prototype thôi", "mục tiêu implement chỉ là mock UI frontend trước thôi". Confidence: 0.85

- All user-facing UI labels and text should be in Vietnamese ("chuyển thành tiếng việt hết nhé"). Confidence: 0.90

- Prefers simplified, merged workflows: combine wizard steps, remove unnecessary intermediate pages, eliminate redundant tabs. Repeatedly asks to merge "thông tin từ khách" into basic info, remove dedicated banner/image/payment tabs. Confidence: 0.85

- Uses structured command prefixes for agent workflow: `$grill-me` (spec/code review), `$grill-with-docs` (review with documentation), `$implement` (start implementation), `$handoff` (produce handoff document), `$to-tickets` (create Jira tickets), `$prototype` (design prototype). Confidence: 0.80

- Prefers `packages/ui` over `apps/web` for shared/common UI components. When asked where to put reusable components, prefers the shared UI package. Confidence: 0.80

- Prefers expandable/collapsible sidebar navigation groups (nav-group pattern with parent items that expand to show children) rather than all-flat navigation items. Confidence: 0.80

- Maintains a separate boilerplate/reference project at `/Users/ngocla/dev/projects/boilerplate/mono-dashboard/` — uses it as a source of architectural patterns and component conventions to follow. Confidence: 0.75
- Wants coding rules/standards synthesized into a document for AI agents to follow before implementation begins. Confidence: 0.80

- Backend API packages follow domain/feature-based folder structure: each domain (e.g., `access/`, `listing/`, `seller-application/`) owns its own `router.ts`, procedures, and `*.test.ts`. The root `router.ts` only composes domain routers. Avoids shallow module patterns like `helpers/`, `schemas/`, `repositories/`, or one-file-per-handler — each domain encapsulates its own logic. Confidence: 0.90

- Tests for API routers should exercise the router interface (integration-level), not test duplicated schemas or private helper functions in isolation. Confidence: 0.80

- Prefers explicit named entry paths in `package.json` `"exports"` field (e.g., `"./router": "./src/router.ts"`) over wildcard `"./*"` exports, giving callers stable import paths. Confidence: 0.75

- When AI-made changes introduce more problems than they solve, prefers full revert of those changes and a fresh approach rather than piling on incremental fixes. Confidence: 0.65
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

- When adding related ticket references to a Jira comment, prefers editing the existing comment (via `commentId`) rather than posting a new separate comment, keeping the comment thread clean. Confidence: 0.65

- Zero tolerance for inline lint suppression comments (e.g., `/* oxlint-disable */`, `// oxlint-disable-next-line`). Fix the underlying code issues instead of suppressing them. If a rule genuinely does not apply to the project, disable it at the config level (`oxlint.config.ts`), not inline. Exception: when a lint rule genuinely conflicts with oxfmt (formatter reverts the lint-compliant ordering, making both unsatisfiable), inline disable is the pragmatic fallback. Confidence: 0.75
- Prefers disabling inapplicable lint rules in the config file (`oxlint.config.ts`) rather than scattering inline disable comments throughout source files. Confidence: 0.75
- Treats commented-out lint rule disables in the config as technical debt to remove, not leave as dead code. Either the rule genuinely doesn't apply (uncomment the disable) or it does apply (remove the disable and fix the code). Confidence: 0.70

- Prefers structured code review reports with explicit word limits (e.g., "under 400 words") and pre-defined finding categories: missing/partial requirements, scope creep, wrong implementation, documented-standard breaches, and smell-baseline judgement calls. Confidence: 0.80

- Prefers reviewing staged changes against a fixed-point git commit as a baseline (`git diff --cached <hash>`), treating `<hash>..HEAD` as the change range, with no commits expected between the fixed point and the staged worktree. Confidence: 0.80

- Expects both buyer-facing and seller-facing UI to be implemented together for marketplace/two-sided features — repeatedly flags when only one side is present ("i think it also missing the seller ui too"). Confidence: 0.75

- Prefers spec-traceable review findings: every reported requirement gap or implementation issue should quote the relevant spec line or acceptance criterion. Confidence: 0.75
- SVG icons are React components in `components/icons/`, accepting `SVGProps<SVGSVGElement>` with `...props` spread onto `<svg>`. Uses `fill="currentColor"` for CSS-color inheritance and `viewBox="0 0 32 32"` for consistent sizing. Named exports follow `{Name}Icon` convention (e.g., `FacebookIcon`, `YouTubeIcon`). Confidence: 0.75

- When the user indicates certain files are theirs to work on (e.g., "mấy cái code đang sửa bạn đừng bận tâm"), the agent must leave those files untouched and scope work to the remaining files only. Respect the user's active working set; do not modify files the user has claimed. Confidence: 0.75

- `.tsx` files must only export React components (enforced by `react-doctor/only-export-components`). When a `.tsx` file contains non-component exports (constants, helper functions, type maps), split them into a separate `.ts` file and keep only the component in `.tsx`. Use descriptive names for the utility file (e.g., `category-icon-map.ts`) rather than generic names like `utils.ts`. Confidence: 0.80
- Prefers conventional commit format (`fix:`, `feat:`, `chore:`, etc.) with structured multi-line bodies describing what changed and why. Confidence: 0.70
- Uses `Co-authored-by: CommandCodeBot <noreply@commandcode.ai>` trailer in commit messages. Confidence: 0.65
- When oxfmt formatting conflicts with an ultracite lint rule (i.e., oxfmt reverts the lint-compliant ordering), prefers identifying the conflict explicitly, documenting it in the commit message and to the user, then committing with `--no-verify` rather than leaving changes uncommitted or fighting the formatter indefinitely. Confidence: 0.60

- Uses `motion/react`'s `LazyMotion` + `domAnimation` pattern for tree-shakeable animations: wrap the root layout in `<LazyMotion features={domAnimation}>`, then use the `m` alias with `m.div`, `m.header`, `m.button`, etc. Imports `m` via `import * as m from "motion/react-m"` (namespace import from the `motion/react-m` subpath), while `AnimatePresence` comes from `import { AnimatePresence } from "motion/react"`. Confidence: 0.90
- Prefers MCP (Model Context Protocol) integrations for connecting external tools like Jira to the agent environment rather than manual or non-MCP bridge approaches. Confidence: 0.65
- Uses `@phosphor-icons/react` (Phosphor Icons) as the project's icon library — never `lucide-react`. Codebase convention is to enforce this with a custom ESLint rule (`@workspace/no-lucide-react-import`) that blocks `lucide-react` imports. Confidence: 0.90
