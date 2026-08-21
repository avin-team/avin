import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";

import { providerAuthClient } from "../api/provider-auth-client";

export const ProviderLoginPage = () => (
  <section className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
    <header className="flex flex-col gap-2">
      <p className="font-medium text-primary text-sm">Avin Check</p>
      <h1 className="font-bold text-2xl tracking-tight">
        Đăng nhập không gian Đối tác Avin
      </h1>
      <p className="text-muted-foreground text-sm">
        Đây là tài khoản Provider riêng, không dùng chung quyền Buyer, Seller
        hoặc Admin.
      </p>
    </header>

    <GoogleSignInButton
      authClient={providerAuthClient}
      newUserRedirectTo="/provider"
      redirectTo="/provider"
    />

    <p className="text-muted-foreground text-xs">
      Hồ sơ riêng của Provider và hồ sơ công khai được phát hành là hai dữ liệu
      khác nhau.
    </p>
  </section>
);
