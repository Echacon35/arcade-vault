# SPEC 13 — Acceso con Google y GitHub, alias obligatorio e icono de cuenta en móvil

> **Estado:** Implementado
> **Depende de:** SPEC 12
> **Fecha:** 2026-11-13
> **Objetivo:** Permitir entrar con Google y GitHub, obligar a elegir alias en el primer acceso por OAuth y quitar el desbordamiento horizontal del nav en móvil sustituyendo el botón de cuenta por un icono.

---

## Por qué existe esta spec

La SPEC 12 dejó las cuentas con correo y contraseña y aparcó dos cosas:

- **OAuth con Google y GitHub.** Los botones se ocultaron hasta tenerlo.
- **La pantalla «elige tu alias».** Con OAuth no hay formulario de registro, así que la cuenta nace sin `user_metadata.alias`.

Además, la QA de la SPEC 12 detectó un **desbordamiento horizontal de 6 px** en móvil (390 px): en la barra del nav no caben el logo, el botón de cuenta y la hamburguesa, y la «≡» queda recortada. Se incluye aquí porque esta spec vuelve a tocar el nav.

---

## Alcance

**Dentro:**

- **Configuración manual** (fuera del repo; ni el MCP ni el código la tocan):
  - **GitHub:** una OAuth App con la _Authorization callback URL_ `https://winhhnspsnvcnxthpedd.supabase.co/auth/v1/callback`.
  - **Google Cloud:** un cliente OAuth «Aplicación web» con esa misma URL en _Authorized redirect URIs_, y la pantalla de consentimiento configurada.
  - **Supabase:** activar los proveedores GitHub y Google en Auth → Providers con su _Client ID_ y _Client Secret_.
  - La vinculación automática de identidades se deja como viene por defecto (activada).
- **Botones GOOGLE y GITHUB en `/acceso`:**
  - Vuelven el divisor `O CONTINÚA CON` y los dos botones del diseño original, bajo el formulario, en las dos pestañas.
  - Al pulsar uno, una Server Action pide a Supabase la URL del proveedor y redirige allí.
  - Se conserva `?next=`: la URL de vuelta es `<origen>/auth/callback?next=<ruta>`, con el origen tomado de las cabeceras de la petición.
  - Mientras se redirige, los dos botones quedan deshabilitados.
- **Vuelta del proveedor (`GET /auth/callback`):**
  - Canjea el `code` por una sesión (PKCE).
  - Si la cuenta no tiene alias válido, redirige a `/acceso/alias?next=<ruta>`; si lo tiene, a `safeNext(next)`.
  - Si falta el `code`, el proveedor devuelve error (p. ej. el jugador cancela) o el canje falla, redirige a `/acceso?error=oauth`.
- **`/acceso?error=oauth`:** muestra `▸ NO SE PUDO ENTRAR CON GOOGLE O GITHUB — REINTENTA_`.
- **Pantalla `/acceso/alias` (obligatoria):**
  - Campo Alias, prerrellenado con el nombre del proveedor normalizado (ver «Modelo de datos») y editable. Se pasa a mayúsculas al escribir y se valida con `ALIAS_RE`.
  - Botón `GUARDAR ALIAS`: guarda en `user_metadata.alias` y redirige a `safeNext(next)`.
  - Botón `CERRAR SESIÓN`: cierra la sesión y lleva a `/acceso`.
  - Sin sesión, redirige a `/acceso`. Con un alias ya válido, redirige a `safeNext(next)`.
- **Alias obligatorio en toda la app:** mientras haya sesión sin alias válido, cualquier página redirige a `/acceso/alias?next=<ruta actual>`. Las excepciones son `/acceso/alias` y las rutas `/auth/*`.
- **Vinculación con cuentas de correo:** si un jugador de la SPEC 12 entra con Google o GitHub usando el mismo correo verificado, Supabase añade la identidad a su cuenta. Conserva su alias y no ve la pantalla de alias.
- **Nav en móvil y escritorio estrecho (≤ 960 px):**
  - El botón con texto (`Iniciar Sesión` / `ALIAS ▾`) se sustituye por un **icono de cuenta** cuadrado.
  - **Sin sesión:** el icono va en tono apagado, lleva a `/acceso` y tiene `aria-label="Iniciar sesión"`.
  - **Con sesión:** el icono va en cian con brillo, abre el mismo menú de cuenta y tiene `aria-label="Cuenta de <ALIAS>"`.
  - Con el icono, la barra cabe sin desbordar a 360 y 390 px.
  - En escritorio (> 960 px) se mantienen `Iniciar Sesión` y `ALIAS ▾`.
  - _Ampliado durante la implementación (2026-11-13):_ el corte pasa de 840 a 960 px, porque entre 841 y ~920 px el nav con texto (enlaces, `CRÉDITOS · 03` y botón de cuenta) también desbordaba.
- **Tarjetas de actividad de la landing** (_ampliado durante la implementación, 2026-11-13_): `.activity-card` desbordaba 12 px en `/` a 360 px, porque la columna `1fr` crecía hasta el contenido. Pasa a `minmax(0, 1fr)`, y las filas del ticker se compactan a ≤ 400 px.
- **Menú de cuenta:** muestra el alias además del correo, porque en móvil el icono no lo lleva. Es el mismo componente en los dos tamaños.
- **Documentación:** `CLAUDE.md` refleja OAuth, `/auth/callback`, `/acceso/alias`, el guardián de alias y la configuración manual de los proveedores.

**Fuera de alcance (para futuras specs):**

- Puntuaciones vinculadas a la cuenta (`scores.user_id`) y alias fijo en el modal de fin (SPEC 14).
- Cambiar el alias después de elegirlo (página de perfil).
- Alias único o tabla `profiles`.
- Otros proveedores (Discord, Apple…).
- Avatar del proveedor en el nav o el menú.
- Desvincular identidades o gestionar varias desde la app.
- Foco de teclado poco visible en los botones `.btn` (estilo global, detectado en la QA de la SPEC 12).
- Glifo «▸» y «Ó» de la fuente pixel.
- Publicar la pantalla de consentimiento de Google (se queda en modo de prueba, ver «Riesgos»).
- Desbordamiento de `/salon` a 360 px (386 px de ancho) y de cualquier página a 320 px: detectados al medir el paso 8, no vienen del nav.

---

## Modelo de datos

No hay migraciones. El alias sigue en `user_metadata.alias` (SPEC 12). Para OAuth se escribe con `auth.updateUser({ data: { alias } })` desde la pantalla de alias.

`SessionUser` (`lib/session.ts`) gana dos campos:

```ts
export type SessionUser = {
  id: string;
  email: string;
  name: string; // alias válido o "JUGADOR"
  /** false si `user_metadata.alias` falta o no cumple ALIAS_RE (cuenta OAuth nueva). */
  hasAlias: boolean;
  /** Propuesta para /acceso/alias, calculada con `suggestAlias(user_metadata)`. */
  aliasSuggestion: string;
};
```

Novedades de `lib/auth-rules.ts`:

```ts
export const OAUTH_PROVIDERS = ["google", "github"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

/**
 * Alias propuesto a partir de los metadatos del proveedor: primer valor no
 * vacío entre `user_name`, `preferred_username`, `given_name`, `name`,
 * `full_name` y la parte local del correo; sin tildes, en mayúsculas,
 * caracteres fuera de [A-Z0-9_] → "_", sin "_" repetidos ni en los
 * extremos, recortado a 10. Si queda vacío → "JUGADOR".
 */
export function suggestAlias(
  metadata: Record<string, unknown>,
  email?: string,
): string;
```

Ejemplos de `suggestAlias`:

| Metadatos                                | Resultado    |
| ---------------------------------------- | ------------ |
| `{ user_name: "px-kai" }` (GitHub)       | `PX_KAI`     |
| `{ given_name: "José", name: "José P" }` | `JOSE`       |
| `{ name: "María de la Luz Ortega" }`     | `MARIA_DE_L` |
| `{}` con correo `neo.99@mail.com`        | `NEO_99`     |
| `{ name: "!!!" }` sin correo             | `JUGADOR`    |

Novedades de `app/acceso/actions.ts`:

```ts
export type AuthError =
  | /* … los de SPEC 12 … */
  | "oauth_failed"; // el proveedor o Supabase no devolvieron la URL de OAuth

/** Pide la URL del proveedor y hace `redirect()` a ella; solo vuelve si falla. */
export async function signInWithOAuthAction(input: {
  provider: OAuthProvider;
  next: string;
}): Promise<AuthResult>;

/** Guarda `user_metadata.alias` de la sesión actual. */
export async function saveAliasAction(input: { alias: string }): Promise<AuthResult>;
```

Mensajes nuevos (`components/auth-ui.tsx`):

| Caso                                   | Mensaje                                                |
| -------------------------------------- | ------------------------------------------------------ |
| `oauth_failed` y `/acceso?error=oauth` | `▸ NO SE PUDO ENTRAR CON GOOGLE O GITHUB — REINTENTA_` |

Rutas nuevas:

| Ruta             | Tipo                  | Función                                                              |
| ---------------- | --------------------- | -------------------------------------------------------------------- |
| `/auth/callback` | Route Handler (`GET`) | `exchangeCodeForSession(code)` y redirección a alias, `next` o error |
| `/acceso/alias`  | Página nueva          | Elegir el alias obligatorio tras el primer acceso por OAuth          |

Componente nuevo: `components/alias-guard.tsx` (cliente, montado en `app/layout.tsx` dentro de `SessionProvider`). Con `ready && user && !user.hasAlias` y fuera de las rutas exentas, hace `router.replace("/acceso/alias?next=<ruta actual>")`.

---

## Plan de implementación

1. **Configurar los proveedores a mano** (GitHub OAuth App, cliente OAuth de Google y proveedores en Supabase) con el checklist de «Alcance». Comprobación: en Supabase, Auth → Providers muestra Google y GitHub activados.
2. **Añadir `OAUTH_PROVIDERS` y `suggestAlias` a `lib/auth-rules.ts`.** Comprobación: los cinco ejemplos de la tabla dan el resultado indicado (script manual con Node, sin añadir framework de tests).
3. **Ampliar `SessionUser` en `lib/session.ts`** con `hasAlias` y `aliasSuggestion`. Las cuentas de correo existentes salen con `hasAlias: true` y nada cambia en la UI.
4. **Añadir `saveAliasAction`** a `app/acceso/actions.ts` (valida con `ALIAS_RE`, exige sesión y llama a `updateUser`) **y crear `/acceso/alias`** (`app/acceso/alias/page.tsx` + `components/alias-form.tsx`, con las piezas de `auth-ui.tsx` y `/frontend-design`). Comprobación: la página redirige a `/acceso` sin sesión y a `next` con una cuenta de correo que ya tiene alias.
5. **Crear `components/alias-guard.tsx`** y montarlo en `app/layout.tsx`. Sin cuentas OAuth todavía no se activa nunca.
6. **Crear `app/auth/callback/route.ts`**: `exchangeCodeForSession` con el cliente de `lib/supabase/server.ts`, comprobación del alias del usuario devuelto y redirección según «Alcance».
7. **Añadir `signInWithOAuthAction`** (origen desde `headers()`, `redirectTo` = `<origen>/auth/callback?next=…`, `redirect(data.url)`) **y los botones** en `components/auth-form.tsx`, con el divisor, el estado deshabilitado y el aviso de `?error=oauth`. Comprobación: GITHUB y GOOGLE llevan a la pantalla del proveedor.
8. **Icono de cuenta en `components/nav.tsx` y `app/globals.css`:**
   - Icono SVG inline al estilo pixel del sitio, solo hasta 960 px; el botón con texto se oculta en ese tamaño.
   - El menú de cuenta añade el alias.
   - Comprobación: a 360 y 390 px, `document.documentElement.scrollWidth` es igual al ancho de la ventana.
9. **Actualizar `CLAUDE.md`**: rutas `/auth/callback` y `/acceso/alias`, OAuth y guardián de alias en «Autenticación», configuración manual de los proveedores en «Supabase → Auth», y la nota de que Google está en modo de prueba.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] `/acceso` muestra el divisor `O CONTINÚA CON` y los botones GOOGLE y GITHUB en las pestañas INICIAR SESIÓN y CREAR CUENTA.
- [ ] Entrar con GitHub con una cuenta nueva lleva a `/acceso/alias` con el alias prerrellenado a partir del usuario de GitHub (normalizado según `suggestAlias`).
- [ ] Entrar con Google con una cuenta nueva lleva a `/acceso/alias` con el alias prerrellenado a partir del nombre de Google.
- [ ] En `/acceso/alias`, un alias con `-` o de más de 10 caracteres no se guarda y muestra el error del campo.
- [ ] Guardar un alias válido lleva a `/juegos` (o a `next`), y el nav muestra `<ALIAS> ▾` en escritorio.
- [ ] Volver a entrar con ese mismo proveedor lleva directamente a `/juegos`, sin pasar por `/acceso/alias`.
- [ ] Con sesión OAuth sin alias, navegar a `/salon` redirige a `/acceso/alias?next=/salon`.
- [ ] `CERRAR SESIÓN` en `/acceso/alias` cierra la sesión y lleva a `/acceso`.
- [ ] Entrar desde `/acceso?next=/salon` con GitHub (cuenta con alias) termina en `/salon`.
- [ ] Cancelar en la pantalla de GitHub o Google vuelve a `/acceso?error=oauth` con `▸ NO SE PUDO ENTRAR CON GOOGLE O GITHUB — REINTENTA_`.
- [ ] `/auth/callback` sin `code` redirige a `/acceso?error=oauth`.
- [ ] Una cuenta de correo de la SPEC 12 que entra con Google con el mismo correo conserva su alias y no ve `/acceso/alias`.
- [ ] `/acceso/alias` sin sesión redirige a `/acceso`.
- [ ] A 360 px y a 390 px de ancho no hay scroll horizontal en `/`, `/juegos` ni `/acceso`, con y sin sesión.
- [ ] A ≤ 960 px, sin sesión, el icono de cuenta lleva a `/acceso`. Con sesión, abre el menú con el alias, el correo y `CERRAR SESIÓN`.
- [ ] A > 960 px se siguen viendo `Iniciar Sesión` / `<ALIAS> ▾` con texto.
- [ ] El menú de cuenta muestra el alias en escritorio y en móvil.
- [ ] Ningún componente de `components/` importa `@supabase/*` ni `lib/supabase/*`.

---

## Decisiones

- **Sí:** OAuth por Server Action + `redirect(data.url)`. Mantiene la regla de la SPEC 12: el cliente de navegador solo lee la sesión, y el verificador PKCE queda en cookie del servidor.
- **No:** `signInWithOAuth` desde el cliente de navegador. Rompería la regla anterior sin aportar nada.
- **Sí:** `/auth/callback` separado de `/auth/confirm`. Son flujos distintos (`code` PKCE frente a `token_hash`) y así cada uno tiene una sola razón de fallar.
- **Sí:** origen de la URL de vuelta tomado de las cabeceras de la petición. Funciona en localhost y en producción sin variables nuevas, y Supabase rechaza cualquier `redirectTo` fuera de su lista de _Redirect URLs_.
- **No:** variable `NEXT_PUBLIC_SITE_URL`. Una más que mantener por entorno.
- **Sí:** alias obligatorio con guardián global (`AliasGuard`). Garantiza que toda sesión tiene alias antes de jugar y de llegar a la SPEC 14.
- **No:** alias solo tras el callback. Dejaría cuentas sin alias jugando como «JUGADOR».
- **Sí:** `CERRAR SESIÓN` en `/acceso/alias`, para que nadie quede atrapado en una pantalla obligatoria.
- **Sí:** prerrelleno con `suggestAlias` y editable. Ahorra escribir y respeta el formato de `scores.player_name`.
- **Sí:** el guardián vive en el cliente (`components/alias-guard.tsx`). Las páginas siguen estáticas o con PPR, como en la SPEC 12; `proxy.ts` sigue sin redirigir.
- **No:** comprobar el alias en `proxy.ts`. Obligaría a leer el usuario en cada petición para redirigir y mezclaría responsabilidades.
- **Sí:** vinculación automática de identidades (comportamiento por defecto de Supabase). Un mismo correo verificado es la misma persona y conserva su alias.
- **No:** cuentas separadas por proveedor. Confuso y duplicaría jugadores.
- **Sí:** botones de OAuth en las dos pestañas. Con OAuth, registrarse y entrar son la misma acción.
- **Sí:** icono de cuenta solo en móvil y escritorio estrecho (≤ 960 px). Arregla el desbordamiento sin perder el alias visible en escritorio.
- **No:** icono en todos los tamaños. Se perdería el alias en la barra de escritorio.
- **No:** compactar la barra ni ocultar del todo el acceso a la cuenta en móvil. Opciones consideradas; el usuario eligió el icono.
- **Sí:** el menú de cuenta muestra el alias en los dos tamaños. Un solo componente, y en móvil es el único sitio donde se ve.
- **Sí:** el desbordamiento del nav va en esta spec y no en una propia, porque se toca el mismo componente. Decisión del usuario.
- **Sí:** subir el corte del nav compacto a 960 px (decisión del usuario en el paso 8). Es un único cambio de media query.
- **No:** ocultar `CRÉDITOS · 03` entre 841 y ~1000 px. Se valoró como alternativa al nuevo corte.
- **Sí:** arreglar `.activity-card` de la landing aquí, para que el criterio de `/` a 360 px se cumpla tal como está escrito (decisión del usuario en el paso 8).
- **No:** el foco de teclado de `.btn` en esta spec. Es un estilo global y va en otra.

---

## Riesgos

| Riesgo                                                                                                                        | Mitigación                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| La pantalla de consentimiento de Google en modo de prueba solo deja entrar a los usuarios de prueba que se añadan.            | Se documenta en `CLAUDE.md`. Publicarla queda fuera de alcance. Las pruebas se hacen con cuentas añadidas como _test users_.                        |
| GitHub con el correo privado: Supabase puede no recibir un correo verificado y no vincular con la cuenta de correo existente. | Supabase pide el scope `user:email`. Si aun así no vincula, se crea una cuenta nueva con alias propio. Se anota en «Problemas conocidos» si ocurre. |
| El guardián redirige en bucle si `hasAlias` no se actualiza tras guardar.                                                     | `saveAliasAction` va seguido de `refresh()` antes de navegar, y `/acceso/alias` está exenta del guardián.                                           |
| Mientras se lee la sesión, una página se ve un instante antes de redirigir a `/acceso/alias`.                                 | Aceptado: es una cuenta nueva, una sola vez. El guardián actúa en cuanto `ready` es `true`.                                                         |
| El origen tomado de las cabeceras es incorrecto detrás de un proxy inverso en producción.                                     | Se usa `origin`/`x-forwarded-host` y Supabase valida contra _Redirect URLs_. Si falla al desplegar, se añade la variable entonces.                  |
| Cambios de diseño del nav en móvil que rompan el panel de la hamburguesa.                                                     | El criterio de 360/390 px se comprueba con y sin sesión, y el panel no se toca.                                                                     |

---

## Lo que **no** está en esta spec

- Puntuaciones vinculadas a la cuenta (SPEC 14).
- Cambiar el alias, perfil, alias único y `profiles`.
- Otros proveedores, avatar del proveedor y gestión de identidades.
- Foco de teclado de `.btn` y glifos de la fuente pixel.
- Publicación de la pantalla de consentimiento de Google.

Cada una de estas, si llega, irá en su propia spec.
