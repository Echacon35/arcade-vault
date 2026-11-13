import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { ALIAS_RE, safeNext } from "@/lib/auth-rules";
import { createClient } from "@/lib/supabase/server";
/** Destino si el proveedor devuelve error, falta el `code` o el canje falla. */
const OAUTH_ERROR = "/acceso?error=oauth";
/**
 * Vuelta de Google y GitHub (SPEC 13): `/auth/callback?code=…[&next=/ruta]`.
 *
 * Canjea el `code` por una sesión (PKCE: el verificador está en la cookie que
 * dejó `signInWithOAuthAction`) y el cliente de servidor escribe las cookies.
 * Sin alias válido en `user_metadata` va a `/acceso/alias?next=…`; con él, a `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const providerError = searchParams.get("error");
  if (providerError || !code) {
    console.error("[auth/callback] sin code:", {
      error: providerError,
      description: searchParams.get("error_description"),
    });
    redirect(OAUTH_ERROR);
  }
  let destination = OAUTH_ERROR;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error(
        "[auth/callback] exchangeCodeForSession falló:",
        error.code ?? error.message,
      );
    } else {
      const alias: unknown = data.user?.user_metadata?.alias;
      destination =
        typeof alias === "string" && ALIAS_RE.test(alias)
          ? next
          : `/acceso/alias?next=${encodeURIComponent(next)}`;
    }
  } catch (err) {
    console.error("[auth/callback] error inesperado:", err);
  }
  // `redirect` lanza una excepción de control: va fuera del try para no capturarla.
  redirect(destination);
}
