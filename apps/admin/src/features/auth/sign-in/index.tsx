import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";

import { AuthLayout } from "../auth-layout";
import { UserAuthForm } from "./components/user-auth-form";

interface SignInProps {
  readonly redirectTo?: string;
}

export const SignIn = ({ redirectTo }: SignInProps) => (
  <AuthLayout>
    <Card className="w-full max-w-sm gap-4">
      <CardHeader>
        <CardTitle className="text-lg tracking-tight">
          Đăng nhập Admin
        </CardTitle>
        <CardDescription>
          Nhập email và mật khẩu tài khoản quản trị viên để truy cập bảng điều
          khiển.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UserAuthForm redirectTo={redirectTo} />
      </CardContent>
    </Card>
  </AuthLayout>
);
