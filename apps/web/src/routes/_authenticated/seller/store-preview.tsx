import { createFileRoute } from "@tanstack/react-router";

import { StorePreviewPage } from "@/features/seller/pages/store-preview-page";

export const Route = createFileRoute("/_authenticated/seller/store-preview")({
  component: StorePreviewPage,
});
