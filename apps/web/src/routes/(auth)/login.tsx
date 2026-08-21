import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AuthPage } from "@/features/auth/pages/auth-page";

const authSearchSchema = z.object({
  error: z.string().optional(),
  error_description: z.string().optional(),
  redirectTo: z.string().optional(),
});

export type AuthSearch = z.infer<typeof authSearchSchema>;

export const Route = createFileRoute("/(auth)/login")({
  component: AuthPage,
  validateSearch: authSearchSchema,
});
