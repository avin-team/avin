import { createFileRoute } from "@tanstack/react-router";

import { Shell } from "@/components/shell";
import { SellerOnboardingForm } from "@/features/seller/components/seller-onboarding-form";

const SellerOnboardingPage = () => {
  return (
    <Shell variant="default">
      <SellerOnboardingForm />
    </Shell>
  );
};

export const Route = createFileRoute("/_authenticated/seller/onboarding")({
  component: SellerOnboardingPage,
});
