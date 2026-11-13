"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState } from "react";
import { useSession } from "@/components/session-provider";
type Section = "inicio" | "biblioteca" | "salon" | "acerca" | "acceso";
function sectionFor(pathname: string | null): Section | null {
  if (pathname === null) return null;
  if (pathname === "/") return "inicio";
  if (pathname === "/juegos" || pathname.startsWith("/juegos/"))
    return "biblioteca";
  if (pathname === "/salon") return "salon";
  if (pathname === "/acerca-de") return "acerca";
  if (pathname === "/acceso" || pathname.startsWith("/acceso/"))
    return "acceso";
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
/**
 * Botón `ALIAS ▾` con su menú (SPEC 12): correo y CERRAR SESIÓN. Se cierra
 * con clic fuera y con Esc (el foco vuelve al botón). Al cerrar sesión no se
 * cambia de página.
 */
/**
 * Icono de cuenta en pixel-art (12×12), SPEC 13. Solo se ve a ≤ 960 px, donde
 * sustituye al texto del botón de cuenta; el color lo pone el botón (`currentColor`).
 */
function AccountGlyph() {
  return (
    <svg
      className="account-glyph"
      viewBox="0 0 12 12"
      width="18"
      height="18"
      aria-hidden
      shapeRendering="crispEdges"
    >
      <path
        fill="currentColor"
        d="M4 1h4v1h1v3H8v1H4V5H3V2h1zM2 8h8v1h1v2H1V9h1z"
      />
    </svg>
  );
}
function AccountMenu({ alias, email }: { alias: string; email: string }) {
  const { logout } = useSession();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);
  const signOut = async () => {
    setPending(true);
    try {
      await logout();
    } finally {
      setPending(false);
      setOpen(false);
    }
  };
  return (
    <div className="account" ref={rootRef}>
      <button
        ref={buttonRef}
        className="btn ghost auth-btn has-session"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Cuenta de ${alias}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="auth-btn-text">{alias} ▾</span>
        <AccountGlyph />
      </button>
      {open && (
        <div id={menuId} className="account-menu">
          <div className="account-alias pixel neon-cyan">{alias}</div>
          <div className="account-email">{email}</div>
          <button
            type="button"
            className="btn magenta w-full"
            onClick={() => void signOut()}
            disabled={pending}
            autoFocus
          >
            {pending ? "CERRANDO…" : "CERRAR SESIÓN"}
          </button>
        </div>
      )}
    </div>
  );
}
function NavBar({ active }: { active: Section | null }) {
  const [open, setOpen] = useState(false);
  const { user, ready, logout } = useSession();
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
        {/* Hasta leer la sesión no se pinta nada: así no parpadea «Iniciar Sesión». */}
        {ready &&
          (user ? (
            <AccountMenu alias={user.name} email={user.email} />
          ) : (
            <button
              className="btn auth-btn"
              onClick={() => router.push("/acceso")}
              aria-label="Iniciar sesión"
            >
              <span className="auth-btn-text">Iniciar Sesión</span>
              <AccountGlyph />
            </button>
          ))}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>
      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
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
        {ready &&
          (user ? (
            <div className="mobile-account">
              <div className="pixel neon-cyan text-[11px]">{user.name}</div>
              <div className="account-email">{user.email}</div>
              <button
                type="button"
                className="btn magenta w-full"
                onClick={() => {
                  close();
                  void logout();
                }}
              >
                CERRAR SESIÓN
              </button>
            </div>
          ) : (
            <Link href="/acceso" className={cls("acceso")} onClick={close}>
              Iniciar Sesión
            </Link>
          ))}
        <div className="flex-1"></div>
        <div className="pixel text-[9px] tracking-[0.16em] text-ink-faint">
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
