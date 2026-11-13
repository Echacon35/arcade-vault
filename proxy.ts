import { type NextRequest, NextResponse } from "next/server";
import { DEFAULT_NEXT, safeNext } from "@/lib/auth-rules";
import { updateSession } from "@/lib/supabase/proxy";
/** SPEC 16: rutas que exigen sesión; sin ella, a `/acceso?next=<ruta>`. */
const SESSION_ONLY = ["/acceso/alias", "/acceso/nueva-clave"];
/** SPEC 16: rutas solo para quien no tiene sesión; con ella, a `safeNext(next)`. */
const GUEST_ONLY = ["/acceso", "/acceso/recuperar"];
/**
 * Refresca las cookies de sesión de Supabase (SPEC 12) y protege las rutas de
 * acceso (SPEC 16). Solo redirige navegaciones GET/HEAD: las Server Actions
 * son POST a la propia ruta y no deben recibir una redirección.
 */
export async function proxy(request: NextRequest) {
  const { response, hasSession } = await updateSession(request);
  if (request.method !== "GET" && request.method !== "HEAD") return response;
  const { pathname, search, searchParams } = request.nextUrl;
  if (!hasSession && SESSION_ONLY.includes(pathname)) {
    const target = new URL("/acceso", request.url);
    target.searchParams.set("next", `${pathname}${search}`);
    return redirectWithCookies(target, response);
  }
  if (hasSession && GUEST_ONLY.includes(pathname)) {
    const next = safeNext(searchParams.get("next"));
    // Un `next` hacia otra ruta solo para invitados volvería aquí en bucle.
    const nextPath = new URL(next, request.url).pathname;
    const path = GUEST_ONLY.includes(nextPath) ? DEFAULT_NEXT : next;
    return redirectWithCookies(new URL(path, request.url), response);
  }
  return response;
}
/** Redirección que conserva las cookies y cabeceras que haya escrito el refresco de sesión. */
function redirectWithCookies(url: URL, from: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  for (const key of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(key);
    if (value) redirect.headers.set(key, value);
  }
  return redirect;
}
export const config = {
  matcher: [
    {
      /*
       * Todas las rutas salvo:
       * - _next/static y _next/image (build e imágenes optimizadas)
       * - favicon.ico
       * - games/ (assets de los juegos en public/, p. ej. REBOTE)
       * - cualquier archivo estático por extensión
       */
      source:
        "/((?!_next/static|_next/image|favicon.ico|games/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp3|wav|ogg|json|txt|xml|webmanifest)$).*)",
      // Los prefetch del router no necesitan refrescar la sesión.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
