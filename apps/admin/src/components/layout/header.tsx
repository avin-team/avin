import { SidebarTrigger } from "@avin/ui/components/sidebar";
import { cn } from "@avin/ui/lib/utils";
import { useEffect, useRef, useState } from "react";

import { ThemeSwitch } from "@/components/theme-switch";
import { NotificationButton } from "@/features/notifications/components/notification-button";

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean;
  ref?: React.Ref<HTMLElement>;
};

export const Header = ({
  className,
  fixed,
  children,
  ...props
}: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
    <header
      className={cn(
        "z-50 h-16 transition-all duration-300",
        fixed && "header-fixed peer/header sticky top-0 w-[inherit]",
        isScrolled && fixed
          ? "border-b border-border/50 bg-background/95 shadow-sm backdrop-blur-md"
          : "bg-transparent",
        className
      )}
      {...props}
    >
      <div
        ref={sentinelRef}
        className="pointer-events-none absolute top-0 h-10 w-full"
      />
      <div className="relative flex h-full items-center gap-3 p-4 sm:gap-4">
        <SidebarTrigger variant="outline" className="max-md:scale-125" />
        {children}
        <div className="ml-auto flex items-center gap-2">
          <NotificationButton />
          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
};
