import { Outlet } from "@tanstack/react-router";

import { Footer } from "./footer";
import { Header } from "./header";

export const MainLayout = () => (
  <div className="relative flex min-h-screen flex-col">
    <Header />
    <main className="mt-16 flex-1">{Outlet ? <Outlet /> : null}</main>
    <Footer />
  </div>
);
