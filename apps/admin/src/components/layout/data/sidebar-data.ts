import {
  ArrowClockwiseIcon,
  BankIcon,
  ChartLineUpIcon,
  ClipboardTextIcon,
  CoinsIcon,
  FileTextIcon,
  FolderIcon,
  GavelIcon,
  GearIcon,
  HandCoinsIcon,
  HeadsetIcon,
  PaperPlaneTiltIcon,
  ScrollIcon,
  ShieldCheckIcon,
  ShieldWarningIcon,
  SquaresFourIcon,
  StorefrontIcon,
  UserCheckIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

import type { SidebarData } from "../types";

export const sidebarData: SidebarData = {
  navGroups: [
    {
      items: [
        {
          icon: SquaresFourIcon,
          title: "Tổng quan",
          url: "/",
        },
        {
          icon: StorefrontIcon,
          items: [
            {
              icon: ClipboardTextIcon,
              title: "Duyệt hồ sơ",
              url: "/seller-applications",
            },
            {
              icon: StorefrontIcon,
              title: "Danh sách Seller",
              url: "/sellers",
            },
          ],
          title: "Quản lý Seller",
        },
        {
          icon: FolderIcon,
          items: [
            {
              icon: GavelIcon,
              title: "Duyệt sản phẩm",
              url: "/listings",
            },
            {
              icon: FolderIcon,
              title: "Danh mục",
              url: "/categories",
            },
          ],
          title: "Sản phẩm & Danh mục",
        },
        {
          icon: WarningCircleIcon,
          title: "Hòa giải Tranh chấp",
          url: "/disputes",
        },
        {
          icon: BankIcon,
          items: [
            {
              icon: BankIcon,
              title: "Yêu cầu Rút tiền",
              url: "/withdrawals",
            },
            {
              icon: ChartLineUpIcon,
              title: "Operations",
              url: "/operations",
            },
          ],
          title: "Tài chính & Payout",
        },
        {
          icon: ShieldCheckIcon,
          items: [
            {
              icon: ShieldCheckIcon,
              title: "Launch Gates",
              url: "/avin-check",
            },
            {
              icon: UserCheckIcon,
              title: "Duyệt Provider",
              url: "/avin-check/providers",
            },
            {
              icon: FileTextIcon,
              title: "Cập nhật Profile",
              url: "/avin-check/provider-revisions",
            },
            {
              icon: CoinsIcon,
              title: "Đối soát Bond",
              url: "/avin-check/bond",
            },
            {
              icon: HandCoinsIcon,
              title: "Rút tiền Bond",
              url: "/avin-check/bond-withdrawals",
            },
            {
              icon: ScrollIcon,
              title: "Policy & Reaccept",
              url: "/avin-check/policies",
            },
            {
              icon: PaperPlaneTiltIcon,
              title: "Invitation Pilot",
              url: "/avin-check/pilot",
            },
            {
              icon: HeadsetIcon,
              title: "Support Review",
              url: "/avin-check/support-reviews",
            },
            {
              icon: ShieldWarningIcon,
              title: "Risk Moderator",
              url: "/avin-check/risk-reports",
            },
            {
              icon: ArrowClockwiseIcon,
              title: "Import cảnh báo",
              url: "/avin-check/external-imports",
            },
          ],
          title: "Bảo vệ giao dịch",
        },
        {
          icon: GearIcon,
          title: "Bảo mật & 2FA",
          url: "/settings",
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
