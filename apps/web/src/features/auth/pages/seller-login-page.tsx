import { ACCOUNT_ROLE } from "@avin/auth/permissions";

import { RoleSignInPage } from "@/features/auth/pages/role-sign-in-page";

export const SellerLoginPage = () => (
  <RoleSignInPage
    description="Cổng riêng dành cho tài khoản Seller đã được Avin xác nhận."
    expectedRole={ACCOUNT_ROLE.SELLER}
    redirectTo="/"
    title="Đăng nhập Seller"
  />
);
