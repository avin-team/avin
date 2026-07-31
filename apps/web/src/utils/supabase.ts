import { env } from "@avin/env/web";
import { createClient } from "@supabase/supabase-js";

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
