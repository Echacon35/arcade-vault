import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/new-password-form";
export const metadata: Metadata = {
  title: "Nueva contraseña · Arcade Vault",
};
export default function NuevaClavePage() {
  return <NewPasswordForm />;
}
