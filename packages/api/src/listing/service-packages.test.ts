import { describe, expect, it } from "vitest";

import {
  assertServicePackagesPublishable,
  getServicePackageSummaryPrice,
  parseServicePackageDraft,
  selectAvailableServicePackage,
  sortAvailableServicePackages,
  toLegacyServicePackageDraft,
} from "./service-packages";

const category = { warrantyBounds: { maxHours: 168, minHours: 24 } };

const packageRow = (overrides: Record<string, unknown> = {}) => ({
  description: "One delivered result",
  id: "package-1",
  name: "Standard",
  priceAmount: 100_000,
  processingTimeHours: 48,
  status: "AVAILABLE" as const,
  warrantyPolicy: {
    durationHours: 48,
    kind: "TIMED" as const,
  },
  ...overrides,
});

describe("Service package rules", () => {
  it("accepts an explicit no-warranty policy", () => {
    expect(
      parseServicePackageDraft(
        {
          description: "One result",
          name: "Basic",
          priceAmount: 50_000,
          processingTimeHours: 24,
          warrantyPolicy: { kind: "NO_WARRANTY" },
        },
        category
      )
    ).toMatchObject({ warrantyPolicy: { kind: "NO_WARRANTY" } });
  });

  it("requires one available package and unique names", () => {
    expect(() =>
      assertServicePackagesPublishable(
        [packageRow({ status: "UNAVAILABLE" })],
        category
      )
    ).toThrow("available package");

    expect(() =>
      assertServicePackagesPublishable(
        [packageRow(), packageRow({ id: "package-2", name: "standard" })],
        category
      )
    ).toThrow("names must be unique");
  });

  it("sorts package choices by price and requires a choice when tiered", () => {
    const packages = [
      packageRow({ id: "package-2", name: "Premium", priceAmount: 200_000 }),
      packageRow(),
    ];
    expect(
      sortAvailableServicePackages(packages).map((item) => item.id)
    ).toEqual(["package-1", "package-2"]);
    expect(getServicePackageSummaryPrice(packages)).toBe(100_000);
    expect(() => selectAvailableServicePackage(packages)).toThrow(
      "Choose a Service package"
    );
    expect(selectAvailableServicePackage(packages, "package-2").id).toBe(
      "package-2"
    );
  });

  it("migrates a legacy service without warranty into an explicit no-warranty package", () => {
    expect(
      toLegacyServicePackageDraft({
        description: "One result",
        priceAmount: 75_000,
        processingTimeHours: 24,
        title: "Legacy service",
        warrantyDurationHours: null,
      })
    ).toMatchObject({
      description: "One result",
      priceAmount: 75_000,
      warrantyPolicy: { kind: "NO_WARRANTY" },
    });
  });
});
