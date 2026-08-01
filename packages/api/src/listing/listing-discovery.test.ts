import { describe, expect, it } from "vitest";

import {
  getListingIdentifierCandidates,
  isListingPubliclyAvailable,
} from "./listing-discovery";

describe("public listing identifier lookup", () => {
  it("does not treat a listing slug as a UUID id", () => {
    const slug = "test-1cced1bc";

    expect(getListingIdentifierCandidates(slug)).toEqual({ slug });
  });

  it("keeps UUID lookup available for internal listing links", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";

    expect(getListingIdentifierCandidates(id)).toEqual({ id, slug: id });
  });
});

describe("public Listing visibility", () => {
  it("keeps only published Listings in active categories publicly available", () => {
    expect(isListingPubliclyAvailable("PUBLISHED", "ACTIVE", "ACTIVE")).toBe(
      true
    );
    expect(isListingPubliclyAvailable("HIDDEN", "ACTIVE", "ACTIVE")).toBe(
      false
    );
    expect(isListingPubliclyAvailable("ARCHIVED", "ACTIVE", "ACTIVE")).toBe(
      false
    );
    expect(isListingPubliclyAvailable("PUBLISHED", "HIDDEN", "ACTIVE")).toBe(
      false
    );
  });
});
