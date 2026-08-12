/**
 * Cookie utility functions using manual document.cookie approach
 * Replaces js-cookie dependency for better consistency
 */

// 7 days
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * Get a cookie value by name
 */
export const getCookie = (name: string): string | undefined => {
  if (typeof document === "undefined") {
    return undefined;
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(";").shift();
    return cookieValue;
  }
  return undefined;
};

/**
 * Set a cookie with name, value, and optional max age
 */
export const setCookie = (
  name: string,
  value: string,
  maxAge = DEFAULT_MAX_AGE
): void => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}`;
};

/**
 * Remove a cookie by setting its max age to 0
 */
export const removeCookie = (name: string): void => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=; path=/; max-age=0`;
};
