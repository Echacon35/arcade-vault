import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNext } from "@/lib/auth-rules";
import { createClient } from "@/lib/supabase/server";
/** Tipos de enlace que envían las plantillas de SPEC 12 (confirmación y recuperación). */
const OTP_TYPES = ["email", "recovery"] as const;
type ConfirmType = (typeof OTP_TYPES)[number];
const isConfirmType = (value: string | null): value is ConfirmType =>
  (OTP_TYPES as readonly (string | null)[]).includes(value);
/** Destino si el enlace está caducado, ya usado o mal formado. */
const LINK_ERROR = "/acceso?error=enlace";
/**
 * Enlaces de los correos de Supabase Auth (SPEC 12):
 * `/auth/confirm?token_hash=…&type=email|recovery[&next=/ruta]`.
 *
 * `verifyOtp` abre la sesión y el cliente de servidor escribe sus cookies en
 * la respuesta. Después se redirige a `next` (solo rutas internas) o a `/juegos`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next"));
  if (!tokenHash || !isConfirmType(type)) {
    console.error("[auth/confirm] enlace incompleto:", {
      type,
      hasToken: !!tokenHash,
    });
    redirect(LINK_ERROR);
  }
  let ok = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error)
      console.error(
        "[auth/confirm] verifyOtp falló:",
        error.code ?? error.message,
      );
    else ok = true;
  } catch (err) {
    console.error("[auth/confirm] error inesperado:", err);
  }
  // `redirect` lanza una excepción de control: va fuera del try para no capturarla.
  redirect(ok ? next : LINK_ERROR);
}
