"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendContact, type ContactState } from "@/app/acerca-de/actions";

const INITIAL: ContactState = { status: "idle" };
const EMPTY = { name: "", email: "", message: "" };
const SHAKE_MS = 400;

/**
 * Formulario de contacto de /acerca-de (SPEC 03).
 * "ENVIAR OTRO MENSAJE" remonta el formulario con una key nueva: campos vacíos y estado idle.
 */
export function ContactForm() {
  const [round, setRound] = useState(0);
  return <ContactFormRound key={round} onReset={() => setRound((r) => r + 1)} />;
}

function ContactFormRound({ onReset }: { onReset: () => void }) {
  const [form, setForm] = useState(EMPTY);
  const [shake, setShake] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerShake = () => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    setShake(true);
    shakeTimer.current = setTimeout(() => setShake(false), SHAKE_MS);
  };

  useEffect(() => () => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
  }, []);

  const [state, formAction, isPending] = useActionState(async (prev: ContactState, formData: FormData) => {
    const result = await sendContact(prev, formData);
    if (result.status === "error") triggerShake();
    return result;
  }, INITIAL);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      e.preventDefault();
      triggerShake();
    }
  };

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} action={formAction} onSubmit={onSubmit}>
      {state.status !== "ok" ? (
        <>
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
              disabled={isPending}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
              disabled={isPending}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-message">MENSAJE</label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
              disabled={isPending}
            ></textarea>
          </div>

          {/* Honeypot: invisible para personas, los bots lo rellenan. */}
          <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="contact-website">WEBSITE</label>
            <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>

          <button className="btn xl press w-full" type="submit" disabled={isPending}>
            {isPending ? "▶  ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>

          {state.status === "error" && !isPending && (
            <p className="form-error" role="alert">
              [ERR] NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.
            </p>
          )}
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success" role="status">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {state.name.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div className="mt-[18px]">
              <button className="btn ghost" type="button" onClick={onReset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
