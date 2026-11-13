/**
 * Reglas de autenticación compartidas entre cliente y servidor (SPEC 12).
 *
 * Sin dependencias de servidor ni de navegador: las usan los formularios de
 * `/acceso` y las Server Actions de `app/acceso/actions.ts`.
 */
/** Alias del jugador: mismo formato que `scores.player_name`. */
export const ALIAS_RE = /^[A-Z0-9_]{1,10}$/;
/** Formato básico de correo; la validación real la hace Supabase al enviar. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Longitud mínima de contraseña (igual que en Supabase Auth). */
export const MIN_PASSWORD = 8;
/** Proveedores OAuth activos (SPEC 13). */
export const OAUTH_PROVIDERS = ["google", "github"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
export const isOAuthProvider = (value: unknown): value is OAuthProvider =>
  (OAUTH_PROVIDERS as readonly unknown[]).includes(value);
/** Alias de reserva si no se puede proponer ninguno. */
export const FALLBACK_ALIAS = "JUGADOR";
/** Campos de los metadatos del proveedor, en orden de preferencia (GitHub primero, luego Google). */
const ALIAS_SOURCES = [
  "user_name",
  "preferred_username",
  "given_name",
  "name",
  "full_name",
] as const;
/** Pasa un texto libre al formato de alias: sin tildes, mayúsculas, [A-Z0-9_], máx. 10. */
function normalizeAlias(raw: string): string {
  const clean = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return clean.slice(0, 10).replace(/_$/, "");
}
/**
 * Alias propuesto a partir de los metadatos del proveedor (SPEC 13): primer
 * valor no vacío entre `user_name`, `preferred_username`, `given_name`,
 * `name`, `full_name` y la parte local del correo, normalizado con
 * `normalizeAlias`. Si queda vacío → `FALLBACK_ALIAS`.
 */
export function suggestAlias(
  metadata: Record<string, unknown> | null | undefined,
  email?: string | null,
): string {
  const candidates: unknown[] = ALIAS_SOURCES.map((key) => metadata?.[key]);
  candidates.push(email?.split("@")[0]);
  const raw = candidates.find(
    (value): value is string =>
      typeof value === "string" && value.trim() !== "",
  );
  const alias = raw ? normalizeAlias(raw) : "";
  return ALIAS_RE.test(alias) ? alias : FALLBACK_ALIAS;
}
/** Destino por defecto tras iniciar sesión o confirmar el correo. */
export const DEFAULT_NEXT = "/juegos";
/** Origen ficticio para resolver rutas relativas sin depender del host real. */
const BASE = "http://arcade-vault.local";
/**
 * Devuelve `next` solo si es una ruta interna (`/...`); cualquier otra cosa,
 * incluidas `//host`, `/\host` y URLs absolutas, devuelve `DEFAULT_NEXT`.
 * Evita redirecciones abiertas con `?next=`.
 */
export function safeNext(next: string | null | undefined): string {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return DEFAULT_NEXT;
  }
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return DEFAULT_NEXT;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_NEXT;
  }
}
