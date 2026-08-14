import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { cn } from "@avin/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as m from "motion/react-m";
import { useEffect, useRef, useState } from "react";

import { getHeaderActionVisibility } from "@/components/layout/header-action-visibility";
import { ModeToggle } from "@/components/mode-toggle";
import { siteConfig } from "@/config/site";
import { authClient } from "@/features/auth/api/auth-client";
import { UserMenu } from "@/features/auth/components/user-menu";
import { ChatButton } from "@/features/chat/components/chat-button";
import { CartButton } from "@/features/commerce/components/cart-button";
import { OrdersButton } from "@/features/commerce/components/orders-button";
import { NotificationButton } from "@/features/notifications/components/notification-button";
import { SellerStoreButton } from "@/features/seller/components/seller-store-button";
import { WalletButton } from "@/features/wallet/components/wallet-button";
import { orpc } from "@/utils/orpc";

import { MainNav } from "./main-nav";
import { MobileNav, MobileNavTrigger } from "./mobile-nav";

const containerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
    y: 0,
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
};

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { data: session } = authClient.useSession();
  const role = session?.user.role;
  const isSeller = role === ACCOUNT_ROLE.SELLER;
  const sellerProfileQuery = useQuery({
    ...orpc.sellerApplication.getProfile.queryOptions(),
    enabled: isSeller,
  });
  const { showChat, showSellerStore } = getHeaderActionVisibility(
    role,
    Boolean(sellerProfileQuery.data?.profile),
    sellerProfileQuery.data?.application?.status === "APPROVED"
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsScrolled(!entry.isIntersecting);
        }
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        ref={sentinelRef}
        className="pointer-events-none absolute top-0 h-10 w-full"
      />
      <m.header
        animate="visible"
        className={cn(
          "fixed top-0 right-0 left-0 z-50 transition-all duration-300",
          isScrolled
            ? "border-b border-border/50 bg-background/95 shadow-sm backdrop-blur-md"
            : "bg-transparent"
        )}
        initial="hidden"
        variants={containerVariants}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <m.div
              className="flex items-center gap-3"
              transition={{ damping: 25, stiffness: 400, type: "spring" }}
              variants={itemVariants}
            >
              <m.div whileHover={{ scale: 1.02 }}>
                <Link className="flex items-center space-x-3" to="/">
                  <div className="relative flex size-9 items-center justify-center overflow-hidden rounded-xl bg-muted/20 shadow-sm border border-border/60">
                    <img
                      alt="Avin Logo"
                      className="size-full object-cover"
                      src="/logo.webp"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-foreground">
                      {siteConfig.name}
                    </span>
                    <span className="-mt-1 text-xs text-muted-foreground">
                      Dịch vụ số
                    </span>
                  </div>
                </Link>
              </m.div>

              <ModeToggle />
            </m.div>

            <MainNav items={siteConfig.mainNav} />

            <m.div className="flex items-center gap-3" variants={itemVariants}>
              <WalletButton />

              <CartButton />

              <OrdersButton />

              {showSellerStore ? <SellerStoreButton /> : null}

              {showChat ? <ChatButton /> : null}

              <NotificationButton />

              <div className="hidden lg:block">
                <UserMenu />
              </div>

              <MobileNavTrigger
                isOpen={isMobileMenuOpen}
                onToggle={() => setIsMobileMenuOpen((prev) => !prev)}
              />
            </m.div>
          </div>
        </div>
      </m.header>

      <MobileNav
        isOpen={isMobileMenuOpen}
        items={siteConfig.mainNav}
        onToggle={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
};
