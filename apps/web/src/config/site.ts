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
  description: "Build faster with our modern web platform.",
  mainNav: [
    { href: "/", title: "Home" },
    { href: "/category", title: "Categories" },
    { href: "/listings", title: "Marketplace" },
    { href: "/features", title: "Features" },
    { href: "/solutions", title: "Solutions" },
    { href: "/pricing", title: "Pricing" },
  ],
  name: "Acme Inc.",
};
