import {
  WarningCircleIcon,
  ClipboardTextIcon,
  FolderIcon,
  GavelIcon,
  BankIcon,
  SquaresFourIcon,
  GearIcon,
  StorefrontIcon,
} from "@phosphor-icons/react";

import type { SidebarData } from "../types";

export const sidebarData: SidebarData = {
  navGroups: [
    {
      items: [
        { icon: SquaresFourIcon, title: "Tổng quan", url: "/" },
        {
          icon: ClipboardTextIcon,
          title: "Duyệt hồ sơ Seller",
          url: "/seller-applications",
        },
      ],
      title: "Tổng quan & Onboarding",
    },
    {
      items: [
        {
          icon: FolderIcon,
          title: "Danh mục & Chính sách",
          url: "/categories",
        },
        {
          icon: GavelIcon,
          title: "Moderation Listing",
          url: "/listings",
        },
        {
          icon: StorefrontIcon,
          title: "Quản lý Seller & Vi phạm",
          url: "/sellers",
        },
        {
          icon: WarningCircleIcon,
          title: "Hòa giải Tranh chấp",
          url: "/disputes",
        },
      ],
      title: "Quản trị & Rủi ro",
    },
    {
      items: [
        {
          icon: BankIcon,
          title: "Yêu cầu Rút tiền",
          url: "/withdrawals",
        },
      ],
      title: "Tài chính & Payout",
    },
    {
      items: [
        {
          icon: GearIcon,
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
