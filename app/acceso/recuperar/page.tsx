import type { Metadata } from "next";
import { RecoverForm } from "@/components/recover-form";
export const metadata: Metadata = {
  title: "Recuperar contraseña · Arcade Vault",
};
export default function RecuperarPage() {
  return <RecoverForm />;
}
