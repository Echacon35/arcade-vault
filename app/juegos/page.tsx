import type { Metadata } from "next";
import { Suspense } from "react";
import { Library } from "@/components/library";
import { SignalLost } from "@/components/signal-lost";
import { getCatalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Biblioteca · Arcade Vault",
};

export default function JuegosPage() {
  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <Suspense fallback={null}>
        <Catalog />
      </Suspense>
    </div>
  );
}

async function Catalog() {
  const result = await getCatalog();

  if (!result.ok) return <SignalLost />;

  return <Library games={result.data} />;
}
