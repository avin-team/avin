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
  mainNav: [
    { href: "/category", title: "Dịch vụ" },
    { href: "/avin-check", title: "Avin Check" },
  ],
  name: "Avin",
  socialLinks: [
    {
      href: "https://www.facebook.com/vuduyhoanavin05",
      label: "Facebook",
    },
    {
      href: "https://www.tiktok.com/@todun2710",
      label: "TikTok",
    },
    { href: "https://x.com/vu_duy_hoan", label: "X" },
    {
      href: "https://www.threads.com/@vu.duy.hoan",
      label: "Threads",
    },
    {
      href: "https://www.instagram.com/vu.duy.hoan",
      label: "Instagram",
    },
    {
      href: "https://www.youtube.com/@vuduyhoan_avin05",
      label: "YouTube",
    },
  ],
};
