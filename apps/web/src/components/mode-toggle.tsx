import { Button } from "@avin/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@avin/ui/components/dropdown-menu";
import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";

import { useTheme } from "@/components/theme-provider";

export const ModeToggle = () => {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Đổi giao diện"
            className="relative size-9 rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            size="icon"
            variant="ghost"
          />
        }
      >
        <SunIcon className="size-5.5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <MoonIcon className="absolute size-5.5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        <span className="sr-only">Đổi giao diện</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <SunIcon className="me-2 size-4" />
          Sáng
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <MoonIcon className="me-2 size-4" />
          Tối
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <DesktopIcon className="me-2 size-4" />
          Hệ thống
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
