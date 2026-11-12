"use server";
import type { AuthError as SupabaseAuthError } from "@supabase/supabase-js";
import { ALIAS_RE, EMAIL_RE, MIN_PASSWORD } from "@/lib/auth-rules";
import { createClient } from "@/lib/supabase/server";
export type AuthError =
  | "invalid_input" // alias, correo o contraseña no válidos
  | "invalid_credentials" // correo o contraseña incorrectos
  | "email_not_confirmed"
  | "weak_password"
  | "same_password" // la nueva contraseña es igual a la anterior
  | "no_session" // nueva-clave sin sesión de recuperación
  | "rate_limited"
  | "unknown"; // red o error inesperado de Supabase
export type AuthResult = { ok: true } | { ok: false; error: AuthError };
const OK: AuthResult = { ok: true };
const fail = (error: AuthError): AuthResult => ({ ok: false, error });
const isEmail = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value);
const isPassword = (value: unknown): value is string =>
  typeof value === "string" && value.length >= MIN_PASSWORD;
/** Códigos de Supabase Auth → `AuthError` de la UI. Lo no previsto es `unknown`. */
function mapError(error: SupabaseAuthError): AuthError {
  switch (error.code) {
    case "invalid_credentials":
      return "invalid_credentials";
    case "email_not_confirmed":
      return "email_not_confirmed";
    case "weak_password":
      return "weak_password";
    case "same_password":
      return "same_password";
    case "email_address_invalid":
    case "validation_failed":
      return "invalid_input";
    case "session_not_found":
    case "session_expired":
      return "no_session";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "rate_limited";
  }
  if (error.status === 429) return "rate_limited";
  return "unknown";
}
/** Registra la causa en el servidor (sin datos del jugador) y la traduce. */
function report(action: string, error: SupabaseAuthError): AuthResult {
  console.error(
    `[${action}] Supabase Auth:`,
    error.code ?? error.status,
    error.message,
  );
  return fail(mapError(error));
}
/**
 * Registro con alias, correo y contraseña (SPEC 12). El alias va a
 * `user_metadata.alias`. Con la confirmación activada, Supabase responde
 * igual si el correo ya existe, así que la UI muestra siempre «revisa tu correo».
 */
export async function signUpAction(input: {
  alias: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const { alias, email, password } = input ?? {};
  const normalizedAlias =
    typeof alias === "string" ? alias.trim().toUpperCase() : "";
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  if (
    !ALIAS_RE.test(normalizedAlias) ||
    !isEmail(normalizedEmail) ||
    !isPassword(password)
  ) {
    return fail("invalid_input");
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { alias: normalizedAlias } },
    });
    if (error) return report("signUpAction", error);
    return OK;
  } catch (err) {
    console.error("[signUpAction] error inesperado:", err);
    return fail("unknown");
  }
}
/** Inicio de sesión con correo y contraseña; las cookies las escribe el cliente de servidor. */
export async function signInAction(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const { email, password } = input ?? {};
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  // En el login no se exige la longitud mínima: una cuenta antigua podría tener otra.
  if (
    !isEmail(normalizedEmail) ||
    typeof password !== "string" ||
    password.length === 0
  ) {
    return fail("invalid_input");
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) return report("signInAction", error);
    return OK;
  } catch (err) {
    console.error("[signInAction] error inesperado:", err);
    return fail("unknown");
  }
}
/**
 * Envía el correo de recuperación. Devuelve `ok` aunque el correo no exista,
 * para no revelar qué cuentas hay; solo un formato inválido, el límite de
 * envíos o un fallo de red llegan a la UI.
 */
export async function requestPasswordResetAction(input: {
  email: string;
}): Promise<AuthResult> {
  const normalizedEmail =
    typeof input?.email === "string" ? input.email.trim() : "";
  if (!isEmail(normalizedEmail)) return fail("invalid_input");
  try {
    const supabase = await createClient();
    const { error } =
      await supabase.auth.resetPasswordForEmail(normalizedEmail);
    if (!error) return OK;
    const result = report("requestPasswordResetAction", error);
    // Cualquier error que no sea de límite o de red se trata como éxito.
    if (
      !result.ok &&
      (result.error === "rate_limited" || result.error === "unknown")
    ) {
      return result;
    }
    return OK;
  } catch (err) {
    console.error("[requestPasswordResetAction] error inesperado:", err);
    return fail("unknown");
  }
}
/** Fija la nueva contraseña con la sesión abierta por el enlace de recuperación. */
export async function updatePasswordAction(input: {
  password: string;
}): Promise<AuthResult> {
  const password = input?.password;
  if (!isPassword(password)) return fail("invalid_input");
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("no_session");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return report("updatePasswordAction", error);
    return OK;
  } catch (err) {
    console.error("[updatePasswordAction] error inesperado:", err);
    return fail("unknown");
  }
}
/** Cierra la sesión en este navegador (las de otros dispositivos siguen abiertas). */
export async function signOutAction(): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return report("signOutAction", error);
    return OK;
  } catch (err) {
    console.error("[signOutAction] error inesperado:", err);
    return fail("unknown");
  }
}
