import type { ReactNode } from "react";

import { ModeToggle } from "@/components/mode-toggle";

interface AuthLayoutProps {
  readonly children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="relative flex min-h-svh w-full flex-col justify-between overflow-y-auto bg-background text-foreground antialiased">
    <header className="absolute top-0 right-0 p-4 sm:p-6 z-10">
      <ModeToggle />
    </header>
    <div className="flex min-h-svh w-full items-center justify-center px-4 py-12 sm:px-6 md:px-8">
      {children}
    </div>
  </div>
);
