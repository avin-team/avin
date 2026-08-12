import * as React from "react";

const MOBILE_QUERY = "(max-width: 767px)";

export const useIsMobile = () =>
  React.useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(MOBILE_QUERY);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );
