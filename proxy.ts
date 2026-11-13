import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
/** SPEC 12: refresca las cookies de sesión de Supabase. No redirige ni protege rutas. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
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
