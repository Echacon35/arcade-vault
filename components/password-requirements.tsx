import {
  PASSWORD_CHECKS,
  type PasswordCheck,
  passwordChecks,
} from "@/lib/auth-rules";
const LABELS: Record<PasswordCheck, string> = {
  length: "8+ CARACTERES",
  lower: "MINÚSCULA",
  upper: "MAYÚSCULA",
  digit: "DÍGITO",
  symbol: "SÍMBOLO",
};
/**
 * Requisitos de la contraseña en vivo (SPEC 16): un piloto por requisito que
 * se enciende en cian al cumplirse. El input lo enlaza con `aria-describedby`
 * (`id`); sin `aria-live`, para no anunciar cada tecla.
 */
export function PasswordRequirements({
  id,
  password,
}: {
  id: string;
  password: string;
}) {
  const checks = passwordChecks(password);
  return (
    <ul id={id} className="pw-reqs" aria-label="Requisitos de la contraseña">
      {PASSWORD_CHECKS.map((check) => {
        const met = checks[check];
        return (
          <li key={check} className={met ? "pw-req on" : "pw-req"}>
            <span className="led" aria-hidden="true" />
            {LABELS[check]}
            <span className="sr-only">
              {met ? ": cumplido" : ": pendiente"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
