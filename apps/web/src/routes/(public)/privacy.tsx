import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/features/legal/pages/legal-page";

export const Route = createFileRoute("/(public)/privacy")({
  component: () => (
    <LegalPage
      title="Privacy"
      description="Thông tin xử lý dữ liệu khi bạn sử dụng Service Advisor."
    >
      <p>
        Nội dung văn bản Advisor dùng để xác định một Service Need, hỏi Playbook
        và tìm Listing SERVICE đang công khai. Visitor session hết hạn sau 24
        giờ không hoạt động; phiên User tối đa 30 ngày.
      </p>
      <p>
        Advisor không tự thêm Cart, không hoàn tất Checkout và không chuyển nội
        dung sang Seller. Không có nội dung hội thoại nào được dùng làm nhật ký
        vận hành.
      </p>
    </LegalPage>
  ),
});
