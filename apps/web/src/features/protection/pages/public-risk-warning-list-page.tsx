import { Badge } from "@avin/ui/components/badge";
import { ShieldWarningIcon } from "@phosphor-icons/react";

import { Shell } from "@/components/shell";

import { PublicRiskWarningCatalogue } from "../components/public-risk-warning-catalogue";

export const PublicRiskWarningListPage = () => (
  <Shell as="div" className="gap-8" variant="default">
    <section
      aria-labelledby="risk-warning-list-heading"
      className="rounded-[2rem] border border-primary/20 bg-linear-to-br from-primary/10 via-card to-card px-6 py-10 shadow-sm sm:px-10"
    >
      <Badge className="mb-4 gap-1.5" variant="outline">
        <ShieldWarningIcon aria-hidden="true" />
        Avin Check · Public warnings
      </Badge>
      <h1
        className="font-black text-4xl tracking-tight sm:text-5xl"
        id="risk-warning-list-heading"
      >
        Cảnh báo rủi ro đã được xem xét.
      </h1>
      <p className="mt-4 max-w-3xl text-muted-foreground leading-7">
        Chỉ warning ở trạng thái công khai mới xuất hiện tại đây. Giá trị định
        danh được che một phần; bằng chứng hiển thị là derivative đã được gỡ
        metadata, redaction PII và đóng watermark. Một số warning được nhập từ
        nguồn bên ngoài và luôn được gắn nhãn chưa xác minh độc lập.
      </p>
    </section>

    <PublicRiskWarningCatalogue />
  </Shell>
);
