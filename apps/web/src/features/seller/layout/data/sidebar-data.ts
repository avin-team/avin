import {
  BarChart3,
  Code2,
  ImageIcon,
  Landmark,
  LayoutDashboard,
  Package,
  ShoppingBag,
  TicketPercent,
  UserRound,
  Wallet,
} from "lucide-react";

import type { SellerNavGroup } from "../types";

export const SELLER_NAV_GROUPS: SellerNavGroup[] = [
  {
    items: [{ icon: LayoutDashboard, label: "Tổng quan", value: "overview" }],
    title: "Tổng quan",
  },
  {
    items: [
      {
        icon: UserRound,
        label: "Hồ sơ gian hàng",
        needsAttention: true,
        value: "profile",
      },
      { icon: ImageIcon, label: "Hình ảnh & Banner", value: "images" },
      { icon: Wallet, label: "Thanh toán", value: "payments" },
    ],
    title: "Thiết lập gian hàng",
  },
  {
    items: [
      { icon: Package, label: "Sản phẩm", value: "products" },
      { icon: ShoppingBag, label: "Đơn hàng", value: "orders" },
      { icon: BarChart3, label: "Khiếu nại", value: "complaints" },
      { icon: TicketPercent, label: "Mã giảm giá", value: "discounts" },
    ],
    title: "Bán hàng",
  },
  {
    items: [{ icon: Landmark, label: "Tài chính", value: "finance" }],
    title: "Tài chính",
  },
  {
    items: [{ icon: Code2, label: "Nhà phát triển", value: "developer" }],
    title: "Nhà phát triển",
  },
];
