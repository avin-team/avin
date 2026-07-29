import { Button } from "@avin/ui/components/button";
import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/context/theme-provider";

export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button
      aria-label={`Switch to ${nextTheme} theme`}
      onClick={() => setTheme(nextTheme)}
      size="icon"
      variant="ghost"
    >
      {resolvedTheme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
