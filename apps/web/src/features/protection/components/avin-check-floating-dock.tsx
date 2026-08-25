import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@avin/ui/components/tooltip";
import { cn } from "@avin/ui/lib/utils";
import {
  AddressBookIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import * as m from "motion/react-m";
import { useRef } from "react";
import type { MouseEvent } from "react";

interface DockItem {
  href: "/avin-check" | "/avin-check/directory" | "/avin-check/guide";
  icon: Icon;
  isActive: (pathname: string) => boolean;
  label: string;
  shortLabel: string;
}

const dockItems: DockItem[] = [
  {
    href: "/avin-check",
    icon: MagnifyingGlassIcon,
    isActive: (pathname) =>
      pathname === "/avin-check" ||
      pathname === "/avin-check/" ||
      pathname.startsWith("/avin-check/check"),
    label: "Check scam",
    shortLabel: "Tra cứu",
  },
  {
    href: "/avin-check/directory",
    icon: AddressBookIcon,
    isActive: (pathname) =>
      pathname.startsWith("/avin-check/directory") ||
      pathname.startsWith("/avin-check/provider/"),
    label: "Đối tác",
    shortLabel: "Đối tác",
  },
  {
    href: "/avin-check/guide",
    icon: BookOpenIcon,
    isActive: (pathname) =>
      pathname.startsWith("/avin-check/guide") ||
      pathname.startsWith("/avin-check/partner-policy"),
    label: "Hướng dẫn và chính sách",
    shortLabel: "Hướng dẫn",
  },
];

interface DesktopDockItemProps {
  item: DockItem;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  pathname: string;
  reduceMotion: boolean;
}

const DesktopDockItem = ({
  item,
  mouseX,
  pathname,
  reduceMotion,
}: DesktopDockItemProps) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const distance = useTransform(mouseX, (pointerX) => {
    const bounds = itemRef.current?.getBoundingClientRect();
    return bounds ? pointerX - (bounds.left + bounds.width / 2) : 160;
  });
  const targetScale = useTransform(
    distance,
    [-160, 0, 160],
    reduceMotion ? [1, 1, 1] : [1, 1.3, 1]
  );
  const scale = useSpring(targetScale, {
    damping: 22,
    mass: 0.12,
    stiffness: 280,
  });
  const isActive = item.isActive(pathname);
  const ItemIcon = item.icon;

  return (
    <m.div
      className="relative grid size-11 place-items-center"
      ref={itemRef}
      style={{ scale }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "grid size-11 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                isActive &&
                  "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
              )}
              to={item.href}
            />
          }
        >
          <ItemIcon
            aria-hidden="true"
            className="size-5"
            weight={isActive ? "fill" : "regular"}
          />
        </TooltipTrigger>
        <TooltipContent sideOffset={12}>{item.label}</TooltipContent>
      </Tooltip>
    </m.div>
  );
};

export const AvinCheckFloatingDock = () => {
  const pathname = useLocation({ select: (location) => location.pathname });
  const mouseX = useMotionValue(Number.POSITIVE_INFINITY);
  const reduceMotion = Boolean(useReducedMotion());

  const handlePointerMove = (event: MouseEvent<HTMLElement>) => {
    mouseX.set(event.clientX);
  };

  const resetPointer = () => {
    mouseX.set(Number.POSITIVE_INFINITY);
  };

  return (
    <nav
      aria-label="Điều hướng Avin Check"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:bottom-5 md:pb-0"
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center rounded-[1.4rem] border border-border/70 bg-background/88 p-1.5 shadow-[0_12px_48px_-12px_color-mix(in_oklab,var(--foreground)_24%,transparent)] backdrop-blur-xl md:hidden">
        {dockItems.map((item) => {
          const isActive = item.isActive(pathname);
          const ItemIcon = item.icon;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                isActive && "bg-primary/12 text-primary"
              )}
              key={item.href}
              to={item.href}
            >
              <ItemIcon
                aria-hidden="true"
                className="size-5"
                weight={isActive ? "fill" : "regular"}
              />
              <span className="max-w-full truncate font-medium text-[0.625rem] leading-4">
                {item.shortLabel}
              </span>
            </Link>
          );
        })}
      </div>

      <div
        className="pointer-events-auto hidden h-16 items-center gap-2 rounded-full border border-border/70 bg-background/88 px-3 shadow-[0_16px_64px_-16px_color-mix(in_oklab,var(--foreground)_28%,transparent)] backdrop-blur-xl md:flex"
        onMouseLeave={resetPointer}
        onMouseMove={handlePointerMove}
      >
        {dockItems.map((item) => (
          <DesktopDockItem
            item={item}
            key={item.href}
            mouseX={mouseX}
            pathname={pathname}
            reduceMotion={reduceMotion}
          />
        ))}
      </div>
    </nav>
  );
};
