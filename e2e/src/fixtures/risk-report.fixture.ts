import { db } from "@avin/db";
import {
  protectionRiskEvidence,
  protectionRiskEvidenceDerivative,
  protectionRiskReport,
} from "@avin/db/schema/protection";
import { test as base } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

export const cleanupRiskReport = async (reportId: string): Promise<void> => {
  if (!reportId) {
    return;
  }

  try {
    // 1. Query evidence and derivatives for storage deletion
    const evidences = await db
      .select({
        id: protectionRiskEvidence.id,
        originalStorageKey: protectionRiskEvidence.originalStorageKey,
      })
      .from(protectionRiskEvidence)
      .where(eq(protectionRiskEvidence.reportId, reportId));

    const evidenceIds = evidences.map((evidence) => evidence.id);
    const derivatives =
      evidenceIds.length > 0
        ? await db
            .select({ storageKey: protectionRiskEvidenceDerivative.storageKey })
            .from(protectionRiskEvidenceDerivative)
            .where(
              inArray(protectionRiskEvidenceDerivative.evidenceId, evidenceIds)
            )
        : [];

    // 2. Delete storage files if Supabase is configured
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const deleteFromBucket = async (bucket: string, prefixes: string[]) => {
        if (prefixes.length === 0) {
          return;
        }

        try {
          await fetch(
            `${supabaseUrl.replace(/\/$/u, "")}/storage/v1/object/${bucket}`,
            {
              body: JSON.stringify({ prefixes }),
              headers: {
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                apikey: supabaseKey,
              },
              method: "DELETE",
            }
          );
        } catch (error) {
          console.warn(
            `[E2E Teardown] Failed to delete files from ${bucket}:`,
            error
          );
        }
      };

      await Promise.all([
        deleteFromBucket(
          "order-files",
          evidences.map((evidence) => evidence.originalStorageKey)
        ),
        deleteFromBucket(
          "public-media",
          derivatives.map((derivative) => derivative.storageKey)
        ),
      ]);
    }

    // 3. Delete report from database (cascade deletes all related identifiers, evidence, derivatives, history, etc.)
    await db
      .delete(protectionRiskReport)
      .where(eq(protectionRiskReport.id, reportId));
  } catch (error) {
    console.warn(
      `[E2E Teardown] Failed to clean up risk report ${reportId}:`,
      error
    );
  }
};

export interface RiskReportFixtures {
  /**
   * Register a risk report ID for guaranteed cleanup after the test completes,
   * even if the test throws before reaching a `finally` block.
   */
  withRiskReportCleanup: (reportId: string) => void;
}

export const test = base.extend<RiskReportFixtures>({
  // oxlint-disable-next-line no-empty-pattern -- Playwright fixture API requires object destructuring
  withRiskReportCleanup: async ({}, provide) => {
    const pendingReportIds: string[] = [];

    await provide((reportId: string) => {
      if (reportId) {
        pendingReportIds.push(reportId);
      }
    });

    // Teardown: runs after the test body, guaranteed even on failure or timeout.
    for (const reportId of pendingReportIds) {
      await cleanupRiskReport(reportId);
    }
  },
});

export { expect } from "@playwright/test";
