import { Button } from "@avin/ui/components/button";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";

import { useTheme } from "@/context/theme-provider";

export const ThemeSwitch = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button
      aria-label={`Switch to ${nextTheme} theme`}
      onClick={() => setTheme(nextTheme)}
      size="icon"
      variant="ghost"
    >
      {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
};
