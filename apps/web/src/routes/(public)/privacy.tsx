import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/features/legal/pages/legal-page";

export const Route = createFileRoute("/(public)/privacy")({
  component: () => (
    <LegalPage
      title="Privacy"
      description="Thông tin xử lý dữ liệu khi bạn sử dụng Service Advisor."
    >
      <p>
        Văn bản và ảnh bạn chủ động gửi được xử lý bởi provider AI platform do
        Avin cấu hình (beta dùng Groq với Zero Data Retention đã xác minh) để
        xác định một Service Need, hỏi Playbook và tìm Listing SERVICE đang công
        khai. Visitor session hết hạn sau 24 giờ không hoạt động; phiên User tối
        đa 30 ngày.
      </p>
      <p>
        Advisory Attachments ở private storage riêng và bị xóa cùng session.
        Advisor không tự thêm Cart, không hoàn tất Checkout và không chuyển nội
        dung sang Seller. Không có nội dung hội thoại nào được dùng làm nhật ký
        vận hành; analytics chỉ giữ metadata tối thiểu, không giữ prompt,
        response, bytes ảnh hoặc signed URL.
      </p>
    </LegalPage>
  ),
});
