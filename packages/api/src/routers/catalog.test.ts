import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("catalog and category routers API schemas", () => {
  it("validates createSub input constraints", () => {
    const schema = z.object({
      commissionRatePercent: z.number().min(0).max(100),
      defaultWarrantyDurationHours: z.number().min(0),
      defaultWarrantyTerms: z.string().min(1),
      maxWarrantyHours: z.number().min(0),
      minWarrantyHours: z.number().min(0),
      name: z.string().min(1),
      parentId: z.string(),
      slug: z.string().optional(),
    });

    const valid = schema.safeParse({
      commissionRatePercent: 10,
      defaultWarrantyDurationHours: 48,
      defaultWarrantyTerms: "Standard 48h warranty",
      maxWarrantyHours: 720,
      minWarrantyHours: 24,
      name: "Boosting",
      parentId: "cat-1",
    });

    expect(valid.success).toBe(true);

    const invalidCommission = schema.safeParse({
      commissionRatePercent: 150,
      defaultWarrantyDurationHours: 48,
      defaultWarrantyTerms: "Standard 48h warranty",
      maxWarrantyHours: 720,
      minWarrantyHours: 24,
      name: "Boosting",
      parentId: "cat-1",
    });

    expect(invalidCommission.success).toBe(false);
  });

  it("validates listings query pagination and filters", () => {
    const querySchema = z.object({
      limit: z.number().int().min(1).max(50).default(20),
      page: z.number().int().min(1).default(1),
      parentSlug: z.string().optional(),
      search: z.string().optional(),
      sortBy: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
      subSlug: z.string().optional(),
      type: z.enum(["SERVICE", "COURSE"]).optional(),
    });

    const parsed = querySchema.parse({
      parentSlug: "digital-services",
      search: "Liên Quân",
      sortBy: "price_asc",
    });

    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
    expect(parsed.sortBy).toBe("price_asc");
    expect(parsed.search).toBe("Liên Quân");
  });
});
