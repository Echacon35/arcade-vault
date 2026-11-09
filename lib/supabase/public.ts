import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/**
 * Cliente público de Supabase sin cookies, apto para funciones con `"use cache"`.
 *
 * No lee `cookies()` ni `headers()`, así que solo ve lo que RLS permite al rol
 * `anon`. Úsalo únicamente para lecturas públicas cacheadas.
 */
export function createPublicClient(): SupabaseClient<Database> {
  const { url, publishableKey } = getSupabaseEnv();

  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false },
  });
}
