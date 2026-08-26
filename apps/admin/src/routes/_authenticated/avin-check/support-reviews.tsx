import { createFileRoute } from "@tanstack/react-router";

import { SupportReviewPage } from "@/features/protection/pages/support-review-page";

export const Route = createFileRoute(
  "/_authenticated/avin-check/support-reviews"
)({
  component: SupportReviewPage,
});
