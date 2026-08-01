import { createFileRoute } from "@tanstack/react-router";

import { ListingEditorPage } from "@/features/seller/pages/listing-editor-page";

export const Route = createFileRoute("/_authenticated/seller/listings/$id")({
  component: ListingEditorPage,
});
