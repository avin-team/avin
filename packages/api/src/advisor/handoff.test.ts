import { describe, expect, it } from "vitest";

import {
  advisorHandoffConfirmationInputSchema,
  buildAdvisorySummary,
} from "./handoff";

const listing = {
  completedOrderCount: 3,
  id: "00000000-0000-4000-8000-000000000001",
  listingPath: "/listing/website-setup",
  priceAmount: 150_000,
  processingTimeHours: 24,
  ratingCount: 8,
  ratingScore: 4.8,
  reasons: ["Phù hợp nhu cầu setup", "Có Seller đã xác minh"],
  seller: { id: "seller-1", name: "Seller One" },
  servicePackage: {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Cơ bản",
    priceAmount: 150_000,
    processingTimeHours: 24,
    warrantyPolicy: { durationHours: 48, kind: "TIMED" },
  },
  slug: "website-setup",
  title: "Setup website cá nhân",
  warrantyPolicy: { durationHours: 48, kind: "TIMED" },
};

describe("Advisor handoff contract", () => {
  it("builds a reviewable summary from the selected recommendation", () => {
    const summary = buildAdvisorySummary({
      recommendation: {
        isAiGenerated: true,
        label: "Setup website",
        listings: [listing],
        subCategoryId: "00000000-0000-4000-8000-000000000003",
        subCategoryName: "Digital services",
      },
      serviceNeed: "  Cần setup account và website cá nhân  ",
    });

    expect(summary).toContain("Nhu cầu: Cần setup account và website cá nhân");
    expect(summary).toContain("Setup website cá nhân — Cơ bản, 150000 VND");
    expect(summary).toContain("Phù hợp nhu cầu setup");
  });

  it("keeps handoff attachment selection bounded", () => {
    const result = advisorHandoffConfirmationInputSchema.safeParse({
      attachmentIds: Array.from(
        { length: 6 },
        (_, index) =>
          `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
      ),
      handoffId: "00000000-0000-4000-8000-000000000004",
      includeSummaryInCheckout: false,
      sessionId: "00000000-0000-4000-8000-000000000005",
      summary: "Tóm tắt đã xác nhận",
    });

    expect(result.success).toBe(false);
  });
});
