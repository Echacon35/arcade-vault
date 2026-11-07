"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { useSession } from "@/components/session-provider";

type Section = "inicio" | "biblioteca" | "salon" | "acerca" | "acceso";

function sectionFor(pathname: string | null): Section | null {
  if (pathname === null) return null;
  if (pathname === "/") return "inicio";
  if (pathname === "/juegos" || pathname.startsWith("/juegos/")) return "biblioteca";
  if (pathname === "/salon") return "salon";
  if (pathname === "/acerca-de") return "acerca";
  if (pathname === "/acceso") return "acceso";
  return null;
}

/**
 * Con `cacheComponents`, `usePathname` puede suspender en rutas con params
 * fuera de `generateStaticParams` (p. ej. `/juegos/no-existe`). El fallback
 * pinta el mismo Nav sin enlace activo.
 */
export function Nav() {
  return (
    <Suspense fallback={<NavBar active={null} />}>
      <NavWithPathname />
    </Suspense>
  );
}

function NavWithPathname() {
  return <NavBar active={sectionFor(usePathname())} />;
}

function NavBar({ active }: { active: Section | null }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useSession();
  const router = useRouter();
  const close = () => setOpen(false);
  const cls = (section: Section) => (active === section ? "active" : "");

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={cls("inicio")}>
            Inicio
          </Link>
          <Link href="/juegos" className={cls("biblioteca")}>
            Biblioteca
          </Link>
          <Link href="/salon" className={cls("salon")}>
            Salón de la Fama
          </Link>
          <Link href="/acerca-de" className={cls("acerca")}>
            Acerca de
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={logout}>
            {user.name} ▾
          </button>
        ) : (
          <button className="btn auth-btn" onClick={() => router.push("/acceso")}>
            Iniciar Sesión
          </button>
        )}
        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú">
          ≡
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close}></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan mb-4 text-[11px]">MENÚ</div>
        <Link href="/" className={cls("inicio")} onClick={close}>
          Inicio
        </Link>
        <Link href="/juegos" className={cls("biblioteca")} onClick={close}>
          Biblioteca
        </Link>
        <Link href="/salon" className={cls("salon")} onClick={close}>
          Salón de la Fama
        </Link>
        <Link href="/acerca-de" className={cls("acerca")} onClick={close}>
          Acerca de
        </Link>
        <Link href="/acceso" className={cls("acceso")} onClick={close}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div className="flex-1"></div>
        <div className="pixel text-[9px] tracking-[0.16em] text-ink-faint">CRÉDITOS · 03</div>
      </aside>
    </>
  );
}
