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
    { href: "/features", title: "Features" },
    { href: "/solutions", title: "Solutions" },
    { href: "/pricing", title: "Pricing" },
    { href: "/resources", title: "Resources" },
    { href: "/contact", title: "Contact" },
  ],
  name: "Acme Inc.",
};
