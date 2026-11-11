# SPEC 03 — Página Acerca de y contacto con Resend

> **Estado:** Implementado
> **Depende de:** SPEC 02
> **Fecha:** 2026-11-06
> **Objetivo:** Implementar `/acerca-de` exactamente como `about.jsx` del template y hacer que su formulario de contacto envíe un correo real al equipo con Resend mediante una Server Action.

---

## Por qué existe esta spec

La SPEC 02 dejó el enlace `Acerca de` del Nav deshabilitado con la etiqueta `PRÓXIMAMENTE`. Esta spec lo activa y añade el primer código de servidor del proyecto.

Particularidades:

- **La fuente es `references/Templates/home-about/about.jsx`** y el bloque `ABOUT PAGE` de `styles.css` (líneas 1071–1147). El `arcade-vault-standalone.html` es un bundle comprimido y no se usa, igual que en la SPEC 02.
- **En el template el formulario no envía nada.** Solo valida que los campos no estén vacíos (animación `shake`) y muestra la terminal de éxito. Esta spec conserva ese flujo y añade el envío real, un estado de envío y un estado de error.
- **Es el primer uso de secretos.** `RESEND_API_KEY` solo puede existir en el servidor.

---

## Alcance

**Dentro:**

- **Página `/acerca-de`** con todo lo de `about.jsx`, en el mismo orden y con los mismos textos:
  1. Hero: kicker `▸ ACERCA DE`, título `ACERCA DE ARCADE VAULT`, párrafo de misión y 3 highlights con icono pixel (`HECHO CON ❤️ PARA JUGADORES`, `JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR`, `PROYECTO EN CONSTANTE CRECIMIENTO`).
  2. Divisor con 24 píxeles parpadeantes.
  3. Contacto: kicker `▸ CONTACTO`, título `CONTÁCTANOS`, subtítulo, 3 tips con LED (`RESPUESTA EN 24-48H`, `SUGERENCIAS BIENVENIDAS`, `SIN SPAM, JAMÁS`) y formulario `NOMBRE`, `CORREO ELECTRÓNICO`, `MENSAJE` con botón `▶  ENVIAR MENSAJE`.
  4. Terminal de éxito `VAULT-OS // TERMINAL` con las líneas `[OK]`, el mensaje `> MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, <NOMBRE>._` y el botón `ENVIAR OTRO MENSAJE`.
- Animación `.reveal` en el divisor y la sección de contacto, reutilizando `RevealObserver` de la SPEC 02.
- **Envío real** con una Server Action que llama a Resend y manda un correo de texto plano al buzón del equipo.
- **Estados del formulario:**
  - Campos vacíos: `shake` en cliente, sin llamar al servidor (igual que el template).
  - Enviando: campos y botón deshabilitados, botón con texto `▶  ENVIANDO…`.
  - Éxito: terminal de éxito.
  - Error: `shake`, se conserva lo escrito y aparece bajo el botón la línea `[ERR] NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.` en magenta.
- Validación en servidor sin dependencias: campos no vacíos, formato de correo y longitudes máximas.
- Honeypot anti-spam: campo oculto `website`.
- **Nav:** `Acerca de` pasa a ser un `<Link href="/acerca-de">` con estado activo, en la barra y en el panel móvil.
- Borrar `AboutDisabled`, `.nav-disabled` y `.soon`, que dejan de usarse.
- Variables de entorno documentadas en `.env.example` (versionado) y en `CLAUDE.md`.

**Fuera de alcance (para futuras specs):**

- Correo de confirmación al jugador.
- Plantillas HTML o React Email.
- Límite de envíos por IP o captcha.
- Guardar los mensajes en una base de datos.
- Rellenar el nombre con el usuario de la sesión mock.
- El ajuste responsive del Nav pendiente de la SPEC 02 (desborde a 375 px y entre 841 y 1020 px).
- Tests automatizados.

---

## Modelo de datos

```ts
// app/acerca-de/actions.ts
"use server";

export type ContactState =
  | { status: "idle" }
  | { status: "ok"; name: string }       // name ya recortado; la UI lo pasa a mayúsculas
  | { status: "error" };                 // un solo mensaje genérico en la UI

export async function sendContact(prev: ContactState, formData: FormData): Promise<ContactState>;
```

Campos del `FormData` (atributo `name` de cada input):

| Campo     | Regla en servidor                                   |
| --------- | --------------------------------------------------- |
| `name`    | Obligatorio tras `trim()`. Máximo 80 caracteres.    |
| `email`   | Obligatorio. Regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`. Máximo 254. |
| `message` | Obligatorio tras `trim()`. Máximo 2000 caracteres.  |
| `website` | Honeypot. Si llega con contenido → `{ status: "ok" }` sin enviar. |

Variables de entorno (solo servidor, ninguna con prefijo `NEXT_PUBLIC_`):

```bash
# .env.example
RESEND_API_KEY=        # API key de Resend
CONTACT_TO_EMAIL=      # buzón del equipo que recibe los mensajes
CONTACT_FROM_EMAIL=    # remitente en el dominio verificado, p. ej. "Arcade Vault <contacto@dominio>"
```

Correo enviado:

```text
from:     CONTACT_FROM_EMAIL
to:       CONTACT_TO_EMAIL
replyTo:  <email del jugador>
subject:  [Arcade Vault] Mensaje de <name>
text:
  Nombre: <name>
  Correo: <email>

  <message>
```

Convenciones:

- Cualquier fallo (validación, variables ausentes, error de Resend o excepción) devuelve `{ status: "error" }`. El detalle va a `console.error` en el servidor, nunca al cliente.
- La validación de vacíos en cliente (`shake`) se mantiene como en el template. La del servidor es la que manda.

---

## Plan de implementación

1. **CSS.** Copiar a `app/globals.css`, dentro de `@layer components`, el bloque `ABOUT PAGE` de `references/Templates/home-about/styles.css` (líneas 1071–1147, sin `/* misc */`). Añadir `.form-error` (fuente pixel, 9 px, magenta con brillo, `margin-top: 12px`). Añadir al bloque `prefers-reduced-motion` existente `.div-pixels span` y `.contact-form.shake` sin animación. `npm run build` pasa.
2. **Página estática.** Crear `components/about/highlight-icon.tsx` (Server Component con los iconos `HEART`, `BROWSER` y `PLANT`). Crear `app/acerca-de/page.tsx` (Server Component, metadata `Acerca de · Arcade Vault`) con hero, highlights, divisor, la columna de intro del contacto y `<RevealObserver />`. En el lugar del formulario va temporalmente el formulario del template sin lógica. Los `style` fijos pasan a Tailwind (`w-full`, `mt-[18px]`). Se mantienen como `style` solo `transitionDelay` y `animationDelay`, que dependen del índice.
3. **Nav.** En `components/nav.tsx`: `Section` añade `"acerca"`, `sectionFor` devuelve `acerca` para `/acerca-de`, y `Acerca de` pasa a `<Link href="/acerca-de">` en barra y panel móvil. Borrar `AboutDisabled`. Borrar `.nav-disabled` y `.soon` de `globals.css`.
4. **Configuración.** `npm install resend`. Crear `.env.example` con las 3 variables vacías. Añadir `!.env.example` al `.gitignore`. Añadir a `CLAUDE.md` una sección `Variables de entorno` con las 3 variables y para qué sirven.
5. **Server Action.** Antes, leer `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`, `forms.md` y `environment-variables.md`, y la API de `emails.send` del paquete `resend` instalado. Crear `app/acerca-de/actions.ts` con `ContactState` y `sendContact`:
   - honeypot primero;
   - validación según la tabla;
   - si falta alguna variable de entorno → `console.error` y `{ status: "error" }`;
   - el asunto usa `name` con los saltos de línea sustituidos por espacios;
   - `new Resend(key).emails.send({ from, to, replyTo, subject, text })`;
   - si la respuesta trae `error` o hay excepción → `console.error` y `{ status: "error" }`;
   - si no → `{ status: "ok", name }`.
6. **Formulario con estados.** Crear el Client Component `components/about/contact-form.tsx` y sustituir con él el formulario temporal del paso 2:
   - Inputs controlados con `name="name" | "email" | "message"`, mismos placeholders y `type="email"` que el template.
   - Honeypot `website`: fuera de pantalla con CSS, `tabIndex={-1}`, `autoComplete="off"` y `aria-hidden="true"`.
   - `useActionState(sendContact, { status: "idle" })` y `<form action={formAction}>`.
   - `onSubmit`: si algún campo está vacío tras `trim()`, `preventDefault()` y `shake` de 400 ms.
   - Mientras `isPending`: inputs y botón `disabled`, botón `▶  ENVIANDO…`.
   - Con `status: "error"`: `shake` y línea `.form-error`. Lo escrito se conserva.
   - Con `status: "ok"`: terminal de éxito con el nombre en mayúsculas.
   - `ENVIAR OTRO MENSAJE`: un componente padre remonta el formulario con una `key` nueva, lo que vacía los campos y vuelve a `idle`.
7. **Limpieza.** Quitar imports sin uso. `npm run lint` y `npm run build` pasan sin errores.

Reglas transversales (heredadas de SPEC 01 y SPEC 02):

- Las clases copiadas a `globals.css` se reutilizan tal cual.
- Navegación con `<Link>`.
- Se usa `/frontend-design` solo para `.form-error`, el único detalle visual que no está en el template.
- `RESEND_API_KEY` nunca se importa desde un Client Component. Solo `app/acerca-de/actions.ts` lee `process.env`.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores ni warnings de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] `/acerca-de` es estática (`○`) en la salida de `npm run build`.
- [ ] `/acerca-de` muestra el título `ACERCA DE ARCADE VAULT`, el párrafo de misión y 3 highlights con icono.
- [ ] El divisor muestra 24 píxeles y la sección de contacto aparece al hacer scroll.
- [ ] La columna de contacto muestra `CONTÁCTANOS`, el subtítulo y los 3 tips con LED verde, amarillo y magenta.
- [ ] El Nav muestra `Acerca de` como enlace en barra y panel móvil. Pulsarlo navega a `/acerca-de` y queda activo.
- [ ] El código fuente no contiene `nav-disabled`, `soon` ni `PRÓXIMAMENTE`.
- [ ] Enviar con algún campo vacío hace `shake` y no genera ninguna petición al servidor.
- [ ] Mientras se envía, el botón muestra `▶  ENVIANDO…` y los campos están deshabilitados.
- [ ] Con las 3 variables configuradas, enviar `px_kai` / correo válido / mensaje muestra la terminal con `GRACIAS, PX_KAI.` y el correo llega a `CONTACT_TO_EMAIL`.
- [ ] El correo recibido tiene el asunto `[Arcade Vault] Mensaje de px_kai`, el nombre, el correo y el mensaje en el cuerpo, y al responderlo se dirige al correo del jugador.
- [ ] `ENVIAR OTRO MENSAJE` vuelve al formulario con los tres campos vacíos.
- [ ] Con `RESEND_API_KEY` vacía o inválida, enviar hace `shake`, conserva lo escrito y muestra `[ERR] NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.`. El log del servidor muestra la causa.
- [ ] Un envío con el honeypot `website` relleno muestra la terminal de éxito y no envía ningún correo.
- [ ] Un mensaje de más de 2000 caracteres enviado al servidor devuelve el error y no envía correo.
- [ ] La cadena `RESEND_API_KEY` y el valor de la key no aparecen en ningún archivo de `.next/static`.
- [ ] `.env.example` está versionado (`git ls-files .env.example` lo lista) y `.env.local` no.
- [ ] La consola del navegador no muestra errores ni warnings de hidratación en `/acerca-de`.

---

## Decisiones

- **Sí:** ruta `/acerca-de`. En español, como `/salon` y `/acceso`.
- **Sí:** activar `Acerca de` en el Nav y borrar el estado deshabilitado de la SPEC 02. Ya existe la página.
- **Sí:** Server Action con `useActionState`. Idiomático en Next 16, sin endpoint público ni `fetch` manual, y con estado pendiente nativo.
- **No:** Route Handler `/api/contacto`. Más código y deja un endpoint expuesto que nadie más usa.
- **Sí:** un solo correo al equipo con `replyTo` del jugador. Coincide con `TE RESPONDEREMOS PRONTO`.
- **No:** confirmación al jugador. Permitiría usar el formulario para enviar correos a direcciones ajenas.
- **Sí:** remitente configurable con `CONTACT_FROM_EMAIL`. El objetivo es un remitente en un dominio propio verificado en Resend.
- **Sí (temporal):** mientras `motivus.com` no esté verificado en Resend, se usa `Arcade Vault <onboarding@resend.dev>`. Resend solo entrega desde ese remitente al correo dueño de la cuenta, así que `CONTACT_TO_EMAIL` debe ser ese correo. No sirve para producción. Pasar al dominio propio solo requiere cambiar `CONTACT_FROM_EMAIL`, sin tocar código.
- **Sí:** estado `ENVIANDO…` con controles deshabilitados. Mínimo cambio sobre el template.
- **No:** terminal animada durante el envío. Cambia el flujo del template.
- **Sí:** error con `shake` y una línea `[ERR]` bajo el botón, conservando lo escrito. Reutiliza el lenguaje visual del template.
- **No:** terminal de error. Oculta el formulario y obliga a reescribir.
- **Sí:** un único mensaje de error genérico en la UI. No filtra detalles del servidor ni de Resend.
- **Sí:** validación manual en servidor. Cuatro reglas no justifican una dependencia.
- **No:** zod. Dependencia extra para cuatro campos.
- **Sí:** honeypot que responde éxito falso. El bot no aprende que fue detectado.
- **No:** límite por IP en esta spec. Necesita almacenamiento compartido. Va en otra spec.
- **Sí:** correo en texto plano. Nada que escapar y se lee en cualquier cliente.
- **No:** React Email. Dependencias extra sin necesidad.
- **Sí:** variables ausentes → error controlado y log. El build no depende de los secretos.
- **No:** simular éxito en desarrollo. Ocultaría una configuración rota.
- **Sí:** `.env.example` versionado con excepción en `.gitignore`, más una sección en `CLAUDE.md`.
- **Sí:** reutilizar `RevealObserver` de `components/home/`. Mismo comportamiento, sin duplicar código.
- **Sí:** mantener `type="email"` sin `noValidate`, como el template. El navegador bloquea correos mal escritos antes del `onSubmit`.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La API key acaba en el bundle del cliente. | Solo `actions.ts` (`"use server"`) lee `process.env`. Sin prefijo `NEXT_PUBLIC_`. Un criterio revisa `.next/static`. |
| La Server Action se puede invocar directamente, sin pasar por el formulario. | La validación completa y el honeypot están en el servidor. El cliente solo hace el `shake` cosmético. |
| Abuso del formulario para inundar el buzón del equipo. | El honeypot frena bots simples. El límite por IP queda fuera, anotado para otra spec. |
| Inyección de cabeceras con saltos de línea en `name` dentro del asunto. | El SDK de Resend envía por API JSON, no SMTP en crudo. Además el asunto usa el `name` con los saltos de línea sustituidos por espacios. |
| La API de `resend` (`replyTo` vs `reply_to`, forma de la respuesta) difiere según la versión. | El paso 5 obliga a leer los tipos del paquete instalado antes de escribir la llamada. |
| `useActionState` y Cache Components: la página pasa a dinámica. | La página es un Server Component estático y el formulario es un Client Component, así que la acción no afecta al prerender. Un criterio verifica `○`. |
| El correo de `CONTACT_FROM_EMAIL` no pertenece al dominio verificado y Resend lo rechaza. | Llega como `error` de Resend → error controlado con la causa en el log. |

---

## Lo que **no** está en esta spec

- Correo de confirmación al jugador.
- Plantillas HTML o React Email.
- Límite por IP o captcha.
- Persistencia de mensajes.
- Nombre precargado desde la sesión.
- Ajuste responsive del Nav (pendiente de la SPEC 02).
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
