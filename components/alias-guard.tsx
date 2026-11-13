"use client";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useSession } from "@/components/session-provider";
/** Rutas donde no se redirige: la propia pantalla de alias y los enlaces de Auth. */
const isExempt = (pathname: string) =>
  pathname === "/acceso/alias" || pathname.startsWith("/auth/");
/**
 * Alias obligatorio (SPEC 13): con sesión sin alias válido, cualquier página
 * redirige a `/acceso/alias?next=<ruta actual>`. Vive en el cliente para que
 * las páginas sigan estáticas; `proxy.ts` no redirige.
 *
 * `usePathname` puede suspender con Cache Components en rutas con params
 * fuera de `generateStaticParams`, así que va dentro de `<Suspense>` (como el Nav).
 */
export function AliasGuard() {
  return (
    <Suspense fallback={null}>
      <AliasGuardEffect />
    </Suspense>
  );
}
function AliasGuardEffect() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready } = useSession();
  const needsAlias = ready && !!user && !user.hasAlias;
  useEffect(() => {
    if (!needsAlias || pathname === null || isExempt(pathname)) return;
    // La query se lee aquí (solo cliente) para no suspender con `useSearchParams`.
    const next = `${pathname}${window.location.search}`;
    router.replace(`/acceso/alias?next=${encodeURIComponent(next)}`);
  }, [needsAlias, pathname, router]);
  return null;
}
