import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "./env";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 *
 * Crea un cliente nuevo en cada llamada: no se debe compartir entre requests.
 * Usa `cookies()`, así que con Cache Components la llamada debe ir dentro de
 * un `<Suspense>` y nunca dentro de `"use cache"`.
 */
export async function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Desde un Server Component no se pueden escribir cookies. Se ignora:
          // las escriben las Server Actions, los Route Handlers o un futuro proxy.ts.
        }
      },
    },
  });
}
