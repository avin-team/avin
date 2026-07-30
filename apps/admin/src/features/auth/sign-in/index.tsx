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
    <Card className="w-full max-w-[480px] border shadow-sm sm:max-w-[540px]">
      <CardHeader className="space-y-1.5 p-6 sm:p-8">
        <CardTitle className="font-bold text-2xl tracking-tight">
          Đăng nhập Admin
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Nhập email và mật khẩu tài khoản quản trị viên để truy cập bảng điều
          khiển.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0 sm:p-8 sm:pt-0">
        <UserAuthForm redirectTo={redirectTo} />
      </CardContent>
    </Card>
  </AuthLayout>
);
