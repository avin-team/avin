import { describe, expect, it } from "vitest";

import {
  areListingServiceInputsValid,
  getFirstIncompleteEditorStepIndex,
  isListingEditorStepLocked,
} from "./listing-editor-logic";
import type { ListingEditorStep } from "./listing-editor-logic";

const steps: ListingEditorStep[] = [
  { complete: true, step: "basics" },
  { complete: false, step: "offer" },
  { complete: true, step: "media" },
  { complete: false, step: "inputs" },
  { complete: false, step: "warranty" },
];

describe("listing editor navigation helpers", () => {
  it("opens an existing listing at the first incomplete step", () => {
    expect(getFirstIncompleteEditorStepIndex(steps)).toBe(1);
  });

  it("falls back to the final step when every requirement is complete", () => {
    expect(
      getFirstIncompleteEditorStepIndex(
        steps.map((item) => ({ ...item, complete: true }))
      )
    ).toBe(4);
  });

  it("does not mark an empty buyer-input list as complete", () => {
    expect(areListingServiceInputsValid([])).toBe(false);
    expect(
      areListingServiceInputsValid([
        {
          id: "field-1",
          key: "profile_link",
          label: "Đường dẫn trang cá nhân",
          type: "url",
        },
      ])
    ).toBe(true);
  });

  it("unlocks new listing steps after the basics can create a draft", () => {
    expect(isListingEditorStepLocked(true, false, false, 1)).toBe(true);
    expect(isListingEditorStepLocked(true, false, true, 1)).toBe(false);
    expect(isListingEditorStepLocked(false, true, false, 1)).toBe(false);
  });
});
