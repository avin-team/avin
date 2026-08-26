import { env } from "@avin/env/web";

const LOCAL_WEB_ORIGIN = "http://localhost:3001";

const getWebOrigin = (): string =>
  env.VITE_WEB_URL ??
  (import.meta.env.DEV ? LOCAL_WEB_ORIGIN : window.location.origin);

export const getSellerStoreURL = (
  storeSlug: string | null | undefined
): string | null => {
  if (!storeSlug) {
    return null;
  }

  return new URL(
    `/store/${encodeURIComponent(storeSlug)}`,
    getWebOrigin()
  ).toString();
};
