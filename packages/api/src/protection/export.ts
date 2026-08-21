import { z } from "zod";

import type { Context } from "../runtime/context";
import { listProtectionOperationsQueue } from "./operations";
import type { ProtectionOperationsQueueItem } from "./operations";

type Database = Context["db"];

export const protectionOperationsExportDatasets = [
  "PROVIDER_APPLICATIONS",
  "RISK_REPORTS",
  "PROVIDER_RESPONSES",
  "WITHDRAWALS",
] as const;

export type ProtectionOperationsExportDataset =
  (typeof protectionOperationsExportDatasets)[number];

export const protectionOperationsExportInputSchema = z.object({
  dataset: z.enum(protectionOperationsExportDatasets),
  purpose: z.string().trim().min(10).max(500),
});

export type ProtectionOperationsExportInput = z.infer<
  typeof protectionOperationsExportInputSchema
>;

const PROTECTION_OPERATIONS_EXPORT_FIELDS = [
  "id",
  "status",
  "startedAt",
  "slaDeadlineAt",
  "slaStatus",
  "ageHours",
] as const;

export const protectionOperationsDisclosureMatrix = {
  PROVIDER_APPLICATIONS: PROTECTION_OPERATIONS_EXPORT_FIELDS,
  PROVIDER_RESPONSES: PROTECTION_OPERATIONS_EXPORT_FIELDS,
  RISK_REPORTS: PROTECTION_OPERATIONS_EXPORT_FIELDS,
  WITHDRAWALS: PROTECTION_OPERATIONS_EXPORT_FIELDS,
} as const;

export type ProtectionOperationsExportField =
  (typeof protectionOperationsDisclosureMatrix)[ProtectionOperationsExportDataset][number];

export interface ProtectionOperationsExportResult {
  content: string;
  contentType: "text/csv;charset=utf-8";
  fields: readonly ProtectionOperationsExportField[];
  filename: string;
  rowCount: number;
  watermark: string;
}

const csvCell = (value: number | string): string =>
  `"${String(value).replaceAll('"', '""')}"`;

const toExportRow = (
  item: ProtectionOperationsQueueItem
): Record<ProtectionOperationsExportField, number | string> => ({
  ageHours: item.ageHours,
  id: item.id,
  slaDeadlineAt: item.slaDeadlineAt,
  slaStatus: item.slaStatus,
  startedAt: item.startedAt,
  status: item.status,
});

const safeWatermarkValue = (value: string): string =>
  value.replaceAll(/[\r\n]+/gu, " ").trim();

export const exportProtectionOperations = async ({
  actorUserId,
  database,
  input,
  now = new Date(),
}: {
  actorUserId: string;
  database: Database;
  input: ProtectionOperationsExportInput;
  now?: Date;
}): Promise<ProtectionOperationsExportResult> => {
  const parsedInput = protectionOperationsExportInputSchema.parse(input);
  const dashboard = await listProtectionOperationsQueue({ database, now });
  const items = dashboard.items.filter(
    (item) => item.queue === parsedInput.dataset
  );
  const fields = protectionOperationsDisclosureMatrix[parsedInput.dataset];
  const watermark = [
    "Avin Check controlled export",
    `actor=${safeWatermarkValue(actorUserId)}`,
    `dataset=${parsedInput.dataset}`,
    `generatedAt=${now.toISOString()}`,
    `purpose=${safeWatermarkValue(parsedInput.purpose)}`,
    "do-not-redistribute",
  ].join(" | ");
  const rows = items.map(toExportRow);
  const content = [
    `# ${watermark}`,
    "# Disclosure matrix: approved operational queue metadata only; no evidence, contact, payment, or response text",
    fields.map(csvCell).join(","),
    ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(",")),
    "",
  ].join("\n");
  const timestamp = now.toISOString().replaceAll(/[:.]/gu, "-");

  return {
    content,
    contentType: "text/csv;charset=utf-8",
    fields,
    filename: `avin-check-${parsedInput.dataset.toLowerCase()}-${timestamp}.csv`,
    rowCount: rows.length,
    watermark,
  };
};
