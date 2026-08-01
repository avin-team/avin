import { Shell } from "@/components/shell";
import { TwoFactorLoginForm } from "@/features/auth/components/two-factor-login-form";

export const TwoFactorPage = () => (
  <Shell variant="centered">
    <div className="mx-auto w-full max-w-sm">
      <TwoFactorLoginForm />
    </div>
  </Shell>
);
