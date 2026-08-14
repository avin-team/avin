export const MOBILE_BREAKPOINT = 768;

export const isMobileViewport = () =>
  typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
