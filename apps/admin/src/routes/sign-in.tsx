import { createFileRoute, redirect, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import { SignIn } from "@/features/auth/sign-in";
import { authClient } from "@/lib/auth-client";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

const SignInRouteComponent = () => {
  const { redirect: redirectTo } = useSearch({ from: "/sign-in" });
  return <SignIn redirectTo={redirectTo} />;
};

// oxlint-disable-next-line react-doctor/tanstack-start-route-property-order
export const Route = createFileRoute("/sign-in")({
  beforeLoad: async () => {
    try {
      const session = await authClient.getSession({
        query: { disableCookieCache: true },
      });
      if (session.data?.user && session.data.user.role === "ADMIN") {
        throw redirect({
          to: "/",
        });
      }
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        ("to" in error || "href" in error || "isRedirect" in error)
      ) {
        throw error;
      }
    }
  },
  component: SignInRouteComponent,
  validateSearch: searchSchema,
});
