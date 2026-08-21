import {
  WarningCircleIcon,
  ClipboardTextIcon,
  FolderIcon,
  GavelIcon,
  BankIcon,
  ChartLineUpIcon,
  BellIcon,
  ShieldCheckIcon,
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
        { icon: BellIcon, title: "Thông báo Admin", url: "/notifications" },
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
          title: "Duyệt sản phẩm",
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
        {
          icon: ChartLineUpIcon,
          title: "Operations Console",
          url: "/operations",
        },
      ],
      title: "Tài chính & Payout",
    },
    {
      items: [
        {
          icon: ShieldCheckIcon,
          title: "Avin Check & Launch Gates",
          url: "/avin-check",
        },
        {
          icon: ShieldCheckIcon,
          title: "Đối soát Provider Bond",
          url: "/avin-check/bond",
        },
        {
          icon: ShieldCheckIcon,
          title: "Rút Provider Bond",
          url: "/avin-check/bond-withdrawals",
        },
        {
          icon: ShieldCheckIcon,
          title: "Policy & Reacceptance",
          url: "/avin-check/policies",
        },
        {
          icon: ShieldCheckIcon,
          title: "Support Review",
          url: "/avin-check/support-reviews",
        },
        {
          icon: ShieldCheckIcon,
          title: "Duyệt Provider",
          url: "/avin-check/providers",
        },
        {
          icon: ShieldCheckIcon,
          title: "Duyệt cập nhật profile",
          url: "/avin-check/provider-revisions",
        },
        {
          icon: ShieldCheckIcon,
          title: "Risk Moderator",
          url: "/avin-check/risk-reports",
        },
      ],
      title: "Bảo vệ giao dịch bên ngoài",
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
