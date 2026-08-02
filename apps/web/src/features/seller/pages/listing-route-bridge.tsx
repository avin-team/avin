import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const ListingRouteBridge = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLegacyListingWorkspace = location.pathname === "/seller/listings";

  useEffect(() => {
    if (!isLegacyListingWorkspace) {
      return;
    }

    void navigate({
      search: { section: "products" },
      to: "/seller/store",
    });
  }, [isLegacyListingWorkspace, navigate]);

  if (isLegacyListingWorkspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-muted-foreground">
        Đang chuyển tới quản lý sản phẩm...
      </div>
    );
  }

  return <Outlet />;
};
