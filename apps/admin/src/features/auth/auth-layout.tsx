import { Logo } from "@/assets/logo";

interface AuthLayoutProps {
  readonly children: React.ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="container grid h-svh max-w-none items-center justify-center">
    <div className="mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8">
      <div className="mb-4 flex items-center justify-center">
        <Logo className="me-2" />
        <h1 className="font-medium text-xl">Avin Admin</h1>
      </div>
      {children}
    </div>
  </div>
);
