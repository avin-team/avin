# Avin Agent Configuration

## Coding Standards

All coding standards are documented in [`CODING_STANDARDS.md`](CODING_STANDARDS.md). That file is the single source of truth for code review and implementation conventions.

## Agent skills

### Issue tracker

Issues live in Jira at `nemole.atlassian.net` (project: `AVIN`), accessed via the Jira MCP server. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default five canonical triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context monorepo — root `CONTEXT-MAP.md` pointing to per-package `CONTEXT.md` files, with `docs/adr/` at root and per-package levels. See `docs/agents/domain.md`.
