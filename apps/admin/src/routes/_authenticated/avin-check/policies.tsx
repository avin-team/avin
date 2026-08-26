import { createFileRoute } from "@tanstack/react-router";

import { ProtectionPolicyPage } from "@/features/protection/pages/protection-policy-page";

export const Route = createFileRoute("/_authenticated/avin-check/policies")({
  component: ProtectionPolicyPage,
});
