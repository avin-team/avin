#!/usr/bin/env bun
import { db } from "@avin/db";

import { createListingImageStorage } from "../apps/server/src/uploads/storage";
import { runExternalRiskImport } from "../packages/api/src/protection/external-risk-import";
import type { ExternalRiskImportMode } from "../packages/api/src/protection/external-risk-import";

const args = Bun.argv.slice(2);
let mode: ExternalRiskImportMode = "APPLY";
let limit: number | undefined;
let maxPages: number | undefined;
let sourceReportId: string | undefined;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--help" || arg === "-h") {
    console.info(`Usage: bun run db:sync-chongscam [options]

Options:
  --preview           Chỉ kiểm tra, không lưu vào database hay tải ảnh
  --apply             Đồng bộ dữ liệu và tải bằng chứng (mặc định)
  --full-reconcile    Đồng bộ và ẩn các báo cáo không còn tồn tại trên nguồn
  --limit=<N>         Giới hạn số lượng báo cáo cần xử lý (vd: --limit=5)
  --max-pages=<N>     Giới hạn số trang cần tải từ ChongScam (1 trang = 100 báo cáo)
  --id=<id>           Đồng bộ một báo cáo cụ thể theo UUID trên ChongScam
  --help, -h          Hiển thị trợ giúp này
`);
    process.exit(0);
  } else if (arg === "--preview" || arg === "--mode=PREVIEW") {
    mode = "PREVIEW";
  } else if (arg === "--full-reconcile" || arg === "--mode=FULL_RECONCILE") {
    mode = "FULL_RECONCILE";
  } else if (arg === "--apply" || arg === "--mode=APPLY") {
    mode = "APPLY";
  } else if (arg.startsWith("--limit=")) {
    limit = Math.trunc(Number(arg.slice("--limit=".length)));
  } else if (arg === "--limit" && i + 1 < args.length) {
    i += 1;
    limit = Math.trunc(Number(args[i]));
  } else if (arg.startsWith("--max-pages=")) {
    maxPages = Math.trunc(Number(arg.slice("--max-pages=".length)));
  } else if (arg.startsWith("--pages=")) {
    maxPages = Math.trunc(Number(arg.slice("--pages=".length)));
  } else if (arg === "--max-pages" && i + 1 < args.length) {
    i += 1;
    maxPages = Math.trunc(Number(args[i]));
  } else if (arg.startsWith("--id=")) {
    sourceReportId = arg.slice("--id=".length);
  } else if (arg.startsWith("--report-id=")) {
    sourceReportId = arg.slice("--report-id=".length);
  } else if ((arg === "--id" || arg === "--report-id") && i + 1 < args.length) {
    i += 1;
    sourceReportId = args[i];
  }
}

console.info(
  `[ChongScam Sync] Starting sync (mode: ${mode}${
    sourceReportId ? `, reportId: ${sourceReportId}` : ""
  }${limit ? `, limit: ${limit}` : ""}${
    maxPages ? `, maxPages: ${maxPages}` : ""
  })...`
);

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
    limit,
    maxPages,
    mode,
    onProgress: (current, total, report) => {
      if (current === 1 || current % 10 === 0 || current === total) {
        const titleSnippet =
          report.title.length > 40
            ? `${report.title.slice(0, 40)}...`
            : report.title;
        console.info(
          `[ChongScam Sync] Tiến độ: ${current}/${total} - ${titleSnippet} (ảnh: ${report.evidenceFiles?.length ?? 0})`
        );
      }
    },
    sourceReportId,
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
