#!/usr/bin/env bun
import { db } from "@avin/db";

import { createListingImageStorage } from "../apps/server/src/uploads/storage";
import { runExternalRiskImport } from "../packages/api/src/protection/external-risk-import";
import type { ExternalRiskImportMode } from "../packages/api/src/protection/external-risk-import";

const args = Bun.argv.slice(2);
let mode: ExternalRiskImportMode = "APPLY";

for (const arg of args) {
  if (arg === "--preview" || arg === "--mode=PREVIEW") {
    mode = "PREVIEW";
  } else if (arg === "--full-reconcile" || arg === "--mode=FULL_RECONCILE") {
    mode = "FULL_RECONCILE";
  } else if (arg === "--apply" || arg === "--mode=APPLY") {
    mode = "APPLY";
  }
}

console.info(`[ChongScam Sync] Starting sync with mode: ${mode}...`);

const storageRuntime = createListingImageStorage();
if (storageRuntime) {
  console.info(
    "[ChongScam Sync] Storage is configured. Evidence files will be downloaded."
  );
} else {
  console.warn(
    "[ChongScam Sync] Storage credentials not found or incomplete. Evidence download will be skipped, but reports and identifiers will be synced."
  );
}

const startTime = Date.now();

try {
  const result = await runExternalRiskImport({
    actorUserId: null,
    database: db,
    mode,
    storage: storageRuntime?.objectStore,
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.info(`\n✅ [ChongScam Sync] Sync finished in ${durationSec}s:`);
  console.info(`- Trạng thái: ${result.status}`);
  console.info(`- Đã lấy từ ChongScam: ${result.fetchedCount}`);
  console.info(`- Bản ghi mới tạo: ${result.createdCount}`);
  console.info(`- Bản ghi cập nhật: ${result.updatedCount}`);
  console.info(`- File bằng chứng đã tải: ${result.evidenceDownloadedCount}`);
  console.info(`- Bản ghi đã ẩn: ${result.hiddenCount}`);
  console.info(`- Thất bại: ${result.failedCount}`);
  if (result.error) {
    console.warn(`- Lưu ý / Lỗi: ${result.error}`);
  }
} catch (error) {
  console.error(
    "❌ [ChongScam Sync] Sync failed:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
