# Keep the Admin App as an independent monorepo application

Avin will implement the Admin App as a separate `apps/admin` application rather than adding an `/admin` area to `apps/web`. This preserves a clear operator-facing boundary, allows the dashboard shell and deployment lifecycle to evolve independently from the buyer/seller web surface, and avoids coupling admin navigation and assets to the public marketplace; the trade-off is a second app entrypoint with shared packages and explicit auth/API integration.
