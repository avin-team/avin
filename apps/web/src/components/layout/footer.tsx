import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
} from "@/components/icons/social-icons";
import { siteConfig } from "@/config/site";

const socialIconMap: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  Facebook: FacebookIcon,
  Instagram: InstagramIcon,
  TikTok: TikTokIcon,
  X: XIcon,
  YouTube: YouTubeIcon,
};

export const Footer = () => (
  <footer className="border-t border-border/50 bg-background/50 backdrop-blur-xs">
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Zap className="h-4 w-4" />
          </div>
          <span className="font-bold text-foreground">{siteConfig.name}</span>
        </div>

        <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          {siteConfig.mainNav.map((item) => (
            <Link
              className="transition-colors hover:text-foreground"
              key={item.title}
              to={item.href as string}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {siteConfig.socialLinks.map((link) => {
            const Icon = socialIconMap[link.label];
            if (!Icon) {
              return null;
            }

            return (
              <a
                aria-label={link.label}
                className="text-muted-foreground transition-colors hover:text-foreground"
                href={link.href}
                key={link.label}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Icon className="h-5 w-5" />
              </a>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {siteConfig.name}. Đã đăng ký bản
          quyền.
        </p>
      </div>
    </div>
  </footer>
);
