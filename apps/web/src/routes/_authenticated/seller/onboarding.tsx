import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { Shell } from "@/components/shell";
import { SellerOnboardingForm } from "@/features/seller/components/seller-onboarding-form";

const SellerOnboardingPage = () => (
  <Shell variant="default">
    <SellerOnboardingForm />
  </Shell>
);

export const Route = createFileRoute("/_authenticated/seller/onboarding")({
  beforeLoad: ({ context }) => {
    if (context.session?.data?.user.role === ACCOUNT_ROLE.BUYER) {
      throw redirect({ to: "/" });
    }
  },
  component: SellerOnboardingPage,
});
