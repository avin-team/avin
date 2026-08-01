export type StoreSection =
  | "overview"
  | "profile"
  | "products"
  | "orders"
  | "complaints"
  | "discounts"
  | "finance"
  | "developer";

export interface MockProduct {
  category: string;
  name: string;
  price: string;
  progress: number;
  status: "Đang bán" | "Đang chuẩn bị";
}

export const MOCK_STORE_PROFILE = {
  description:
    "Mình cung cấp dịch vụ số và các sản phẩm kỹ thuật giúp bạn bắt đầu nhanh hơn.",
  name: "Studio của Ngọc",
  slug: "studio-cua-ngoc",
};

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    category: "Thiết kế",
    name: "Thiết kế logo tối giản cho thương hiệu",
    price: "300.000đ",
    progress: 80,
    status: "Đang chuẩn bị",
  },
  {
    category: "Tài khoản",
    name: "Thiết lập tài khoản quảng cáo",
    price: "500.000đ",
    progress: 35,
    status: "Đang chuẩn bị",
  },
  {
    category: "Khóa học",
    name: "Khóa học chạy quảng cáo cơ bản",
    price: "990.000đ",
    progress: 100,
    status: "Đang bán",
  },
];
