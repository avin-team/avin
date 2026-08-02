export const LISTING_EDITOR_STEP_ORDER = [
  "basics",
  "offer",
  "media",
  "inputs",
  "warranty",
] as const;

export type ListingEditorStepId = (typeof LISTING_EDITOR_STEP_ORDER)[number];

export interface ListingEditorStep {
  complete: boolean;
  step: ListingEditorStepId;
}

export const getFirstIncompleteEditorStepIndex = (
  items: ListingEditorStep[]
): number => {
  const firstIncompleteItem = items.find((item) => !item.complete);
  if (!firstIncompleteItem) {
    return LISTING_EDITOR_STEP_ORDER.length - 1;
  }

  return LISTING_EDITOR_STEP_ORDER.indexOf(firstIncompleteItem.step);
};
