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
  mainNav: [{ href: "/category", title: "Dịch vụ" }],
  name: "Avin",
};
