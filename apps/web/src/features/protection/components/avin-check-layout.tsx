import { Outlet } from "@tanstack/react-router";

import { AvinCheckFloatingDock } from "./avin-check-floating-dock";

export const AvinCheckLayout = () => (
  <>
    <div className="pb-24 md:pb-28">
      <Outlet />
    </div>
    <AvinCheckFloatingDock />
  </>
);
