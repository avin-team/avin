import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/features/legal/pages/legal-page";

export const Route = createFileRoute("/(public)/terms")({
  component: () => (
    <LegalPage
      title="Terms"
      description="Các điều khoản marketplace và thông báo riêng cho Service Advisor."
    >
      <p>
        Service Advisor chỉ cung cấp gợi ý tham khảo. Listing detail, package
        selector, Cart và Checkout là nguồn chính thức cho mọi quyết định mua.
      </p>
      <p>
        Bạn không được gửi password, OTP, access token, thông tin thanh toán,
        giấy tờ định danh hoặc dữ liệu nhạy cảm vào Advisor.
      </p>
    </LegalPage>
  ),
});
