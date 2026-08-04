import { describe, expect, it } from "vitest";

import {
  getFirstIncompleteEditorStepIndex,
  getListingEditorStepOrder,
  getServiceInputFieldsForDraft,
  isListingEditorStepLocked,
  LISTING_EDITOR_STEP_ORDER,
  SERVICE_LISTING_EDITOR_STEP_ORDER,
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

  it("adds the package step only to the service editor flow", () => {
    expect(SERVICE_LISTING_EDITOR_STEP_ORDER).toEqual([
      "basics",
      "packages",
      "media",
    ]);
    expect(getListingEditorStepOrder("SERVICE")).toEqual(
      SERVICE_LISTING_EDITOR_STEP_ORDER
    );
    expect(getListingEditorStepOrder("COURSE")).toEqual(
      LISTING_EDITOR_STEP_ORDER
    );
  });

  it("opens an existing listing at the first incomplete step", () => {
    expect(getFirstIncompleteEditorStepIndex(steps)).toBe(1);
  });

  it("finds the package step in the service flow", () => {
    expect(
      getFirstIncompleteEditorStepIndex(
        [
          { complete: true, step: "basics" },
          { complete: false, step: "packages" },
          { complete: false, step: "media" },
          { complete: false, step: "warranty" },
        ],
        SERVICE_LISTING_EDITOR_STEP_ORDER
      )
    ).toBe(1);
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

  it("uses category buyer-input defaults for a new listing", () => {
    const categoryDefaults = [
      {
        id: "profile-link",
        key: "profile_link",
        label: "Link Profile",
        type: "url" as const,
      },
    ];

    expect(getServiceInputFieldsForDraft([], categoryDefaults)).toEqual(
      categoryDefaults
    );
    expect(
      getServiceInputFieldsForDraft(categoryDefaults.slice(0, 1), [
        ...categoryDefaults,
        {
          id: "email",
          key: "email",
          label: "Email",
          type: "text" as const,
        },
      ])
    ).toEqual(categoryDefaults.slice(0, 1));
  });
});
