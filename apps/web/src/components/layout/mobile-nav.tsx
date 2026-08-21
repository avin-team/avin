import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { cn } from "@avin/ui/lib/utils";
import {
  DesktopIcon,
  ListIcon,
  MoonIcon,
  SunIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { toast } from "sonner";

import { useTheme } from "@/components/theme-provider";
import type { MainNavItem } from "@/config/site";
import { authClient } from "@/features/auth/api/auth-client";

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
  <m.button
    className="rounded-lg p-2 text-foreground transition-colors duration-200 hover:bg-muted lg:hidden"
    onClick={onToggle}
    whileTap={{ scale: 0.95 }}
  >
    {isOpen ? <XIcon className="h-6 w-6" /> : <ListIcon className="h-6 w-6" />}
  </m.button>
);

export const MobileNav = ({ isOpen, items, onToggle }: MobileNavProps) => {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const { theme, setTheme } = useTheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onToggle}
          />
          <m.div
            animate="open"
            className="fixed top-16 right-4 z-50 w-80 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl lg:hidden"
            exit="closed"
            initial="closed"
            variants={mobileMenuVariants}
          >
            <div className="space-y-6 p-6">
              <div className="space-y-1">
                {items?.map((item) => (
                  <m.div key={item.title} variants={mobileItemVariants}>
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
                  </m.div>
                ))}
              </div>

              <m.div
                className="space-y-3 border-t border-border pt-6"
                variants={mobileItemVariants}
              >
                <div className="flex items-center justify-between px-4 py-1 text-sm">
                  <span className="font-medium text-foreground">Giao diện</span>
                  <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                    <button
                      aria-label="Giao diện sáng"
                      className={cn(
                        "rounded-md p-1.5 transition-colors",
                        theme === "light"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setTheme("light")}
                      type="button"
                    >
                      <SunIcon className="size-4" />
                    </button>
                    <button
                      aria-label="Giao diện tối"
                      className={cn(
                        "rounded-md p-1.5 transition-colors",
                        theme === "dark"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setTheme("dark")}
                      type="button"
                    >
                      <MoonIcon className="size-4" />
                    </button>
                    <button
                      aria-label="Giao diện hệ thống"
                      className={cn(
                        "rounded-md p-1.5 transition-colors",
                        theme === "system"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setTheme("system")}
                      type="button"
                    >
                      <DesktopIcon className="size-4" />
                    </button>
                  </div>
                </div>
                {session ? (
                  <div className="flex flex-col gap-2">
                    <div className="px-4 py-1 font-semibold text-foreground text-sm">
                      {session.user.name}
                    </div>
                    <div className="px-4 text-muted-foreground text-xs">
                      {session.user.email}
                    </div>
                    {session.user.role === ACCOUNT_ROLE.BUYER ? (
                      <>
                        <Link
                          className="mt-2 block w-full rounded-lg px-4 py-2 font-medium text-foreground text-sm transition-colors duration-200 hover:bg-muted"
                          onClick={onToggle}
                          to="/orders"
                        >
                          Đơn hàng
                        </Link>
                        <Link
                          className="block w-full rounded-lg px-4 py-2 font-medium text-foreground text-sm transition-colors duration-200 hover:bg-muted"
                          onClick={onToggle}
                          to="/wallet"
                        >
                          Ví của tôi
                        </Link>
                      </>
                    ) : null}
                    {session.user.role === ACCOUNT_ROLE.SELLER && (
                      <Link
                        className="mt-2 block w-full rounded-lg px-4 py-2 font-medium text-foreground text-sm transition-colors duration-200 hover:bg-muted"
                        onClick={onToggle}
                        to="/seller/store"
                      >
                        Quản lý gian hàng
                      </Link>
                    )}
                    <Link
                      className="block w-full rounded-lg px-4 py-2 font-medium text-foreground text-sm transition-colors duration-200 hover:bg-muted"
                      onClick={onToggle}
                      to="/security"
                    >
                      Bảo mật tài khoản
                    </Link>
                    <button
                      className="block w-full rounded-lg px-4 py-2 text-left font-medium text-destructive text-sm transition-colors duration-200 hover:bg-destructive/10"
                      onClick={async () => {
                        onToggle();
                        try {
                          await authClient.signOut();
                          await navigate({ to: "/" });
                        } catch {
                          toast.error("Không thể đăng xuất.");
                        }
                      }}
                      type="button"
                    >
                      Đăng xuất
                    </button>
                  </div>
                ) : (
                  <Link
                    className="block w-full rounded-lg bg-primary py-3 text-center font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90"
                    onClick={onToggle}
                    to="/login"
                  >
                    Bắt đầu ngay
                  </Link>
                )}
              </m.div>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
};
