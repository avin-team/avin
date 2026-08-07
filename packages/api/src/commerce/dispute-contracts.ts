import { z } from "zod";

import {
  DISPUTE_EVIDENCE_CONTENT_TYPES,
  DISPUTE_EVIDENCE_MAX_BYTES,
  DISPUTE_EVIDENCE_MAX_COUNT,
} from "../runtime/storage";

export const DISPUTE_RESPONSE_WINDOW_HOURS = 48;
export const DISPUTE_EVIDENCE_DESCRIPTION_MAX_LENGTH = 1000;

export const disputeEvidenceInputSchema = z.object({
  byteSize: z.number().int().positive().max(DISPUTE_EVIDENCE_MAX_BYTES),
  contentType: z.enum(DISPUTE_EVIDENCE_CONTENT_TYPES),
  description: z
    .string()
    .trim()
    .min(1)
    .max(DISPUTE_EVIDENCE_DESCRIPTION_MAX_LENGTH),
  fileName: z.string().trim().min(1).max(255),
  storageKey: z.string().trim().min(1).max(512),
});

export type DisputeEvidenceInput = z.infer<typeof disputeEvidenceInputSchema>;

export const disputeEvidenceListSchema = z
  .array(disputeEvidenceInputSchema)
  .min(1, "Dispute requires at least one evidence file")
  .max(
    DISPUTE_EVIDENCE_MAX_COUNT,
    `A dispute can contain at most ${DISPUTE_EVIDENCE_MAX_COUNT} evidence files`
  );

export const sellerDisputeEvidenceListSchema = z
  .array(disputeEvidenceInputSchema)
  .min(1, "Seller evidence requires at least one file")
  .max(
    DISPUTE_EVIDENCE_MAX_COUNT,
    `A dispute can contain at most ${DISPUTE_EVIDENCE_MAX_COUNT} evidence files`
  );

export const getDisputeResponseDeadline = (openedAt: Date): Date =>
  new Date(openedAt.getTime() + DISPUTE_RESPONSE_WINDOW_HOURS * 60 * 60 * 1000);

export const addBusinessHours = (start: Date, hours: number): Date => {
  if (!Number.isInteger(hours) || hours < 0) {
    throw new Error("Business hours must be a non-negative integer");
  }
  const result = new Date(start);
  let remaining = hours;
  while (remaining > 0) {
    result.setUTCHours(result.getUTCHours() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }
  return result;
};

export const DISPUTE_ADMIN_SLA_HOURS = 48;
