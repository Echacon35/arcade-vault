"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type AuthError, updatePasswordAction } from "@/app/acceso/actions";
import {
  AUTH_ERROR_MESSAGES,
  AuthCard,
  AuthField,
  AuthNotice,
  FIELD_MESSAGES,
} from "@/components/auth-ui";
import { useSession } from "@/components/session-provider";
import { DEFAULT_NEXT, MIN_PASSWORD } from "@/lib/auth-rules";
const SUBTITLE = "NUEVA CONTRASEÑA";
type FieldErrors = Partial<Record<"password" | "repeat", string>>;
/**
 * Fija la nueva contraseña con la sesión que abrió el enlace de recuperación
 * (`/auth/confirm?type=recovery`). Sin sesión, el enlace caducó o no se usó.
 */
export function NewPasswordForm() {
  const router = useRouter();
  const { user, ready, refresh } = useSession();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<AuthError | null>(null);
  const [pending, setPending] = useState(false);
  if ((ready && !user) || formError === "no_session") {
    return (
      <AuthCard subtitle={SUBTITLE}>
        <AuthNotice
          tone="error"
          detail="Pide un enlace nuevo para elegir tu contraseña."
        >
          {AUTH_ERROR_MESSAGES.no_session}
        </AuthNotice>
        <Link href="/acceso/recuperar" className="btn lg mt-2 w-full">
          PEDIR UN ENLACE NUEVO
        </Link>
      </AuthCard>
    );
  }
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending || !ready) return;
    setFormError(null);
    const errors: FieldErrors = {};
    if (password.length < MIN_PASSWORD)
      errors.password = FIELD_MESSAGES.password;
    else if (repeat !== password)
      errors.repeat = FIELD_MESSAGES.passwordMismatch;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setPending(true);
    try {
      const result = await updatePasswordAction({ password });
      if (!result.ok) {
        if (result.error === "invalid_input")
          setFieldErrors({ password: FIELD_MESSAGES.password });
        else setFormError(result.error);
        return;
      }
      await refresh();
      router.push(DEFAULT_NEXT);
    } catch {
      setFormError("unknown");
    } finally {
      setPending(false);
    }
  };
  // Hasta leer la sesión no se sabe si el enlace sirvió: el formulario espera deshabilitado.
  const disabled = pending || !ready;
  return (
    <AuthCard subtitle={SUBTITLE}>
      {user && (
        <p className="mb-4 text-[13px] leading-relaxed text-ink-dim">
          Elige una contraseña nueva para{" "}
          <strong className="text-cyan">{user.email}</strong>.
        </p>
      )}
      {formError && (
        <AuthNotice tone="error">{AUTH_ERROR_MESSAGES[formError]}</AuthNotice>
      )}
      <form onSubmit={submit} noValidate aria-busy={disabled}>
        <AuthField
          id="new-pass"
          label="Nueva contraseña"
          type="password"
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
          placeholder="••••••••"
          autoComplete="new-password"
          disabled={disabled}
        />
        <AuthField
          id="new-pass-repeat"
          label="Repite la contraseña"
          type="password"
          value={repeat}
          onChange={setRepeat}
          error={fieldErrors.repeat}
          placeholder="••••••••"
          autoComplete="new-password"
          disabled={disabled}
        />
        <button
          className="btn lg mt-2 w-full"
          type="submit"
          disabled={disabled}
        >
          {pending ? "GUARDANDO…" : "GUARDAR CONTRASEÑA"}
        </button>
      </form>
    </AuthCard>
  );
}
