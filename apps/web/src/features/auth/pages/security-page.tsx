import { ActiveSessionsCard } from "@/features/auth/components/active-sessions-card";
import { TwoFactorSettingsCard } from "@/features/auth/components/two-factor-settings-card";

export const SecurityPage = () => (
  <main className="container mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
    <header className="flex flex-col gap-1">
      <h1 className="font-bold text-2xl">Bảo mật tài khoản</h1>
      <p className="text-muted-foreground">
        Quản lý thiết bị đăng nhập và xác thực hai lớp.
      </p>
    </header>

    <ActiveSessionsCard />
    <TwoFactorSettingsCard />
  </main>
);
