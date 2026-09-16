---
name: open-code-review
description: "Performs AI-powered code review on Git changes using Alibaba's `ocr` CLI. Use when the user asks to review code, review staged/unstaged changes, review a PR/branch, inspect issues against CODING_STANDARDS.md, or run an automated quality audit before committing."
---

# Open Code Review Skill

Use Alibaba's Open Code Review (`ocr`) CLI to review code changes against project-specific standards (`.opencodereview/rule.json`) and system security/quality rules.

## Workflow

### 1. Gather Context & Intent

Identify what needs to be reviewed:

- **Working copy changes** (staged + unstaged): Default workspace mode
- **Branch / PR comparison**: Review against `main` or another target
- **Single commit**: Review specific SHA

Extract concise business context or ticket requirement (e.g. from task description or Jira issue) to pass via `--background`.

### 2. Execute Review

Run the `ocr review` command with `--audience agent` to suppress UI animations and receive clean structured output:

```bash
# Review working copy changes (workspace mode):
ocr review --audience agent -b "Context description" --output /tmp/ocr_review.txt

# Review branch against main:
ocr review --audience agent -b "Context description" --from origin/main --to HEAD --output /tmp/ocr_review.txt

# Review a single commit:
ocr review --audience agent -c <commit-sha> --output /tmp/ocr_review.txt
```

> **Note**: Always output to a file (e.g. `/tmp/ocr_review.txt`) and view the file completely using `view_file` to prevent output truncation on large reviews.

### 3. Analyze Findings

The findings are grouped by severity (`critical`, `high`, `medium`, `low`) and category (`bug`, `security`, `performance`, `maintainability`):

- Pay primary attention to **`critical`**, **`high`**, and **`medium`** issues.
- Check against [`CODING_STANDARDS.md`](CODING_STANDARDS.md) for project-specific rules (oRPC bridge, TanStack Form/Query, Better Auth, Drizzle ORM, Vitest boundaries).
- Filter out trivial nitpicks (`low`).

### 4. Apply Fixes (If Requested)

If the user asked to "review and fix":

1. Apply fixes directly using `replace_file_content` for safe, deterministic corrections.
2. For architectural concerns or ambiguous requirements, clarify with the user.
3. Run `bun run check` (Ultracite) and `bun run check-types` after applying fixes to verify consistency.
