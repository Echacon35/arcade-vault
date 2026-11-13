import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";
/**
 * Refresca la sesión de Supabase Auth en `proxy.ts` (SPEC 12).
 *
 * Lee las cookies de la petición y, si el token caducó, escribe las nuevas
 * tanto en la petición (para que las vean los Server Components de esta
 * misma petición) como en la respuesta (para el navegador). No protege
 * rutas: solo mantiene la sesión viva.
 */
export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });
  // Un cliente por petición: las cabeceras anti-caché solo llegan en la primera escritura.
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Una respuesta con cookies de sesión no debe cachearla ningún CDN.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });
  // Nada entre crear el cliente y esta llamada: es la que dispara el refresco del token.
  await supabase.auth.getUser();
  return response;
}
