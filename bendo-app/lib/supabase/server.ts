import "server-only";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/env";
import type { Database } from "@/lib/supabase/database.types";

export function getSupabaseAdmin() {
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    throw new Error(
      "Supabase service role is not configured. Use cloud API proxy or set SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
