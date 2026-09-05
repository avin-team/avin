import { ArrowLeftIcon, ShieldWarningIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { Shell } from "@/components/shell";

import { AvinCheckPageHeader } from "../components/avin-check-page-header";
import { PublicRiskWarningCatalogue } from "../components/public-risk-warning-catalogue";

export const PublicRiskWarningListPage = () => (
  <Shell as="div" className="gap-8" variant="default">
    <AvinCheckPageHeader
      actions={
        <Link
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-4xl border border-input px-3.5 font-medium text-sm transition hover:bg-accent hover:text-accent-foreground"
          to="/avin-check"
        >
          <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
          Avin Check
        </Link>
      }
      badge={
        <>
          <ShieldWarningIcon aria-hidden="true" />
          Avin Check · Public warnings
        </>
      }
      description="Chỉ warning ở trạng thái công khai mới xuất hiện tại đây. Giá trị định danh được che một phần; bằng chứng hiển thị là derivative đã được gỡ metadata, redaction PII và đóng watermark. Một số warning được nhập từ nguồn bên ngoài và luôn được gắn nhãn chưa xác minh độc lập."
      headingId="risk-warning-list-heading"
      title="Cảnh báo rủi ro đã được xem xét."
    />

    <PublicRiskWarningCatalogue />
  </Shell>
);
