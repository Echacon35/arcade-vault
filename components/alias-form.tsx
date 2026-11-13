"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { type AuthError, saveAliasAction } from "@/app/acceso/actions";
import {
  AUTH_ERROR_MESSAGES,
  AuthCard,
  AuthField,
  AuthNotice,
  FIELD_MESSAGES,
} from "@/components/auth-ui";
import { useSession } from "@/components/session-provider";
import { ALIAS_RE, DEFAULT_NEXT, safeNext } from "@/lib/auth-rules";
const SUBTITLE = "ELIGE TU ALIAS";
/** Lee `?next=`. Usa `useSearchParams`, así que debe ir dentro de `<Suspense>`. */
export function AliasForm() {
  return <AliasFormView next={safeNext(useSearchParams().get("next"))} />;
}
/**
 * Alias obligatorio tras el primer acceso por OAuth (SPEC 13). Sin sesión
 * redirige a /acceso; con un alias ya válido, a `next`.
 */
export function AliasFormView({ next = DEFAULT_NEXT }: { next?: string }) {
  const router = useRouter();
  const { user, ready, refresh, logout } = useSession();
  // `null` = sin editar: se muestra la propuesta en cuanto se lee la sesión.
  const [aliasInput, setAliasInput] = useState<string | null>(null);
  const [aliasError, setAliasError] = useState<string | undefined>();
  const [formError, setFormError] = useState<AuthError | null>(null);
  const [pending, setPending] = useState<"save" | "logout" | null>(null);
  const alias = aliasInput ?? user?.aliasSuggestion ?? "";
  // Al guardar, `refresh()` publica `hasAlias: true` y este efecto hace la navegación.
  const done = ready && !!user && user.hasAlias;
  const noSession = ready && !user && pending !== "logout";
  useEffect(() => {
    if (done) router.replace(next);
    else if (noSession) router.replace("/acceso");
  }, [done, noSession, next, router]);
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending || !user) return;
    setFormError(null);
    if (!ALIAS_RE.test(alias)) {
      setAliasError(FIELD_MESSAGES.alias);
      return;
    }
    setAliasError(undefined);
    setPending("save");
    try {
      const result = await saveAliasAction({ alias });
      if (!result.ok) {
        if (result.error === "invalid_input")
          setAliasError(FIELD_MESSAGES.alias);
        else setFormError(result.error);
        return;
      }
      await refresh();
    } catch {
      setFormError("unknown");
    } finally {
      setPending(null);
    }
  };
  const signOut = async () => {
    if (pending) return;
    setPending("logout");
    try {
      await logout();
    } finally {
      router.replace("/acceso");
    }
  };
  const disabled = !ready || !user || pending !== null || done;
  return (
    <AuthCard subtitle={SUBTITLE}>
      <p className="mb-4 text-[13px] leading-relaxed text-ink-dim">
        {user ? (
          <>
            Has entrado como <strong className="text-cyan">{user.email}</strong>
            . Elige el nombre con el que jugarás en el Vault.
          </>
        ) : (
          "Elige el nombre con el que jugarás en el Vault."
        )}
      </p>
      {formError && (
        <AuthNotice tone="error">{AUTH_ERROR_MESSAGES[formError]}</AuthNotice>
      )}
      <form onSubmit={save} noValidate aria-busy={pending !== null}>
        <AuthField
          id="alias-input"
          label="Alias"
          value={alias}
          onChange={(value) => setAliasInput(value.toUpperCase())}
          error={aliasError}
          placeholder="PX_KAI"
          autoComplete="nickname"
          disabled={disabled}
        />
        <p className="-mt-1 mb-3 font-mono text-[10px] tracking-[0.08em] text-ink-faint">
          De 1 a 10 letras, números o _.
        </p>
        <button
          className="btn lg mt-2 w-full"
          type="submit"
          disabled={disabled}
        >
          {pending === "save" ? "GUARDANDO…" : "GUARDAR ALIAS"}
        </button>
      </form>
      <button
        type="button"
        className="btn ghost mt-2.5 w-full"
        onClick={() => void signOut()}
        disabled={!ready || !user || pending !== null}
      >
        {pending === "logout" ? "CERRANDO…" : "CERRAR SESIÓN"}
      </button>
    </AuthCard>
  );
}
