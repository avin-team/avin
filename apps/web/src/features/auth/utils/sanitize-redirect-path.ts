export const sanitizeRedirectPath = (
  redirectTo: string | undefined,
  fallback = "/"
): string => {
  if (
    !redirectTo ||
    !redirectTo.startsWith("/") ||
    redirectTo.startsWith("//") ||
    redirectTo.includes("\\")
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(redirectTo, "https://avin.invalid");
    if (parsed.origin !== "https://avin.invalid") {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
};
