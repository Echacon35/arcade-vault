"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  type AuthError,
  signInAction,
  signInWithOAuthAction,
  signUpAction,
} from "@/app/acceso/actions";
import {
  AUTH_ERROR_MESSAGES,
  AuthCard,
  AuthField,
  AuthNotice,
  FIELD_MESSAGES,
} from "@/components/auth-ui";
import { PasswordRequirements } from "@/components/password-requirements";
import { useSession } from "@/components/session-provider";
import {
  ALIAS_RE,
  DEFAULT_NEXT,
  EMAIL_RE,
  isStrongPassword,
  type OAuthProvider,
  safeNext,
} from "@/lib/auth-rules";
type Tab = "in" | "up";
/** Error que llega en la URL: enlace de correo caducado (SPEC 12) o vuelta fallida de OAuth (SPEC 13). */
type UrlError = "enlace" | "oauth";
const URL_ERROR_MESSAGES: Record<UrlError, string> = {
  enlace: AUTH_ERROR_MESSAGES.no_session,
  oauth: AUTH_ERROR_MESSAGES.oauth_failed,
};
const toUrlError = (value: string | null): UrlError | null =>
  value === "enlace" || value === "oauth" ? value : null;
/** Botones de OAuth: glifos del diseño original. */
const OAUTH_BUTTONS: {
  provider: OAuthProvider;
  glyph: string;
  label: string;
  /** Nombre para la etiqueta accesible («Entrar con Google»). */
  name: string;
}[] = [
  { provider: "google", glyph: "◆", label: "GOOGLE", name: "Google" },
  { provider: "github", glyph: "▣", label: "GITHUB", name: "GitHub" },
];
type FieldErrors = Partial<Record<"alias" | "email" | "password", string>>;
const SUBTITLE = "ACCESO AL SISTEMA · v2.6";
/**
 * Lee `?modo=registro` (SPEC 02), `?next=`, `?error=enlace` (SPEC 12) y `?error=oauth` (SPEC 13).
 * Usa `useSearchParams`, así que debe ir dentro de `<Suspense>`.
 * La `key` reinicia el formulario si cambia el modo estando ya en /acceso.
 */
export function AuthForm() {
  const params = useSearchParams();
  const initialTab: Tab = params.get("modo") === "registro" ? "up" : "in";
  return (
    <AuthFormView
      key={initialTab}
      initialTab={initialTab}
      next={safeNext(params.get("next"))}
      urlError={toUrlError(params.get("error"))}
    />
  );
}
export function AuthFormView({
  initialTab,
  next = DEFAULT_NEXT,
  urlError = null,
}: {
  initialTab: Tab;
  next?: string;
  urlError?: UrlError | null;
}) {
  const router = useRouter();
  const { user, ready, refresh, logout } = useSession();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [alias, setAlias] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<AuthError | null>(null);
  const [shownUrlError, setShownUrlError] = useState(urlError);
  const [pending, setPending] = useState(false);
  /** Proveedor al que se está redirigiendo: deshabilita el formulario hasta salir de la página. */
  const [oauthPending, setOauthPending] = useState<OAuthProvider | null>(null);
  const busy = pending || oauthPending !== null;
  /** Correo al que se envió la confirmación: sustituye el formulario por el aviso. */
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Con sesión iniciada no hay formulario.
  if (ready && user) {
    return (
      <AuthCard subtitle={SUBTITLE}>
        <AuthNotice tone="ok" detail={user.email}>
          ▸ SESIÓN INICIADA COMO {user.name}_
        </AuthNotice>
        <button
          className="btn lg mt-2 w-full"
          type="button"
          onClick={() => router.push("/juegos")}
        >
          IR A LA BIBLIOTECA
        </button>
        <button
          className="btn ghost mt-2.5 w-full"
          type="button"
          onClick={() => void logout()}
        >
          CERRAR SESIÓN
        </button>
      </AuthCard>
    );
  }
  // Registro enviado: el enlace de confirmación abre la sesión.
  if (sentTo) {
    return (
      <AuthCard subtitle={SUBTITLE}>
        <AuthNotice
          tone="ok"
          detail={
            <>
              Hemos enviado el enlace de activación a{" "}
              <strong className="text-cyan">{sentTo}</strong>. Ábrelo para
              entrar al Vault.
            </>
          }
        >
          ▸ REVISA TU CORREO PARA ACTIVAR LA CUENTA_
        </AuthNotice>
        <button
          className="btn ghost mt-2 w-full"
          type="button"
          onClick={() => {
            setSentTo(null);
            setTab("in");
            setPassword("");
          }}
        >
          VOLVER A INICIAR SESIÓN
        </button>
      </AuthCard>
    );
  }
  const switchTab = (target: Tab) => {
    setTab(target);
    setFieldErrors({});
    setFormError(null);
  };
  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (tab === "up" && !ALIAS_RE.test(alias))
      errors.alias = FIELD_MESSAGES.alias;
    if (!EMAIL_RE.test(email.trim())) errors.email = FIELD_MESSAGES.email;
    if (tab === "up" && !isStrongPassword(password))
      errors.password = FIELD_MESSAGES.password;
    if (tab === "in" && password.length === 0)
      errors.password = FIELD_MESSAGES.passwordEmpty;
    return errors;
  };
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setShownUrlError(null);
    setFormError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setPending(true);
    try {
      if (tab === "up") {
        const result = await signUpAction({
          alias,
          email: email.trim(),
          password,
        });
        if (result.ok) setSentTo(email.trim());
        // weak_password (de la Server Action o de Supabase) va junto al campo, como el error del cliente.
        else if (result.error === "weak_password")
          setFieldErrors({ password: FIELD_MESSAGES.password });
        else setFormError(result.error);
        return;
      }
      const result = await signInAction({ email: email.trim(), password });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      await refresh();
      router.push(next);
    } catch {
      setFormError("unknown");
    } finally {
      setPending(false);
    }
  };
  // Si todo va bien, la Server Action redirige al proveedor y no se vuelve aquí.
  const startOAuth = async (provider: OAuthProvider) => {
    if (busy) return;
    setShownUrlError(null);
    setFormError(null);
    setOauthPending(provider);
    try {
      const result = await signInWithOAuthAction({ provider, next });
      if (result && !result.ok) {
        setFormError(result.error);
        setOauthPending(null);
      }
    } catch {
      setFormError("oauth_failed");
      setOauthPending(null);
    }
  };
  return (
    <AuthCard subtitle={SUBTITLE}>
      <div className="auth-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "in"}
          className={tab === "in" ? "on" : ""}
          onClick={() => switchTab("in")}
        >
          INICIAR SESIÓN
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "up"}
          className={tab === "up" ? "on" : ""}
          onClick={() => switchTab("up")}
        >
          CREAR CUENTA
        </button>
      </div>
      {shownUrlError && (
        <AuthNotice tone="error">
          {URL_ERROR_MESSAGES[shownUrlError]}
        </AuthNotice>
      )}
      {formError && (
        <AuthNotice tone="error">{AUTH_ERROR_MESSAGES[formError]}</AuthNotice>
      )}
      <form onSubmit={submit} noValidate aria-busy={pending}>
        {tab === "up" && (
          <AuthField
            id="auth-alias"
            label="Alias"
            className="slide-in"
            value={alias}
            onChange={(value) => setAlias(value.toUpperCase())}
            error={fieldErrors.alias}
            placeholder="PX_KAI"
            autoComplete="nickname"
            disabled={busy}
          />
        )}
        <AuthField
          id="auth-email"
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={setEmail}
          error={fieldErrors.email}
          placeholder="jugador@vault.gg"
          autoComplete="email"
          disabled={busy}
        />
        <AuthField
          id="auth-pass"
          label="Contraseña"
          type="password"
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
          placeholder="••••••••"
          autoComplete={tab === "up" ? "new-password" : "current-password"}
          disabled={busy}
          hintId="auth-pass-reqs"
          hint={
            tab === "up" ? (
              <PasswordRequirements id="auth-pass-reqs" password={password} />
            ) : undefined
          }
        />
        {tab === "in" && (
          <div className="mb-3 flex justify-end">
            <Link href="/acceso/recuperar" className="auth-link">
              ¿OLVIDASTE TU CONTRASEÑA?
            </Link>
          </div>
        )}
        <button className="btn lg mt-2 w-full" type="submit" disabled={busy}>
          {pending
            ? "CONECTANDO…"
            : tab === "in"
              ? "ENTRAR AL VAULT"
              : "CREAR CUENTA"}
        </button>
      </form>
      <button
        type="button"
        className="btn ghost mt-2.5 w-full"
        onClick={() => router.push("/juegos")}
        disabled={busy}
      >
        JUGAR COMO INVITADO
      </button>
      <div className="auth-divider">O CONTINÚA CON</div>
      <div className="social">
        {OAUTH_BUTTONS.map(({ provider, glyph, label, name }) => (
          <button
            key={provider}
            type="button"
            className="btn ghost"
            onClick={() => void startOAuth(provider)}
            disabled={busy}
            aria-busy={oauthPending === provider}
            aria-label={`Entrar con ${name}`}
          >
            {oauthPending === provider ? "CONECTANDO…" : `${glyph} ${label}`}
          </button>
        ))}
      </div>
      <div className="mt-[18px] text-center text-[11px] tracking-[0.1em] text-ink-faint">
        AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
      </div>
    </AuthCard>
  );
}
