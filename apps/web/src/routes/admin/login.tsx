import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";

import SignInForm from "@/components/sign-in-form";

const AdminLoginPage = () => (
  <main className="mx-auto flex h-full w-full max-w-md items-center px-6">
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Đăng nhập Admin</CardTitle>
        <CardDescription>
          Tài khoản Admin phải được provision và bật xác thực hai lớp.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm expectedRole={ACCOUNT_ROLE.ADMIN} redirectTo="/security" />
      </CardContent>
    </Card>
  </main>
);

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});
