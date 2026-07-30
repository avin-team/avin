import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import React, { useState } from "react";

import type { MainNavItem } from "@/config/site";

interface MainNavProps {
  items?: MainNavItem[];
}

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
};

export const MainNav = ({ items }: MainNavProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  if (!items?.length) {
    return null;
  }

  return (
    <nav className="hidden items-center space-x-1 lg:flex">
      {items.map((item) => (
        <motion.div
          className="relative"
          key={item.title}
          onMouseEnter={() => setHoveredItem(item.title)}
          onMouseLeave={() => setHoveredItem(null)}
          variants={itemVariants}
        >
          <Link
            activeProps={{
              className: "text-foreground font-semibold",
            }}
            className="relative rounded-lg px-4 py-2 text-sm font-medium text-foreground/80 transition-colors duration-200 hover:text-foreground"
            to={item.href as string}
          >
            {hoveredItem === item.title && (
              <motion.div
                animate={{ opacity: 1 }}
                className="absolute inset-0 rounded-lg bg-muted"
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
        </motion.div>
      ))}
    </nav>
  );
};
