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
    <Card className="w-full max-w-md gap-4 sm:max-w-lg">
      <CardHeader>
        <CardTitle className="font-semibold text-xl tracking-tight">
          Đăng nhập Admin
        </CardTitle>
        <CardDescription className="text-sm">
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
