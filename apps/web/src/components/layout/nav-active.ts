export const isNavItemActive = (
  itemHref: string,
  pathname: string
): boolean => {
  if (itemHref === "/") {
    return pathname === "/";
  }

  if (itemHref === "/category") {
    return (
      pathname === "/category" ||
      pathname.startsWith("/category/") ||
      pathname.startsWith("/listing")
    );
  }

  return (
    pathname === itemHref ||
    pathname.startsWith(`${itemHref}/`) ||
    pathname.startsWith(`${itemHref}?`)
  );
};
