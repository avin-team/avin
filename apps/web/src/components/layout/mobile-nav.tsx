import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
// oxlint-disable-next-line react-doctor/use-lazy-motion
import { AnimatePresence, motion } from "motion/react";

import type { MainNavItem } from "@/config/site";

interface MobileNavProps {
  isOpen: boolean;
  items?: MainNavItem[];
  onToggle: () => void;
}

const mobileMenuVariants = {
  closed: {
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as const,
    },
    x: "100%",
  },
  open: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as const,
      staggerChildren: 0.1,
    },
    x: 0,
  },
};

const mobileItemVariants = {
  closed: { opacity: 0, x: 20 },
  open: { opacity: 1, x: 0 },
};

export const MobileNavTrigger = ({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <motion.button
    className="rounded-lg p-2 text-foreground transition-colors duration-200 hover:bg-muted lg:hidden"
    onClick={onToggle}
    whileTap={{ scale: 0.95 }}
  >
    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
  </motion.button>
);

export const MobileNav = ({ isOpen, items, onToggle }: MobileNavProps) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onToggle}
        />
        <motion.div
          animate="open"
          className="fixed top-16 right-4 z-50 w-80 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl lg:hidden"
          exit="closed"
          initial="closed"
          variants={mobileMenuVariants}
        >
          <div className="space-y-6 p-6">
            <div className="space-y-1">
              {items?.map((item) => (
                <motion.div key={item.title} variants={mobileItemVariants}>
                  <Link
                    activeProps={{
                      className: "bg-muted text-foreground font-semibold",
                    }}
                    className="block rounded-lg px-4 py-3 font-medium text-foreground transition-colors duration-200 hover:bg-muted"
                    onClick={onToggle}
                    to={item.href as string}
                  >
                    {item.title}
                  </Link>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="space-y-3 border-t border-border pt-6"
              variants={mobileItemVariants}
            >
              <Link
                className="block w-full rounded-lg py-3 text-center font-medium text-foreground transition-colors duration-200 hover:bg-muted"
                onClick={onToggle}
                to="/login"
              >
                Sign In
              </Link>
              <Link
                className="block w-full rounded-lg bg-primary py-3 text-center font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90"
                onClick={onToggle}
                to="/login"
              >
                Get Started
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
