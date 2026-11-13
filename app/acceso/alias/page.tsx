import type { Metadata } from "next";
import { Suspense } from "react";
import { AliasForm, AliasFormView } from "@/components/alias-form";
export const metadata: Metadata = {
  title: "Elige tu alias · Arcade Vault",
};
export default function AliasPage() {
  return (
    <Suspense fallback={<AliasFormView />}>
      <AliasForm />
    </Suspense>
  );
}
