import * as z from "zod";

const serviceInputFieldSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  required: z.boolean(),
  type: z.enum(["file", "number", "text", "url"]),
});

export const listingEditorFormSchema = z.object({
  categoryId: z.string(),
  description: z.string().max(10_000),
  images: z.array(z.string()),
  priceAmount: z.string(),
  processingTimeHours: z.string(),
  serviceInputFields: z.array(serviceInputFieldSchema),
  thumbnailUrl: z.string(),
  title: z.string().max(200),
  type: z.enum(["COURSE", "SERVICE"]),
  warrantyDurationHours: z.string(),
  warrantyTerms: z.string().max(10_000),
});
