import { Outlet, createFileRoute } from "@tanstack/react-router";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

const PublicLayout = () => (
  <div className="relative flex min-h-screen flex-col">
    <Header />
    <main className="mt-16 flex-1">{Outlet ? <Outlet /> : null}</main>
    <Footer />
  </div>
);

export const Route = createFileRoute("/(public)")({
  component: PublicLayout,
});
