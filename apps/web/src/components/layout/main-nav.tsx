import { cn } from "@avin/ui/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import * as m from "motion/react-m";
import { useState } from "react";

import type { MainNavItem } from "@/config/site";

import { isNavItemActive } from "./nav-active";

interface MainNavProps {
  items?: MainNavItem[];
}

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
};

export const MainNav = ({ items }: MainNavProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const pathname = useLocation({ select: (location) => location.pathname });

  if (!items?.length) {
    return null;
  }

  return (
    <nav
      aria-label="Điều hướng chính"
      className="hidden items-center space-x-1 lg:flex"
    >
      {items.map((item) => {
        const isActive = isNavItemActive(item.href, pathname);

        return (
          <m.div
            className="relative"
            key={item.title}
            onMouseEnter={() => setHoveredItem(item.title)}
            onMouseLeave={() => setHoveredItem(null)}
            variants={itemVariants}
          >
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              to={item.href}
            >
              {isActive && (
                <m.div
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 rounded-lg border border-border/50 bg-muted shadow-xs"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  layoutId="navbar-active"
                  transition={{
                    damping: 30,
                    stiffness: 400,
                    type: "spring",
                  }}
                />
              )}

              {hoveredItem === item.title && !isActive && (
                <m.div
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 rounded-lg bg-muted/60"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  layoutId="navbar-hover"
                  transition={{
                    damping: 30,
                    stiffness: 400,
                    type: "spring",
                  }}
                />
              )}
              <span className="relative z-10">{item.title}</span>
            </Link>
          </m.div>
        );
      })}
    </nav>
  );
};
