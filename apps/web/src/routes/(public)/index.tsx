import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

import { Shell } from "@/components/shell";
import { siteConfig } from "@/config/site";
import { orpc } from "@/utils/orpc";

const HomeComponent = () => {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());

  let statusText = "Disconnected";
  if (healthCheck.isLoading) {
    statusText = "Checking...";
  } else if (healthCheck.data) {
    statusText = "Connected";
  }

  return (
    <Shell variant="default">
      <div className="flex flex-col items-center py-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span>Next generation Web Platform</span>
        </div>

        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
          Build faster with{" "}
          <span className="text-primary">{siteConfig.name}</span>
        </h1>

        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          {siteConfig.description}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            className="inline-flex items-center space-x-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90"
            to="/login"
          >
            <span>Get Started Now</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            className="inline-flex items-center space-x-2 rounded-lg border border-border bg-background px-6 py-3 font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
            to="/"
          >
            <span>Explore Platform Features</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <section className="rounded-xl border border-border p-6 shadow-xs backdrop-blur-xs">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">API Connection</h2>
            <div
              className={`h-2.5 w-2.5 rounded-full ${healthCheck.data ? "bg-primary animate-pulse" : "bg-destructive"}`}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {statusText}
            </span>
          </div>
        </section>

        <section className="rounded-xl border border-border p-6 shadow-xs backdrop-blur-xs">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              Type-Safe Architecture
            </h2>
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            End-to-end type safety using oRPC, TanStack Router and React Query.
          </p>
        </section>

        <section className="rounded-xl border border-border p-6 shadow-xs backdrop-blur-xs">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Ultracite Clean</h2>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Enforced zero-config code standards and modern styling tokens.
          </p>
        </section>
      </div>
    </Shell>
  );
};

export const Route = createFileRoute("/(public)/")({
  component: HomeComponent,
});
