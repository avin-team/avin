import { SidebarTrigger } from "@avin/ui/components/sidebar";
import { cn } from "@avin/ui/lib/utils";
import { useEffect, useRef, useState } from "react";

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
  const [offset, setOffset] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          setOffset(0);
          return;
        }
        setOffset(entry.isIntersecting ? 0 : 10);
      },
      { threshold: [0] }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={cn(
        "z-50 h-16",
        fixed && "header-fixed peer/header sticky top-0 w-[inherit]",
        offset > 10 && fixed ? "shadow" : "shadow-none",
        className
      )}
      {...props}
    >
      <div ref={sentinelRef} className="absolute top-0 h-px w-full" />
      <div
        className={cn(
          "relative flex h-full items-center gap-3 p-4 sm:gap-4",
          offset > 10 &&
            fixed &&
            "after:absolute after:inset-0 after:-z-10 after:bg-background/20 after:backdrop-blur-lg"
        )}
      >
        <SidebarTrigger variant="outline" className="max-md:scale-125" />
        {children}
      </div>
    </header>
  );
};
