import type { ReactNode } from "react";
import type { AuthError } from "@/app/acceso/actions";
/** Mensajes de la UI por `AuthError` (SPEC 12). `invalid_input` llega solo si falla la validación del cliente. */
export const AUTH_ERROR_MESSAGES: Record<AuthError, string> = {
  invalid_input: "▸ REVISA LOS DATOS DEL FORMULARIO_",
  invalid_credentials: "▸ CORREO O CONTRASEÑA INCORRECTOS_",
  email_not_confirmed: "▸ CONFIRMA TU CORREO ANTES DE ENTRAR_",
  weak_password: "▸ LA CONTRASEÑA NO CUMPLE LOS REQUISITOS_",
  same_password: "▸ LA NUEVA CONTRASEÑA DEBE SER DISTINTA_",
  no_session: "▸ ENLACE CADUCADO O NO VÁLIDO_",
  rate_limited: "▸ DEMASIADOS INTENTOS — ESPERA UN MINUTO_",
  oauth_failed: "▸ NO SE PUDO ENTRAR CON GOOGLE O GITHUB — REINTENTA_",
  unknown: "▸ SEÑAL PERDIDA — REINTENTA_",
};
/** Errores de campo de la validación en el cliente. */
export const FIELD_MESSAGES = {
  alias: "▸ ALIAS: DE 1 A 10 LETRAS, NÚMEROS O _",
  email: "▸ CORREO NO VÁLIDO_",
  password: "▸ LA CONTRASEÑA NO CUMPLE LOS REQUISITOS_",
  passwordEmpty: "▸ ESCRIBE TU CONTRASEÑA_",
  passwordMismatch: "▸ LAS CONTRASEÑAS NO COINCIDEN_",
} as const;
/** Tarjeta de acceso con la cabecera de ARCADE VAULT; la comparten `/acceso`, `/recuperar` y `/nueva-clave`. */
export function AuthCard({
  subtitle,
  children,
}: {
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div className="mono mt-1.5 text-[11px] tracking-[0.16em] text-ink-faint">
            {subtitle}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
type NoticeTone = "error" | "ok" | "info";
/** Aviso de estado. Los errores se anuncian como `alert`; el resto, como `status`. */
export function AuthNotice({
  tone,
  children,
  detail,
}: {
  tone: NoticeTone;
  children: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div
      className={`auth-notice ${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
      {detail && <span className="detail">{detail}</span>}
    </div>
  );
}
/**
 * Campo de formulario con su error debajo, enlazado por `aria-describedby`.
 * `hint` (con su `hintId`) va entre el input y el error, p. ej. la lista de
 * requisitos de la contraseña (SPEC 16).
 */
export function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  disabled,
  className,
  hint,
  hintId,
}: {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  className?: string;
  hint?: ReactNode;
  hintId?: string;
}) {
  const errorId = `${id}-error`;
  const describedBy =
    [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className ? `field ${className}` : "field"}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {hint}
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
