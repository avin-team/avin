# Supabase project configuration

This directory configures the hosted `avin` Supabase project (`gyvlawumcrymfsfoisgr`). It does not define a local Supabase development stack. Supabase CLI link state is intentionally ignored, so link each fresh clone:

```sh
supabase login
supabase link --project-ref gyvlawumcrymfsfoisgr
```

Drizzle remains the only database migration authority. Generate and run migrations from `packages/db`:

```sh
bun run db:generate
bun run db:migrate
```

The application uses the Supavisor session-pooler URL in `DATABASE_URL`. Drizzle Kit uses the direct PostgreSQL URL in `DATABASE_DIRECT_URL`.

Supabase Auth signup is disabled because Better Auth owns authentication. Avin exchanges a valid Buyer or Seller Better Auth session for a ten-minute ES256 JWT used only to authenticate direct Supabase Realtime connections. Generic Admin token issuance stays disabled until access can be scoped to an open Dispute, protected by 2FA, and audited. Storage transfers use signed URLs issued by the Avin API instead of this JWT.

## Hosted project bootstrap

Complete these steps for a replacement project or fresh environment:

1. In the Supabase dashboard, disable new-user signup under Auth settings. Verify both project-level and email-provider signup remain disabled.
2. Generate an ES256/P-256 signing JWK in a secure environment. Import the signing key under Auth JWT Keys, rotate it to current, and verify its assigned `kid` appears in the project's public JWKS endpoint.
3. Store the complete private JWK, including the assigned `kid`, only as the server secret `SUPABASE_JWT_PRIVATE_JWK`. Never expose it through a `VITE_` variable or commit it.
4. Put the project URL, publishable key, server secret key, Supavisor session-pooler URL, and direct PostgreSQL URL in the server's ignored `.env` file or the deployment secret manager. The web app receives only the project URL and publishable key.
5. Run `bun run db:migrate` from `packages/db`. This provisions the foundation buckets and closes the `public` schema to PostgREST browser roles.

After bootstrap, verify:

- a minted Buyer or Seller JWT is accepted by Supabase's JWT verifier for Realtime;
- the same JWT receives `403` when requesting a Better Auth table through PostgREST;
- `anon` and `authenticated` have no privileges on `public` tables or sequences;
- `public-media` is public, while `order-files` and `dispute-evidence` are private;
- anonymous uploads to every managed bucket are denied.

The `0001_supabase_foundation` Drizzle migration provisions:

- `public-media`: public reads, with writes performed through server-authorized upload flows.
- `order-files`: private and deny-by-default until Order membership policies exist.
- `dispute-evidence`: private and deny-by-default until Dispute membership policies exist.

The `0002_lock_down_public_api` migration removes `anon` and `authenticated` access to current and future `public` tables, sequences, and functions. This keeps PostgREST closed to browser tokens; grant only the narrow privileges required by a later, explicitly reviewed direct-data feature.
