# Frontend Coding Rules

These rules apply to all code under `apps/web`. They extend the repository-level rules in the root `AGENTS.md`.

## Architecture

Organize business code by feature. A feature owns the UI, state, validation, workflows, and integrations that change together as one product capability.

```text
src/
├── features/
│   └── <feature>/
│       ├── api/
│       ├── components/
│       ├── guards/
│       ├── hooks/
│       ├── pages/
│       ├── schemas/
│       ├── store/
│       └── utils/
├── components/
├── hooks/
├── lib/
├── routes/
└── utils/
```

The folders inside a feature are optional. Create one only when the feature has code that belongs there. Do not create empty folders or placeholder files to make every feature look identical.

Use these ownership rules:

- Put business-specific code in `src/features/<feature>`.
- Put route-level compositions in the feature's `pages/` folder.
- Put reusable UI owned by one feature in that feature's `components/` folder.
- Keep app-shell code such as global providers, the header, theme controls, and the root loader outside features.
- Put genuinely cross-feature, business-agnostic UI primitives in `@avin/ui`.
- Keep application infrastructure in `src/lib` or `src/utils` only when it is not owned by a single feature.
- Do not move boilerplate into a feature merely to reduce the number of top-level files.

## Dependency Boundaries

- Routes and app-shell components may import the explicit page or component entry files that a feature exposes.
- Do not reach into another feature's internal hooks, schemas, store, or utils for convenience. Promote truly shared code to an appropriate shared module.
- Code inside a feature may depend on shared UI and application infrastructure. Shared modules must not depend on a feature.
- Avoid circular dependencies between feature folders.
- Do not add barrel files. Import the concrete file directly.
- Use named exports for pages, components, hooks, schemas, guards, and utils.
- Use the `@/` alias for app code and the existing `@avin/*` workspace package aliases. Do not introduce alternate aliases such as `@workspace/*`.

## Routes and Pages

TanStack Router files in `src/routes` are adapters, not feature implementations. A route file should contain only what routing requires:

- The route declaration and path configuration.
- Route-specific loader or `beforeLoad` wiring.
- Search parameter parsing when applicable.
- Rendering a page imported from a feature.

Move forms, mutations, validation, product workflows, and substantial JSX into the owning feature. When a cross-route rule is reused, implement it once as a feature-owned guard and call it from each route.

Never edit `src/routeTree.gen.ts` manually.

## Pages and Components

- A page composes sections for one route-level experience. Keep business logic in focused components, hooks, or utilities.
- Split a large component by cohesive behavior, not by arbitrary JSX size.
- Extract sections that own independent state, queries, mutations, or forms.
- Do not create a component for a small markup fragment that has no independent behavior or reuse value.
- Prefer explicit semantic names such as `ProductFilters` or `CheckoutForm` over generic names such as `Content` or `Section`.
- Keep feature-only icons and decorative components with their feature.

## Forms and Validation

Use TanStack Form for product forms and Zod for their validation contracts.

- Define related, reusable schemas in the feature's `schemas/` folder.
- Consolidate closely related schemas when that keeps shared constraints and messages consistent. Do not create one file for every field.
- Bind fields through `form.Field`.
- Derive invalid state from the field metadata and render errors with `FieldError` from `@avin/ui/components/field`.
- Set `aria-invalid` and preserve accessible labels and autocomplete attributes.
- Submit through `form.handleSubmit()` and prevent the browser's default form submission.
- Use `form.Subscribe` for submission state such as `canSubmit` and `isSubmitting`.
- Let TanStack Form own form submission state instead of duplicating it with `useState`.
- Prefer `async/await` in `onSubmit` when the workflow has sequential checks, cleanup, or redirects.
- Keep validation and user-facing messages in the language already used by the surrounding product UI.

Use existing shared inputs and primitives. Do not add a new shared UI primitive as an incidental part of a feature refactor.

## State Ownership

Choose state management based on the kind of state:

- Keep state local when only one component or a tightly coupled subtree needs it.
- Use TanStack Form for form values and submission state.
- Use TanStack Query for remote/server state.
- Use the owning SDK's reactive state when it is already the source of truth, rather than duplicating that state elsewhere.
- Introduce a feature-local Zustand store only when shared client state has become complex enough that local state and the existing owners are insufficient.

Do not mirror server or SDK state in Zustand. Do not create a `store/` folder until a real store is required.

Centralize query keys within the owning feature when multiple modules need them. Invalidate only query keys that correspond to real TanStack Query data; do not add no-op invalidations to imitate another codebase's pattern.

## API and Workflow Modules

- Keep a feature-specific SDK/client configuration in the feature's `api/` folder.
- Do not create one-to-one wrapper functions that merely rename an SDK method.
- Extract an application abstraction when it owns additional policy or a multi-step workflow, such as validation, redirect selection, cache invalidation, or cleanup.
- Keep shared navigation and policy decisions in named feature utilities instead of duplicating conditionals across pages.
- Handle expected API failures with clear user feedback. Preserve unexpected failure handling without swallowing errors silently.

## Refactoring and Verification

For structural migrations:

- Preserve existing product behavior and UI unless the task explicitly changes them.
- Delete the superseded files after all imports have moved. Do not leave compatibility re-exports or duplicate implementations.
- Avoid mixing unrelated boilerplate cleanup into a feature refactor.
- Review generated diffs for accidental route-tree edits.
- Run `bun x ultracite fix` on changed code, then `bun x ultracite check`.
- Run the web build and type-check through the `apps/web` package scripts.
- Smoke-test the affected user flows.
- Do not introduce a full frontend test harness incidentally. Add focused unit tests that work with the existing setup; plan UI test infrastructure as separate work.
