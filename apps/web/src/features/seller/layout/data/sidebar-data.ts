import {
  ChartBarIcon,
  CodeIcon,
  BankIcon,
  SquaresFourIcon,
  PackageIcon,
  ShoppingBagIcon,
  TicketIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";

import type { SellerNavGroup } from "../types";

export const SELLER_NAV_GROUPS: SellerNavGroup[] = [
  {
    items: [{ icon: SquaresFourIcon, label: "Tổng quan", value: "overview" }],
    title: "Tổng quan",
  },
  {
    items: [
      {
        icon: UserCircleIcon,
        label: "Hồ sơ gian hàng",
        value: "profile",
      },
    ],
    title: "Thiết lập gian hàng",
  },
  {
    items: [
      { icon: PackageIcon, label: "Sản phẩm", value: "products" },
      { icon: ShoppingBagIcon, label: "Đơn hàng", value: "orders" },
      { icon: ChartBarIcon, label: "Khiếu nại", value: "complaints" },
      { icon: TicketIcon, label: "Mã giảm giá", value: "discounts" },
    ],
    title: "Bán hàng",
  },
  {
    items: [{ icon: BankIcon, label: "Tài chính", value: "finance" }],
    title: "Tài chính",
  },
  {
    items: [{ icon: CodeIcon, label: "Nhà phát triển", value: "developer" }],
    title: "Công cụ",
  },
];
