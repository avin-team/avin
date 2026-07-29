import {
  AlertCircle,
  ClipboardCheck,
  FolderTree,
  Landmark,
  LayoutDashboard,
  Store,
} from "lucide-react";

import type { SidebarData } from "../types";

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: "Tổng quan & Onboarding",
      items: [
        { title: "Tổng quan", url: "/", icon: LayoutDashboard },
        {
          title: "Duyệt hồ sơ Seller",
          url: "/seller-applications",
          icon: ClipboardCheck,
        },
      ],
    },
    {
      title: "Quản trị & Rủi ro",
      items: [
        {
          title: "Danh mục & Chính sách",
          url: "/categories",
          icon: FolderTree,
        },
        {
          title: "Quản lý Seller & Vi phạm",
          url: "/sellers",
          icon: Store,
        },
        {
          title: "Hòa giải Tranh chấp",
          url: "/disputes",
          icon: AlertCircle,
        },
      ],
    },
    {
      title: "Tài chính & Payout",
      items: [
        {
          title: "Yêu cầu Rút tiền",
          url: "/withdrawals",
          icon: Landmark,
        },
      ],
    },
  ],
  teams: [],
  user: {
    avatar: "",
    email: "admin@avin.local",
    name: "Quản trị viên Avin",
  },
};
