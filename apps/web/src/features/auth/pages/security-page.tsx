import { Shell } from "@/components/shell";
import { ActiveSessionsCard } from "@/features/auth/components/active-sessions-card";

export const SecurityPage = () => (
  <Shell variant="default">
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-bold text-2xl">Bảo mật tài khoản</h1>
        <p className="text-muted-foreground">
          Quản lý các thiết bị đã đăng nhập.
        </p>
      </header>

      <ActiveSessionsCard />
    </div>
  </Shell>
);
