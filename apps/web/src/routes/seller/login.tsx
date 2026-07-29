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

const SellerLoginPage = () => (
  <main className="mx-auto flex h-full w-full max-w-md items-center px-6">
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Đăng nhập Seller</CardTitle>
        <CardDescription>
          Cổng riêng dành cho tài khoản Seller đã được Avin xác nhận.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm expectedRole={ACCOUNT_ROLE.SELLER} redirectTo="/" />
      </CardContent>
    </Card>
  </main>
);

export const Route = createFileRoute("/seller/login")({
  component: SellerLoginPage,
});
