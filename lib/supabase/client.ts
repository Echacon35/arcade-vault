import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

/**
 * Cliente de Supabase para Client Components.
 *
 * Solo debe importarse desde archivos `"use client"`. `createBrowserClient`
 * reutiliza una única instancia en el navegador.
 */
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();

  return createBrowserClient(url, publishableKey);
}
