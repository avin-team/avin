# Avin Agent Configuration

## Quick Reference

- **API Tests**: `bun run --cwd packages/api test <file>`
- **Web Tests**: `bun run --cwd apps/web test <file>`
- **E2E Tests**: `bun run test:e2e` (targeted: `bun run test:e2e:smoke`, `bun run test:e2e:seller`)
- **Lint & Types**: `bun run check` (fix: `bun run fix`) | `bun run check-types`
- **Database Query (Prod/Linked)**: `bun x supabase db query --linked "<SQL>"`
- **Schema Definitions**: `packages/db/src/schema/`

## Navigation

- `apps/web`: Frontend UI, routes, TanStack Router/Query/Form, feature modules (`src/features/<feature>`).
- `packages/api`: Business logic, domain services, oRPC procedures, Zod contracts & schemas.
- `packages/db`: Drizzle schemas, migrations, seeders, database clients.
- `packages/ui`: Shared design system primitives (`@avin/ui`).
- `e2e`: Playwright E2E test suites.

## Coding Standards

All coding standards are documented in [`CODING_STANDARDS.md`](CODING_STANDARDS.md). That file is the single source of truth for code review and implementation conventions.

## Agent skills

### Issue tracker

Issues live in Jira at `nemole.atlassian.net` (project: `AVIN`), accessed via the Jira MCP server. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default five canonical triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context monorepo — root `CONTEXT-MAP.md` pointing to per-package `CONTEXT.md` files, with `docs/adr/` at root and per-package levels. See `docs/agents/domain.md`.

### AI Code Review

Automated code reviews use Alibaba's Open Code Review (`ocr`). Architectural and quality rules are defined in `.opencodereview/rule.json` (mapped from `CODING_STANDARDS.md`). See `.agents/skills/open-code-review/SKILL.md`.
