import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

import { siteConfig } from "@/config/site";

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

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {siteConfig.name}. Đã đăng ký bản
          quyền.
        </p>
      </div>
    </div>
  </footer>
);
