import { env } from "@avin/env/web";
import { createClient } from "@supabase/supabase-js";

import { client } from "./orpc";

export const supabasePublic = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const supabaseRealtime = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    accessToken: async () => {
      const { token } = await client.supabaseAccessToken();
      return token;
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
