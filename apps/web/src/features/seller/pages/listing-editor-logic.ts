export const LISTING_EDITOR_STEP_ORDER = [
  "basics",
  "media",
  "warranty",
] as const;

export type ListingEditorStepId = (typeof LISTING_EDITOR_STEP_ORDER)[number];

export interface ListingEditorStep {
  complete: boolean;
  step: ListingEditorStepId;
}

export interface ListingEditorServiceInput {
  id: string;
  key: string;
  label: string;
  type: "file" | "number" | "text" | "url";
}

export const isListingEditorStepLocked = (
  isNew: boolean,
  hasDraft: boolean,
  stepIndex: number
): boolean => isNew && !hasDraft && stepIndex > 0;

export const getFirstIncompleteEditorStepIndex = (
  items: ListingEditorStep[]
): number => {
  const firstIncompleteItem = items.find((item) => !item.complete);
  if (!firstIncompleteItem) {
    return LISTING_EDITOR_STEP_ORDER.length - 1;
  }

  return LISTING_EDITOR_STEP_ORDER.indexOf(firstIncompleteItem.step);
};
