import { createFileRoute } from "@tanstack/react-router";

import { SellerOnboardingForm } from "@/features/seller/components/seller-onboarding-form";

const SellerOnboardingPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <SellerOnboardingForm />
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/seller/onboarding")({
  component: SellerOnboardingPage,
});
