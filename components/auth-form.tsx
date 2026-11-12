"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signInAction } from "@/app/acceso/actions";
import { useSession } from "@/components/session-provider";
type Tab = "in" | "up";
/**
 * Lee `?modo=registro` para abrir en la pestaña CREAR CUENTA (SPEC 02).
 * Usa `useSearchParams`, así que debe ir dentro de `<Suspense>`.
 * La `key` reinicia el formulario si cambia el modo estando ya en /acceso.
 */
export function AuthForm() {
  const initialTab: Tab =
    useSearchParams().get("modo") === "registro" ? "up" : "in";
  return <AuthFormView key={initialTab} initialTab={initialTab} />;
}
export function AuthFormView({ initialTab }: { initialTab: Tab }) {
  const router = useRouter();
  const { refresh } = useSession();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  // Provisional (SPEC 12, paso 6): solo login, con «Usuario» como correo. El paso 7 rehace el formulario.
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = await signInAction({
      email: (email || user).trim(),
      password: pass,
    });
    if (!result.ok) {
      console.error("[auth-form] login:", result.error);
      return;
    }
    await refresh();
    router.push("/juegos");
  };
  const playAsGuest = () => {
    router.push("/juegos");
  };
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div className="mono mt-1.5 text-[11px] tracking-[0.16em] text-ink-faint">
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>
        <div className="auth-tabs">
          <button
            type="button"
            className={tab === "in" ? "on" : ""}
            onClick={() => setTab("in")}
          >
            INICIAR SESIÓN
          </button>
          <button
            type="button"
            className={tab === "up" ? "on" : ""}
            onClick={() => setTab("up")}
          >
            CREAR CUENTA
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="auth-user">Usuario</label>
            <input
              id="auth-user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="px_kai"
            />
          </div>
          {tab === "up" && (
            <div className="field slide-in">
              <label htmlFor="auth-email">Correo electrónico</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@vault.gg"
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="auth-pass">Contraseña</label>
            <input
              id="auth-pass"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button className="btn lg mt-2 w-full" type="submit">
            {tab === "in" ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
          </button>
        </form>
        <button
          type="button"
          className="btn ghost mt-2.5 w-full"
          onClick={playAsGuest}
        >
          JUGAR COMO INVITADO
        </button>
        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button className="btn ghost" type="button">
            ◆ GOOGLE
          </button>
          <button className="btn ghost" type="button">
            ▣ GITHUB
          </button>
        </div>
        <div className="mt-[18px] text-center text-[11px] tracking-[0.1em] text-ink-faint">
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
