# Issue tracker: Jira

Issues and PRDs for this repo live in Jira at `nemole.atlassian.net`. Use the Jira MCP server for all operations.

## Conventions

- **Create an issue**: Use the MCP Jira `createIssue` tool — provide project key, summary, description (Atlassian Doc format), and issue type (Story, Task, Bug, etc.).
- **Read an issue**: Use the MCP Jira `getIssue` tool with the issue key (e.g. `SCRUM-42`), fetching comments and fields.
- **List issues**: Use the MCP Jira `searchIssues` tool with JQL — filter by project, status, assignee, labels. Example: `project = SCRUM AND status != Done ORDER BY created DESC`.
- **Comment on an issue**: Use the MCP Jira `addComment` tool.
- **Apply / remove labels**: Use the MCP Jira `editIssue` tool to update the `labels` field.
- **Transition**: Use the MCP Jira `transitionIssue` tool to move issues through the workflow (e.g. To Do → In Progress → Done).

Infer the project key from the repo context. Default project: `SCRUM`.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues. Since Jira doesn't track PRs, create a Jira issue for each external PR.

## When a skill says "publish to the issue tracker"

Create a Jira issue via the MCP server.

## When a skill says "fetch the relevant ticket"

Use the MCP Jira `getIssue` tool with the issue key.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single parent issue with **child** issues as tickets.

- **Map**: a Jira Story labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. Create via `createIssue` with that label.
- **Child ticket**: a Jira Story/Task linked to the map via Jira's issue link `is child of`. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, assign to the driving dev.
- **Blocking**: Jira issue links with `blocks` / `is blocked by` relationship. Query blockers via `searchIssues` with JQL `issueLinkType = "is blocked by" AND issue = <key>`. A ticket is unblocked when every blocker is in a Done/Closed status.
- **Frontier query**: list the map's open children (JQL `"Epic Link" = <map-key> OR issueLinkType = "is child of" AND issue = <map-key>`), drop any with an open blocker or an assignee; first in list order wins.
- **Claim**: Assign the issue to the driving dev via `editIssue`.
- **Resolve**: `addComment` with the answer, then `transitionIssue` to Done/Closed, then append a context pointer (gist + link) to the map's Decisions-so-far.
