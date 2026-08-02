import { describe, expect, it } from "vitest";

import {
  getFirstIncompleteEditorStepIndex,
  isListingEditorStepLocked,
  LISTING_EDITOR_STEP_ORDER,
} from "./listing-editor-logic";
import type { ListingEditorStep } from "./listing-editor-logic";

const steps: ListingEditorStep[] = [
  { complete: true, step: "basics" },
  { complete: false, step: "media" },
  { complete: false, step: "warranty" },
];

describe("listing editor navigation helpers", () => {
  it("only includes implemented editor steps", () => {
    expect(LISTING_EDITOR_STEP_ORDER).toEqual(["basics", "media", "warranty"]);
  });

  it("opens an existing listing at the first incomplete step", () => {
    expect(getFirstIncompleteEditorStepIndex(steps)).toBe(1);
  });

  it("falls back to the final step when every requirement is complete", () => {
    expect(
      getFirstIncompleteEditorStepIndex(
        steps.map((item) => ({ ...item, complete: true }))
      )
    ).toBe(2);
  });

  it("locks later new listing steps until a draft exists", () => {
    expect(isListingEditorStepLocked(true, false, 1)).toBe(true);
    expect(isListingEditorStepLocked(false, true, 1)).toBe(false);
  });
});
