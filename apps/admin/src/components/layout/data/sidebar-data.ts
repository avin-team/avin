import {
  AlertCircle,
  ClipboardCheck,
  FolderTree,
  Landmark,
  LayoutDashboard,
  Settings,
  Store,
} from "lucide-react";

import type { SidebarData } from "../types";

export const sidebarData: SidebarData = {
  navGroups: [
    {
      items: [
        { icon: LayoutDashboard, title: "Tổng quan", url: "/" },
        {
          icon: ClipboardCheck,
          title: "Duyệt hồ sơ Seller",
          url: "/seller-applications",
        },
      ],
      title: "Tổng quan & Onboarding",
    },
    {
      items: [
        {
          icon: FolderTree,
          title: "Danh mục & Chính sách",
          url: "/categories",
        },
        {
          icon: Store,
          title: "Quản lý Seller & Vi phạm",
          url: "/sellers",
        },
        {
          icon: AlertCircle,
          title: "Hòa giải Tranh chấp",
          url: "/disputes",
        },
      ],
      title: "Quản trị & Rủi ro",
    },
    {
      items: [
        {
          icon: Landmark,
          title: "Yêu cầu Rút tiền",
          url: "/withdrawals",
        },
      ],
      title: "Tài chính & Payout",
    },
    {
      items: [
        {
          icon: Settings,
          title: "Bảo mật & 2FA",
          url: "/settings",
        },
      ],
      title: "Hệ thống",
    },
  ],
  teams: [],
  user: {
    avatar: "",
    email: "admin@avin.local",
    name: "Quản trị viên Avin",
  },
};
