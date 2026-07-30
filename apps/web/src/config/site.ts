export interface MainNavItem {
  href: string;
  title: string;
}

export interface SiteConfig {
  description: string;
  mainNav: MainNavItem[];
  name: string;
}

export const siteConfig: SiteConfig = {
  description: "Nền tảng mua bán dịch vụ số & sản phẩm hàng đầu.",
  mainNav: [
    { href: "/", title: "Trang chủ" },
    { href: "/category", title: "Danh mục" },
    { href: "/listings", title: "Chợ sản phẩm" },
    { href: "/features", title: "Tính năng" },
    { href: "/solutions", title: "Giải pháp" },
    { href: "/pricing", title: "Bảng giá" },
  ],
  name: "Avin",
};
