import { describe, expect, it } from "vitest";

import {
  createParentCategoryFormSchema,
  createSubCategoryFormSchema,
  editParentCategoryFormSchema,
  editSubCategoryFormSchema,
} from "./category-form-schema";

describe("category form schemas", () => {
  it("accepts a parent category with optional slug and description", () => {
    const result = createParentCategoryFormSchema.safeParse({
      description: "AI tools",
      name: " AI Tools ",
      slug: "ai-tools",
    });

    expect(result.success).toBe(true);
  });

  it("requires a parent category name", () => {
    const result = editParentCategoryFormSchema.safeParse({
      description: "",
      name: " ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects sub-category warranty values outside their bounds", () => {
    const result = createSubCategoryFormSchema.safeParse({
      commissionRate: "5",
      maxWarranty: "24",
      minWarranty: "72",
      name: "ChatGPT",
      slug: "chatgpt",
      warrantyHours: "72",
      warrantyTerms: "Bảo hành 1 đổi 1",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid sub-category numeric values", () => {
    const result = editSubCategoryFormSchema.safeParse({
      commissionRate: "5",
      maxWarranty: "720",
      minWarranty: "24",
      name: "ChatGPT",
      warrantyHours: "72",
      warrantyTerms: "Bảo hành 1 đổi 1",
    });

    expect(result.success).toBe(true);
  });
});
