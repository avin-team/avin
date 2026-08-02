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

export interface ListingEditorServiceInput {
  id: string;
  key: string;
  label: string;
  type: "file" | "number" | "text" | "url";
}

export const areListingServiceInputsValid = (
  fields: readonly ListingEditorServiceInput[]
): boolean =>
  fields.length > 0 &&
  fields.every(
    (field) =>
      field.id.trim() &&
      field.key.trim() &&
      field.label.trim() &&
      ["file", "number", "text", "url"].includes(field.type)
  );

export const isListingEditorStepLocked = (
  isNew: boolean,
  hasDraft: boolean,
  canCreateDraft: boolean,
  stepIndex: number
): boolean => isNew && !hasDraft && !canCreateDraft && stepIndex > 0;

export const getFirstIncompleteEditorStepIndex = (
  items: ListingEditorStep[]
): number => {
  const firstIncompleteItem = items.find((item) => !item.complete);
  if (!firstIncompleteItem) {
    return LISTING_EDITOR_STEP_ORDER.length - 1;
  }

  return LISTING_EDITOR_STEP_ORDER.indexOf(firstIncompleteItem.step);
};
