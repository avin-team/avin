import { describe, expect, it } from "vitest";

import { getFirstIncompleteEditorStepIndex } from "./listing-editor-logic";
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
});
