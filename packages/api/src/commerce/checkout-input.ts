import { z } from "zod";

const checkoutItemInputSchema = z.object({
  contractFingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
  inputs: z.record(z.string(), z.unknown()).default({}),
  listingId: z.uuid(),
  packageId: z.uuid().nullable().optional(),
});

export const checkoutInputSchema = z
  .object({
    confirmMaterialChanges: z.boolean().default(false),
    idempotencyKey: z.string().trim().min(16).max(128),
    items: z.array(checkoutItemInputSchema).min(1).max(50),
  })
  .superRefine((input, context) => {
    const listingIds = new Set<string>();
    for (const [index, item] of input.items.entries()) {
      if (listingIds.has(item.listingId)) {
        context.addIssue({
          code: "custom",
          message: "Each Listing may appear only once in Checkout.",
          path: ["items", index, "listingId"],
        });
      }
      listingIds.add(item.listingId);
    }
  });

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
