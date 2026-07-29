-- Avin does not expose its business database through PostgREST. Browser tokens
-- are reserved for Supabase Realtime and Storage; all business reads and writes
-- continue to pass through the Avin API.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public
FROM
  anon,
  authenticated;

REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public
FROM
  anon,
  authenticated;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public
FROM
  PUBLIC,
  anon,
  authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL PRIVILEGES ON TABLES
FROM
  anon,
  authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL PRIVILEGES ON SEQUENCES
FROM
  anon,
  authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE EXECUTE ON FUNCTIONS
FROM
  PUBLIC,
  anon,
  authenticated;
