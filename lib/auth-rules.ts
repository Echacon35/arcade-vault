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
