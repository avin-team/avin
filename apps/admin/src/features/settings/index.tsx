import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";

import { TwoFactorSettingsCard } from "./components/two-factor-settings-card";

export const Settings = () => (
  <>
    <Header />
    <Main>
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="font-bold text-2xl tracking-tight">Cài đặt & Bảo mật</h1>
        <p className="text-muted-foreground text-sm">
          Quản lý cấu hình bảo mật tài khoản Quản trị viên và xác thực 2FA.
        </p>
      </div>

      <div className="max-w-2xl">
        <TwoFactorSettingsCard />
      </div>
    </Main>
  </>
);
