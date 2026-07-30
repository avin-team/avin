export interface MainNavItem {
  href: string;
  title: string;
}

export interface SocialLink {
  href: string;
  label: string;
}

export interface SiteConfig {
  description: string;
  mainNav: MainNavItem[];
  name: string;
  socialLinks: SocialLink[];
}

export const siteConfig: SiteConfig = {
  description: "Nền tảng mua bán dịch vụ số & sản phẩm hàng đầu.",
  mainNav: [{ href: "/category", title: "Dịch vụ" }],
  name: "Avin",
  socialLinks: [
    { href: "#", label: "Facebook" },
    { href: "#", label: "YouTube" },
    { href: "#", label: "TikTok" },
    { href: "#", label: "Instagram" },
    { href: "#", label: "X" },
  ],
};
