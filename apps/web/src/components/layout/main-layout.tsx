import { Outlet, useMatch } from "@tanstack/react-router";

import { Footer } from "./footer";
import { Header } from "./header";

export const MainLayout = () => {
  const isChat = useMatch({ from: "/_authenticated/chat", shouldThrow: false });

  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
      <main className="mt-16 flex-1">{Outlet ? <Outlet /> : null}</main>
      {!isChat && <Footer />}
    </div>
  );
};
