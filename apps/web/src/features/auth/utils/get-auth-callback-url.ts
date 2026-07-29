export const getAuthCallbackUrl = (
  pathname: string,
  frontendOrigin: string
): string => new URL(pathname, frontendOrigin).toString();
