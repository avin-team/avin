import { env } from "@avin/env/server";
import { createClient } from "@supabase/supabase-js";

export const supabaseServer = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
