# Coding Standards

Oxlint + Oxfmt (via `bun x ultracite fix`) handles formatting and most lint rules. This document covers what tooling cannot enforce: architectural conventions, common pitfalls, and decisions specific to this codebase.

## Frontend: Vite + TanStack

Both apps are **Vite 8 SPAs** with React 19. There is no Next.js, no SSR, no Server Components. Do not suggest `next/image`, `next/head`, `getServerSideProps`, or any Next.js API.

---

### Data fetching: oRPC + TanStack Query

Use the `orpc` bridge from `@orpc/tanstack-query` for all server data. Do not write raw `fetch` calls — they bypass type safety, error handling, and cache invalidation.

```typescript
// GOOD — type-safe, cached, invalidatable
const cartQuery = useQuery(orpc.commerce.cart.get.queryOptions());

const mutation = useMutation({
  ...orpc.commerce.cart.selectPackage.mutationOptions(),
  onSuccess: async () => {
    await queryClient.invalidateQueries({
      queryKey: orpc.commerce.cart.get.queryOptions().queryKey,
    });
  },
});

// BAD — loses types, no cache integration
const data = await fetch("/rpc/commerce.cart.get").then((r) => r.json());
```

For reusable query options, export a function that wraps `orpc.*.queryOptions()`:

```typescript
export const walletSummaryQueryOptions = () =>
  orpc.wallet.getSummary.queryOptions();
```

---

### Forms: TanStack Form + Zod

Use `@tanstack/react-form` with a Zod schema in `validators.onSubmit`. Use `form.Subscribe` with a `selector` to subscribe to only the fields you need — this avoids re-rendering the entire form on every keystroke.

```typescript
<form.Subscribe
  selector={(state) => ({
    canSubmit: state.canSubmit,
    isSubmitting: state.isSubmitting,
  })}
>
  {({ canSubmit, isSubmitting }) => (
    <Button disabled={!canSubmit || isSubmitting} type="submit">
      {isSubmitting && <Spinner data-icon="inline-start" />}
      Đăng nhập
    </Button>
  )}
</form.Subscribe>
```

---

### State management

- **Server state**: TanStack Query (the primary state management for both apps)
- **URL state**: TanStack Router search params validated with Zod (pagination, filters, modal open/close)
- **Client-only state**: React Context with cookie persistence (`apps/admin/src/context/layout-provider.tsx` for sidebar state). Zustand is installed in admin but currently unused — prefer Router search params or React Context before reaching for Zustand.

Do not use Redux, Jotai, or Recoil.

---

### Error feedback

`QueryCache.onError` in `apps/web/src/utils/orpc.ts` already shows a Sonner toast with a retry button for every failed query. Do not add per-component error toasts for query failures — they will double up. Only add custom error handling when the UX needs something different from the default toast.

---

## File Uploads

File uploads use `@better-upload/server` (backend route handler) and `@better-upload/client` (React hook). The storage backend is Supabase S3-compatible storage. Do not write custom `fetch`-based upload logic.

```typescript
// Backend: define a route with schema, auth check, and storage key generation
export const uploadRouter = {
  [LISTING_IMAGE_UPLOAD_ROUTE]: route({
    clientMetadataSchema: listingImageClientMetadataSchema,
    fileTypes: [...LISTING_IMAGE_CONTENT_TYPES],
    maxFileSize: LISTING_IMAGE_MAX_BYTES,
    onBeforeUpload: async ({ req }) => {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) throw new RejectUpload("Sign in before uploading");
      // ...
    },
  }),
};

// Frontend: use the hook
const { upload, isUploading } = useUploadFiles({
  route: LISTING_IMAGE_UPLOAD_ROUTE,
  api: `${serverURL}/api/upload`,
});
```

---

## Testing

### Core Principle

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't break unless behavior changed.

### Good Tests

Integration-style tests that exercise real code paths through public APIs. They describe what the system does, not how.

```typescript
// GOOD: Tests observable behavior through the public interface
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

- Test behavior users/callers care about
- Use the public API only
- Survive internal refactors
- One logical assertion per test

### Bad Tests

```typescript
// BAD: Mocks internal collaborator, tests HOW not WHAT
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});

// BAD: Bypasses the interface to verify via database
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// BAD: Test restates the implementation — the function IS the spec
test("pitchHref includes from param", () => {
  expect(pitchHref("abc")).toBe("/pitches/abc?from=deliverables");
});
```

**Red flags:**

- Mocking internal collaborators (your own classes/modules)
- Testing private methods
- Asserting on call counts/order of internal calls
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Verifying through external means (e.g. querying a DB) instead of through the interface
- Testing a trivial function (one-liner, simple mapping, string concatenation) where the test just mirrors the code — these tests add no confidence and break on any refactor
- Thin delegation tests for route handlers — when a route's only job is to parse input and call a service method, testing that it "delegates correctly" by mocking the service duplicates the route code in the test. The real behavior lives in the service; test that instead.

### Mocking

Mock at **system boundaries** only:

- External APIs (payment, email, etc.)
- Time/randomness
- File system or databases when a real instance isn't practical

**Never mock your own classes/modules or internal collaborators.** If something is hard to test without mocking internals, redesign the interface.

Prefer SDK-style interfaces over generic fetchers at boundaries — each function is independently mockable with a single return shape, no conditional logic in test setup.

### TDD Workflow: Vertical Slices

Do NOT write all tests first, then all implementation. That produces tests that verify imagined behavior and are insensitive to real changes.

Correct approach — one test, one implementation, repeat:

```
RED→GREEN: test1→impl1
RED→GREEN: test2→impl2
RED→GREEN: test3→impl3
```

Each test responds to what you learned from the previous cycle. Never refactor while RED — get to GREEN first.

---

## Interface Design

### Deep Modules

Prefer deep modules: small interface, deep implementation. A few methods with simple params hiding complex logic behind them.

Avoid shallow modules: large interface with many methods that just pass through to thin implementation. When designing, ask: can I reduce the number of methods? Can I simplify the parameters? Can I hide more complexity inside?

### Design for Testability

1. **Accept dependencies, don't create them** — pass external dependencies in rather than constructing them internally.
2. **Return results, don't produce side effects** — a function that returns a value is easier to test than one that mutates state.
3. **Small surface area** — fewer methods = fewer tests needed, fewer params = simpler test setup.
