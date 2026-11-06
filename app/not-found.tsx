import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Game Over · Arcade Vault",
};

export default function NotFound() {
  return (
    <section className="fade-in mx-auto flex max-w-[1320px] flex-col items-center px-8 pt-24 pb-16 text-center">
      <h1 className="pixel neon-magenta flicker m-0 text-[clamp(32px,7vw,72px)] tracking-[0.06em]">
        GAME OVER
      </h1>
      <p className="pixel mt-6 text-[clamp(10px,1.6vw,13px)] tracking-[0.2em] text-ink-dim">
        ERROR 404 · PANTALLA NO ENCONTRADA
      </p>
      <Link href="/juegos" className="btn lg mt-10">
        VOLVER A LA BIBLIOTECA
      </Link>
    </section>
  );
}
