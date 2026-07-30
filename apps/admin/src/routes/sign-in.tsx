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

export const Route = createFileRoute("/sign-in")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    try {
      const session = await authClient.getSession();
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
});
