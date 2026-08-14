import { resolveBrowserServerURL } from "@avin/env/server-url";
import { env } from "@avin/env/web";

export const serverURL = resolveBrowserServerURL({
  frontendOrigin: window.location.origin,
  isProduction: import.meta.env.PROD,
  serverURL: env.VITE_SERVER_URL,
});
