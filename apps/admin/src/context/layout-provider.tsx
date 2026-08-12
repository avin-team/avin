import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { getCookie, setCookie } from "@/lib/cookies";

export type Collapsible = "icon" | "none" | "offcanvas";
type Variant = "floating" | "inset" | "sidebar";

// Cookie constants following the pattern from sidebar.tsx
const LAYOUT_COLLAPSIBLE_COOKIE_NAME = "layout_collapsible";
const LAYOUT_VARIANT_COOKIE_NAME = "layout_variant";
// 7 days
const LAYOUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

// Default values
const DEFAULT_VARIANT = "inset";
const DEFAULT_COLLAPSIBLE = "icon";

interface LayoutContextType {
  resetLayout: () => void;

  defaultCollapsible: Collapsible;
  collapsible: Collapsible;
  setCollapsible: (collapsible: Collapsible) => void;

  defaultVariant: Variant;
  variant: Variant;
  setVariant: (variant: Variant) => void;
}

const LayoutContext = createContext<LayoutContextType | null>(null);

interface LayoutProviderProps {
  readonly children: React.ReactNode;
}

export const LayoutProvider = ({ children }: LayoutProviderProps) => {
  const [collapsible, setCollapsible] = useState<Collapsible>(() => {
    const saved = getCookie(LAYOUT_COLLAPSIBLE_COOKIE_NAME);
    return (saved as Collapsible) || DEFAULT_COLLAPSIBLE;
  });

  const [variant, setVariant] = useState<Variant>(() => {
    const saved = getCookie(LAYOUT_VARIANT_COOKIE_NAME);
    return (saved as Variant) || DEFAULT_VARIANT;
  });

  const handleSetCollapsible = useCallback((newCollapsible: Collapsible) => {
    setCollapsible(newCollapsible);
    setCookie(
      LAYOUT_COLLAPSIBLE_COOKIE_NAME,
      newCollapsible,
      LAYOUT_COOKIE_MAX_AGE
    );
  }, []);

  const handleSetVariant = useCallback((newVariant: Variant) => {
    setVariant(newVariant);
    setCookie(LAYOUT_VARIANT_COOKIE_NAME, newVariant, LAYOUT_COOKIE_MAX_AGE);
  }, []);

  const resetLayout = useCallback(() => {
    handleSetCollapsible(DEFAULT_COLLAPSIBLE);
    handleSetVariant(DEFAULT_VARIANT);
  }, [handleSetCollapsible, handleSetVariant]);

  const contextValue: LayoutContextType = useMemo(
    () => ({
      collapsible,
      defaultCollapsible: DEFAULT_COLLAPSIBLE,
      defaultVariant: DEFAULT_VARIANT,
      resetLayout,
      setCollapsible: handleSetCollapsible,
      setVariant: handleSetVariant,
      variant,
    }),
    [collapsible, handleSetCollapsible, handleSetVariant, resetLayout, variant]
  );

  return <LayoutContext value={contextValue}>{children}</LayoutContext>;
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
};
