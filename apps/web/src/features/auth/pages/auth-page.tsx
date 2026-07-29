import { buttonVariants } from "@avin/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@avin/ui/components/tabs";
import { cn } from "@avin/ui/lib/utils";
import { Link } from "@tanstack/react-router";

import { AuthDivider } from "@/features/auth/components/auth-divider";
import { DecorIcon } from "@/features/auth/components/decor-icon";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const AuthPage = () => (
  <main className="relative flex h-full w-full items-center justify-center overflow-hidden px-6 md:px-8">
    <section
      className={cn(
        "relative flex w-full max-w-sm flex-col justify-between p-6 md:p-8",
        "dark:bg-[radial-gradient(50%_80%_at_20%_0%,--theme(--color-foreground/.1),transparent)]"
      )}
    >
      <div className="absolute -inset-y-6 -left-px w-px bg-border" />
      <div className="absolute -inset-y-6 -right-px w-px bg-border" />
      <div className="absolute -inset-x-6 -top-px h-px bg-border" />
      <div className="absolute -inset-x-6 -bottom-px h-px bg-border" />
      <DecorIcon position="top-left" />
      <DecorIcon position="bottom-right" />

      <div className="flex w-full max-w-sm animate-in flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="font-bold text-2xl tracking-wide">
            Chào mừng đến Avin
          </h1>
          <p className="text-base text-muted-foreground">
            Đăng nhập hoặc tạo tài khoản Buyer an toàn.
          </p>
        </header>

        <Tabs defaultValue="sign-in">
          <TabsList className="w-full">
            <TabsTrigger value="sign-in">Đăng nhập</TabsTrigger>
            <TabsTrigger value="sign-up">Đăng ký</TabsTrigger>
          </TabsList>
          <TabsContent value="sign-in">
            <SignInForm />
          </TabsContent>
          <TabsContent value="sign-up">
            <SignUpForm />
          </TabsContent>
        </Tabs>

        <AuthDivider>HOẶC</AuthDivider>
        <GoogleSignInButton />

        <p className="text-muted-foreground text-sm">
          Khi tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật
          của Avin.
        </p>
        <div className="flex flex-wrap justify-center gap-1">
          <Link
            className={buttonVariants({ variant: "link" })}
            to="/seller/login"
          >
            Cổng Seller
          </Link>
          <Link
            className={buttonVariants({ variant: "link" })}
            to="/admin/login"
          >
            Cổng Admin
          </Link>
        </div>
      </div>
    </section>
  </main>
);
