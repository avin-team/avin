import { LISTING_IMAGE_MAX_COUNT } from "@avin/api/storage";
import * as z from "zod";

export const listingEditorFormSchema = z.object({
  categoryId: z.string(),
  description: z.string().max(10_000),
  images: z.array(z.string()).max(LISTING_IMAGE_MAX_COUNT),
  priceAmount: z.string(),
  processingTimeHours: z.string(),
  thumbnailUrl: z.string(),
  title: z.string().max(200),
  type: z.enum(["COURSE", "SERVICE"]),
  warrantyDurationHours: z.string(),
  warrantyTerms: z.string().max(10_000),
});
