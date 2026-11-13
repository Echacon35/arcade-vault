"use client";
import Link from "next/link";
import { useState } from "react";
import {
  type AuthError,
  requestPasswordResetAction,
} from "@/app/acceso/actions";
import {
  AUTH_ERROR_MESSAGES,
  AuthCard,
  AuthField,
  AuthNotice,
  FIELD_MESSAGES,
} from "@/components/auth-ui";
import { EMAIL_RE } from "@/lib/auth-rules";
const SUBTITLE = "RECUPERAR CONTRASEÑA";
/**
 * Pide el correo y envía el enlace de recuperación (SPEC 12). El mensaje de
 * éxito es el mismo exista o no la cuenta, para no revelar qué correos hay.
 */
export function RecoverForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<AuthError | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <AuthCard subtitle={SUBTITLE}>
        <AuthNotice
          tone="ok"
          detail="Si no lo ves en unos minutos, revisa la carpeta de spam."
        >
          ▸ SI EL CORREO EXISTE, TE HEMOS ENVIADO UN ENLACE_
        </AuthNotice>
        <Link href="/acceso" className="btn ghost mt-2 w-full">
          VOLVER A INICIAR SESIÓN
        </Link>
      </AuthCard>
    );
  }
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    setFormError(null);
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setEmailError(FIELD_MESSAGES.email);
      return;
    }
    setEmailError(undefined);
    setPending(true);
    try {
      const result = await requestPasswordResetAction({ email: value });
      if (result.ok) setSent(true);
      else if (result.error === "invalid_input")
        setEmailError(FIELD_MESSAGES.email);
      else setFormError(result.error);
    } catch {
      setFormError("unknown");
    } finally {
      setPending(false);
    }
  };
  return (
    <AuthCard subtitle={SUBTITLE}>
      <p className="mb-4 text-[13px] leading-relaxed text-ink-dim">
        Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una
        contraseña nueva.
      </p>
      {formError && (
        <AuthNotice tone="error">{AUTH_ERROR_MESSAGES[formError]}</AuthNotice>
      )}
      <form onSubmit={submit} noValidate aria-busy={pending}>
        <AuthField
          id="recover-email"
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={setEmail}
          error={emailError}
          placeholder="jugador@vault.gg"
          autoComplete="email"
          disabled={pending}
        />
        <button className="btn lg mt-2 w-full" type="submit" disabled={pending}>
          {pending ? "ENVIANDO…" : "ENVIAR ENLACE"}
        </button>
      </form>
      <Link href="/acceso" className="btn ghost mt-2.5 w-full">
        VOLVER A INICIAR SESIÓN
      </Link>
    </AuthCard>
  );
}
