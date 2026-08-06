import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";

import { AuthLayout } from "../auth-layout";
import { TwoFactorLoginForm } from "./components/two-factor-login-form";

export const TwoFactor = () => (
  <AuthLayout>
    <Card className="w-full max-w-120 border shadow-sm sm:max-w-135">
      <CardHeader className="space-y-1.5 p-6 sm:p-8">
        <CardTitle className="font-bold text-2xl tracking-tight">
          Xác thực hai lớp (2FA)
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Nhập mã 6 số từ ứng dụng xác thực của bạn để hoàn tất đăng nhập vào
          trang Quản trị.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0 sm:p-8 sm:pt-0">
        <TwoFactorLoginForm />
      </CardContent>
    </Card>
  </AuthLayout>
);
