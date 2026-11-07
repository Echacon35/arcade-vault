"use server";

import { Resend } from "resend";

/*
 * Envío del formulario de contacto de /acerca-de (SPEC 03).
 * Único lugar del proyecto que lee RESEND_API_KEY. Cualquier fallo devuelve
 * { status: "error" } y el detalle solo va al log del servidor.
 */

export type ContactState =
  | { status: "idle" }
  | { status: "ok"; name: string }
  | { status: "error" };

const MAX_NAME = 80;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Honeypot: un bot rellenó el campo oculto. Éxito falso, sin enviar.
  if (field(formData, "website").trim() !== "") {
    return { status: "ok", name: field(formData, "name").trim() };
  }

  const name = field(formData, "name").trim();
  const email = field(formData, "email").trim();
  const message = field(formData, "message").trim();

  if (
    !name ||
    name.length > MAX_NAME ||
    !email ||
    email.length > MAX_EMAIL ||
    !EMAIL_RE.test(email) ||
    !message ||
    message.length > MAX_MESSAGE
  ) {
    console.error("[contacto] Datos inválidos", {
      nameLength: name.length,
      emailLength: email.length,
      emailValid: EMAIL_RE.test(email),
      messageLength: message.length,
    });
    return { status: "error" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.error("[contacto] Faltan variables de entorno", {
      RESEND_API_KEY: Boolean(apiKey),
      CONTACT_TO_EMAIL: Boolean(to),
      CONTACT_FROM_EMAIL: Boolean(from),
    });
    return { status: "error" };
  }

  const subjectName = name.replace(/[\r\n]+/g, " ");

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${subjectName}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\n${message}`,
    });
    if (error) {
      console.error("[contacto] Resend rechazó el envío", error);
      return { status: "error" };
    }
  } catch (err) {
    console.error("[contacto] Excepción al enviar con Resend", err);
    return { status: "error" };
  }

  return { status: "ok", name };
}
