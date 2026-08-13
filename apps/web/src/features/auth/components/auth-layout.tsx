import type { ReactNode } from "react";

import { Header } from "@/components/layout/header";

interface AuthLayoutProps {
  readonly children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="relative flex min-h-svh w-full flex-col bg-background text-foreground antialiased">
    <Header />
    <main className="mt-16 flex w-full flex-1 items-center justify-center px-4 py-12 sm:px-6 md:px-8">
      {children}
    </main>
  </div>
);
