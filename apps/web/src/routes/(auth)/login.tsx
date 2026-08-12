import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AuthPage } from "@/features/auth/pages/auth-page";

const authSearchSchema = z.object({
  googleError: z.enum(["not_registered"]).optional(),
  mode: z.enum(["sign-in", "sign-up"]).optional(),
  role: z.enum(["buyer", "seller"]).optional(),
});

export type AuthSearch = z.infer<typeof authSearchSchema>;

export const Route = createFileRoute("/(auth)/login")({
  component: AuthPage,
  validateSearch: authSearchSchema,
});
