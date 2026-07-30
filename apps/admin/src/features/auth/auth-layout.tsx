import { Logo } from "@/assets/logo";

interface AuthLayoutProps {
  readonly children: React.ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/20 p-4 sm:p-8">
    <div className="flex w-full flex-col items-center justify-center space-y-4">
      <div className="mb-2 flex items-center justify-center gap-2">
        <Logo className="size-8 text-primary" />
        <h1 className="font-semibold text-2xl tracking-tight">Avin Admin</h1>
      </div>
      {children}
    </div>
  </div>
);
