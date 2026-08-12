import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getCookie, removeCookie, setCookie } from "@/lib/cookies";

type Theme = "dark" | "light" | "system";
type ResolvedTheme = Exclude<Theme, "system">;

const DEFAULT_THEME = "dark";
const THEME_COOKIE_NAME = "vite-ui-theme";
// 1 year
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

interface ThemeProviderProps {
  readonly children: React.ReactNode;
  readonly defaultTheme?: Theme;
  readonly storageKey?: string;
}

interface ThemeProviderState {
  defaultTheme: Theme;
  resolvedTheme: ResolvedTheme;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resetTheme: () => void;
}

const initialState: ThemeProviderState = {
  defaultTheme: DEFAULT_THEME,
  resetTheme: () => null,
  resolvedTheme: "dark",
  setTheme: () => null,
  theme: DEFAULT_THEME,
};

const ThemeContext = createContext<ThemeProviderState>(initialState);

const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme as ResolvedTheme;
};

export const ThemeProvider = ({
  children,
  defaultTheme = DEFAULT_THEME,
  storageKey = THEME_COOKIE_NAME,
}: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>(
    () => (getCookie(storageKey) as Theme) || defaultTheme
  );

  const resolvedTheme = resolveTheme(theme);

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = (currentResolvedTheme: ResolvedTheme) => {
      root.classList.remove("light", "dark");
      root.classList.add(currentResolvedTheme);
    };

    const handleChange = () => {
      if (theme === "system") {
        const systemTheme = mediaQuery.matches ? "dark" : "light";
        applyTheme(systemTheme);
      }
    };

    applyTheme(resolvedTheme);

    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, resolvedTheme]);

  const handleSetTheme = useCallback(
    (nextTheme: Theme) => {
      setCookie(storageKey, nextTheme, THEME_COOKIE_MAX_AGE);
      setTheme(nextTheme);
    },
    [storageKey]
  );

  const handleResetTheme = useCallback(() => {
    removeCookie(storageKey);
    setTheme(DEFAULT_THEME);
  }, [storageKey]);

  const contextValue: ThemeProviderState = useMemo(
    () => ({
      defaultTheme,
      resetTheme: handleResetTheme,
      resolvedTheme,
      setTheme: handleSetTheme,
      theme,
    }),
    [defaultTheme, handleResetTheme, handleSetTheme, resolvedTheme, theme]
  );

  return <ThemeContext value={contextValue}>{children}</ThemeContext>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
