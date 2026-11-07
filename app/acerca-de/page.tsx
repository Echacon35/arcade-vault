import type { Metadata } from "next";
import { HighlightIcon, type HighlightIconKind } from "@/components/about/highlight-icon";
import { RevealObserver } from "@/components/home/reveal-observer";
import type { GameColor } from "@/lib/games";

export const metadata: Metadata = {
  title: "Acerca de · Arcade Vault",
};

const HIGHLIGHTS: { icon: HighlightIconKind; text: string; color: GameColor }[] = [
  { icon: "HEART", text: "HECHO CON ❤️ PARA JUGADORES", color: "magenta" },
  { icon: "BROWSER", text: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", color: "cyan" },
  { icon: "PLANT", text: "PROYECTO EN CONSTANTE CRECIMIENTO", color: "green" },
];

const DIVIDER_PIXELS = Array.from({ length: 24 }, (_, i) => i);

export default function AcercaDePage() {
  return (
    <div className="about fade-in">
      <RevealObserver />

      {/* ABOUT */}
      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
        <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
        <p className="about-mission">
          ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra misión es preservar y celebrar los arcades
          que definieron una generación, haciéndolos accesibles para todos, en cualquier lugar y sin costo.
        </p>

        <div className="highlight-row">
          {HIGHLIGHTS.map((h, i) => (
            <div key={h.icon} className={"highlight " + h.color} style={{ transitionDelay: `${i * 80}ms` }}>
              <HighlightIcon kind={h.icon} />
              <div className="hl-text pixel">{h.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* divider banner */}
      <div className="about-divider reveal" aria-hidden="true">
        <div className="div-bar"></div>
        <div className="div-pixels">
          {DIVIDER_PIXELS.map((i) => (
            <span key={i} style={{ animationDelay: `${i * 80}ms` }}></span>
          ))}
        </div>
        <div className="div-bar"></div>
      </div>

      {/* CONTACT */}
      <section className="about-contact reveal">
        <div className="contact-grid">
          <div className="contact-intro">
            <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
            <h2 className="contact-title">CONTÁCTANOS</h2>
            <p className="contact-sub">
              ¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente quieres saludar? Escríbenos.
            </p>
            <div className="contact-tips">
              <div className="tip">
                <span className="tip-led"></span>RESPUESTA EN 24-48H
              </div>
              <div className="tip">
                <span className="tip-led y"></span>SUGERENCIAS BIENVENIDAS
              </div>
              <div className="tip">
                <span className="tip-led m"></span>SIN SPAM, JAMÁS
              </div>
            </div>
          </div>

          {/* Formulario temporal sin lógica (SPEC 03, paso 2). Se sustituye por <ContactForm /> en el paso 6. */}
          <form className="contact-form">
            <div className="field">
              <label htmlFor="contact-name">NOMBRE</label>
              <input id="contact-name" placeholder="px_kai" />
            </div>
            <div className="field">
              <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
              <input id="contact-email" type="email" placeholder="jugador@vault.gg" />
            </div>
            <div className="field">
              <label htmlFor="contact-message">MENSAJE</label>
              <textarea id="contact-message" rows={5} placeholder="Cuéntanos qué tienes en mente…"></textarea>
            </div>
            <button className="btn xl press w-full" type="button">
              ▶  ENVIAR MENSAJE
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
