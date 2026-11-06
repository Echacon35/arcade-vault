import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm, AuthFormView } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Acceso · Arcade Vault",
};

export default function AccesoPage() {
  return (
    <Suspense fallback={<AuthFormView initialTab="in" />}>
      <AuthForm />
    </Suspense>
  );
}
