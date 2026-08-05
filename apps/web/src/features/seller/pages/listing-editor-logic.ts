export const LISTING_EDITOR_STEP_ORDER = [
  "basics",
  "media",
  "warranty",
] as const;

export const SERVICE_LISTING_EDITOR_STEP_ORDER = [
  "basics",
  "packages",
  "media",
] as const;

export type ListingEditorStepId =
  | (typeof LISTING_EDITOR_STEP_ORDER)[number]
  | (typeof SERVICE_LISTING_EDITOR_STEP_ORDER)[number];

export const getListingEditorStepOrder = (
  type: "" | "COURSE" | "SERVICE"
): readonly ListingEditorStepId[] =>
  type === "SERVICE"
    ? SERVICE_LISTING_EDITOR_STEP_ORDER
    : LISTING_EDITOR_STEP_ORDER;

export interface ListingEditorStep {
  complete: boolean;
  step: ListingEditorStepId;
}

export const isListingEditorStepLocked = (
  isNew: boolean,
  hasDraft: boolean,
  stepIndex: number
): boolean => isNew && !hasDraft && stepIndex > 0;

export const getFirstIncompleteEditorStepIndex = (
  items: ListingEditorStep[],
  stepOrder: readonly ListingEditorStepId[] = LISTING_EDITOR_STEP_ORDER
): number => {
  const firstIncompleteItem = items.find((item) => !item.complete);
  if (!firstIncompleteItem) {
    return stepOrder.length - 1;
  }

  return stepOrder.indexOf(firstIncompleteItem.step);
};
