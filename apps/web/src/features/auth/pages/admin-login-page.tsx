import { ACCOUNT_ROLE } from "@avin/auth/permissions";

import { RoleSignInPage } from "@/features/auth/pages/role-sign-in-page";

export const AdminLoginPage = () => (
  <RoleSignInPage
    description="Tài khoản Admin phải được provision và bật xác thực hai lớp."
    expectedRole={ACCOUNT_ROLE.ADMIN}
    redirectTo="/security"
    title="Đăng nhập Admin"
  />
);
