# SPEC 12 — Registro, login y autenticación con correo y contraseña

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 02, SPEC 04
> **Fecha:** 2026-11-12
> **Objetivo:** Sustituir la sesión simulada de `/acceso` por cuentas reales de Supabase Auth con correo y contraseña, confirmación por correo, recuperación de contraseña y cierre de sesión.

---

## Por qué existe esta spec

Hoy `/acceso` es una maqueta: `AuthFormView` guarda solo un nombre en `localStorage` (`av_user`) e ignora el correo y la contraseña. Los botones GOOGLE y GITHUB no hacen nada.

La autenticación completa se ha dividido en tres specs:

- **SPEC 12 (esta):** cuentas con correo y contraseña, sesión SSR y menú de cuenta.
- **SPEC 13:** OAuth con Google y GitHub, más la pantalla «elige tu alias» para el primer acceso por OAuth.
- **SPEC 14:** puntuaciones vinculadas a la cuenta (`scores.user_id`) y alias fijo en el modal de fin con sesión iniciada.

Esta spec no toca la base de datos. El alias vive en `user_metadata` de Supabase Auth.

---

## Alcance

**Dentro:**

- **Configuración de Supabase Auth** (manual, en el panel del proyecto; el MCP no la expone):
  - _Confirm email_ activado.
  - Longitud mínima de contraseña: 8.
  - _Site URL_ `http://localhost:3000` y la misma URL en _Redirect URLs_.
  - SMTP propio con **Resend** y el mismo remitente que `CONTACT_FROM_EMAIL`.
  - Plantillas de correo con enlaces `token_hash` hacia `/auth/confirm`.
- **Sesión SSR:**
  - `proxy.ts` en la raíz refresca las cookies de sesión en cada petición de página.
  - No protege rutas: ninguna página exige sesión.
- **Pestaña CREAR CUENTA de `/acceso`:**
  - Campos: Alias, Correo y Contraseña.
  - El alias se pasa a mayúsculas al escribir y se valida con `^[A-Z0-9_]{1,10}$` (el mismo formato que `scores.player_name`).
  - Al enviar, el formulario se sustituye por el aviso `▸ REVISA TU CORREO PARA ACTIVAR LA CUENTA_` con el correo introducido.
- **Pestaña INICIAR SESIÓN de `/acceso`:**
  - Campos: Correo y Contraseña. El campo «Usuario» desaparece de esta pestaña.
  - Enlace `¿OLVIDASTE TU CONTRASEÑA?` a `/acceso/recuperar`.
  - Al entrar, va a `?next=` si es una ruta interna y, si no, a `/juegos`.
- **Confirmación de correo:**
  - Ruta `GET /auth/confirm` que verifica el `token_hash` y abre sesión.
  - Si va bien, redirige a `next` (ruta interna) o a `/juegos`.
  - Si el enlace está caducado o no es válido, redirige a `/acceso?error=enlace`, que muestra `▸ ENLACE CADUCADO O NO VÁLIDO_`.
- **Recuperación de contraseña:**
  - `/acceso/recuperar`: pide el correo y muestra siempre `▸ SI EL CORREO EXISTE, TE HEMOS ENVIADO UN ENLACE_`.
  - El enlace del correo pasa por `/auth/confirm` (`type=recovery`) y llega a `/acceso/nueva-clave`.
  - `/acceso/nueva-clave`: nueva contraseña y repetición. Al guardar, va a `/juegos` con la sesión abierta.
  - Sin sesión de recuperación, `/acceso/nueva-clave` muestra `▸ ENLACE CADUCADO O NO VÁLIDO_` y un enlace a `/acceso/recuperar`.
- **Cierre de sesión:**
  - El botón `ALIAS ▾` del nav abre un menú desplegable con el correo y `CERRAR SESIÓN`. Un clic ya no cierra la sesión directamente.
  - En el panel móvil, con sesión, el enlace «Cuenta» se sustituye por el alias y un botón `CERRAR SESIÓN`.
  - Al cerrar sesión, el jugador se queda en la página en la que estaba.
- **`/acceso` con sesión ya iniciada:** en lugar del formulario muestra `▸ SESIÓN INICIADA COMO <ALIAS>_` y los botones `IR A LA BIBLIOTECA` y `CERRAR SESIÓN`.
- **Invitado:**
  - Sin sesión, `JUGAR COMO INVITADO` va a `/juegos` sin tocar nada.
  - Con sesión, el botón no se muestra.
  - El invitado sigue guardando con nombre libre, como hoy.
- **Botones GOOGLE y GITHUB:** se ocultan, junto con el divisor `O CONTINÚA CON`, hasta la SPEC 13.
- **`SessionProvider`:**
  - Lee la sesión real de Supabase en el cliente.
  - Mantiene `user.name`, ahora con el alias, para que `GamePlayer` y el nav sigan funcionando sin cambios de uso.
- **Limpieza:**
  - La clave `av_user` de `localStorage` deja de usarse y se borra al cargar.
  - `av_scores` (partidas simuladas) no cambia.
- **Documentación:** `CLAUDE.md` refleja la auth real (ruta `/acceso`, módulos que hablan con Supabase y configuración manual).

**Fuera de alcance (para futuras specs):**

- OAuth con Google y GitHub y la pantalla «elige tu alias» (SPEC 13).
- Columna `user_id` en `scores`, guardado vinculado a la cuenta y alias no editable en el modal de fin (SPEC 14).
- Unicidad del alias: dos cuentas pueden tener el mismo alias.
- Editar el alias, el correo o la contraseña desde una página de perfil.
- Borrar la cuenta.
- Rutas protegidas que exijan sesión.
- URLs de producción en Supabase (_Site URL_ y _Redirect URLs_): se añaden al desplegar.
- Inicio de sesión con alias en lugar de correo.
- Enlace mágico, 2FA y captcha.

---

## Modelo de datos

No hay migraciones ni tablas nuevas. El alias se guarda en los metadatos del usuario de Supabase Auth:

```ts
// auth.users.raw_user_meta_data (se escribe en signUp con options.data)
type UserMetadata = { alias: string }; // ^[A-Z0-9_]{1,10}$
```

Usuario expuesto por `SessionProvider` (`lib/session.ts`):

```ts
export type SessionUser = {
  id: string; // auth.users.id
  email: string;
  name: string; // user_metadata.alias; "JUGADOR" si falta
};

type SessionContextValue = {
  user: SessionUser | null;
  /** false hasta la primera lectura de la sesión (evita el parpadeo de «Iniciar sesión» en el nav). */
  ready: boolean;
  /** Vuelve a leer la sesión tras una Server Action que la cambie. */
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};
```

`login(user)` desaparece del contexto.

Reglas compartidas entre cliente y servidor (`lib/auth-rules.ts`):

```ts
export const ALIAS_RE = /^[A-Z0-9_]{1,10}$/;
export const MIN_PASSWORD = 8;
/** Solo rutas internas ("/..." sin "//"); cualquier otra cosa → "/juegos". */
export function safeNext(next: string | null | undefined): string;
```

Resultado de las Server Actions (`app/acceso/actions.ts`):

```ts
export type AuthError =
  | "invalid_input" // alias, correo o contraseña no válidos
  | "invalid_credentials" // correo o contraseña incorrectos
  | "email_not_confirmed"
  | "weak_password"
  | "same_password" // la nueva contraseña es igual a la anterior
  | "no_session" // nueva-clave sin sesión de recuperación
  | "rate_limited"
  | "unknown"; // red o error inesperado de Supabase

export type AuthResult = { ok: true } | { ok: false; error: AuthError };
```

Mensajes de la UI por error:

| `AuthError`           | Mensaje                                                 |
| --------------------- | ------------------------------------------------------- |
| `invalid_input`       | Mensaje del campo concreto (alias, correo o contraseña) |
| `invalid_credentials` | `▸ CORREO O CONTRASEÑA INCORRECTOS_`                    |
| `email_not_confirmed` | `▸ CONFIRMA TU CORREO ANTES DE ENTRAR_`                 |
| `weak_password`       | `▸ LA CONTRASEÑA DEBE TENER AL MENOS 8 CARACTERES_`     |
| `same_password`       | `▸ LA NUEVA CONTRASEÑA DEBE SER DISTINTA_`              |
| `no_session`          | `▸ ENLACE CADUCADO O NO VÁLIDO_`                        |
| `rate_limited`        | `▸ DEMASIADOS INTENTOS — ESPERA UN MINUTO_`             |
| `unknown`             | `▸ SEÑAL PERDIDA — REINTENTA_`                          |

Rutas nuevas o modificadas:

| Ruta                  | Tipo                    | Función                                                    |
| --------------------- | ----------------------- | ---------------------------------------------------------- |
| `/acceso`             | Página (modificada)     | Login, registro, aviso de confirmación y estado con sesión |
| `/acceso/recuperar`   | Página nueva            | Pide el correo para recuperar la contraseña                |
| `/acceso/nueva-clave` | Página nueva            | Fija la nueva contraseña con la sesión de recuperación     |
| `/auth/confirm`       | Route Handler (`GET`)   | `verifyOtp` del `token_hash` y redirección                 |
| `proxy.ts`            | Proxy de Next 16 (raíz) | Refresca las cookies de sesión                             |

Plantillas de correo (Supabase → Auth → Email Templates):

- **Confirm signup:** `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
- **Reset password:** `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/acceso/nueva-clave`

---

## Plan de implementación

1. **Configurar Supabase Auth a mano** con el checklist de «Alcance»: confirmación, mínimo de 8, _Site URL_ y _Redirect URLs_ de localhost, SMTP de Resend y las dos plantillas. Comprobación: desde el panel, _Send test email_ (o un registro de prueba) llega a un correo que no es del equipo del proyecto.
2. **Crear `lib/auth-rules.ts`** con `ALIAS_RE`, `MIN_PASSWORD` y `safeNext`. No lo usa nadie todavía: el build sigue pasando.
3. **Crear `lib/supabase/proxy.ts`** (función `updateSession(request)` con `createServerClient` sobre las cookies de la petición y la respuesta, y llamada a `auth.getUser()`) **y `proxy.ts`** en la raíz. El `matcher` excluye `_next/static`, `_next/image`, `favicon.ico` y los archivos de `public/` (imágenes, `games/`). Comprobación: la app carga igual y los assets de REBOTE siguen cargando.
4. **Crear `app/auth/confirm/route.ts`**: lee `token_hash`, `type` (`email` | `recovery`) y `next`, llama a `verifyOtp` con el cliente de `lib/supabase/server.ts` y redirige a `safeNext(next)` o a `/acceso?error=enlace`.
5. **Crear `app/acceso/actions.ts`** con `signUpAction`, `signInAction`, `requestPasswordResetAction`, `updatePasswordAction` y `signOutAction`:
   - Validan con `lib/auth-rules.ts` antes de llamar a Supabase.
   - Traducen los códigos de error de Supabase a `AuthError`.
   - Registran la causa con `console.error`, como `saveScoreAction`.
   - `requestPasswordResetAction` devuelve `{ ok: true }` aunque el correo no exista.
6. **Reescribir la parte de usuario de `lib/session.ts` y `components/session-provider.tsx`**:
   - Snapshot con `createClient()` de `lib/supabase/client.ts`: `auth.getUser()` al montar y `onAuthStateChange` para los cambios.
   - Mapeo a `SessionUser`, `ready`, `refresh()` y `logout()` (que llama a `signOutAction` y después a `refresh()`).
   - Borrado de `av_user`.
   - En el mismo paso, `AuthFormView` deja de usar `login()`: provisionalmente llama a `signInAction` con los campos actuales, para que el build siga pasando.
7. **Rehacer `components/auth-form.tsx`**:
   - Pestañas con los campos de «Alcance» y mensajes por `AuthError`.
   - Estado `enviando` con el botón deshabilitado.
   - Aviso «revisa tu correo» tras registrarse.
   - Lectura de `?next=` y de `?error=enlace`.
   - Enlace `¿OLVIDASTE TU CONTRASEÑA?`.
   - Botones OAuth ocultos y `JUGAR COMO INVITADO` solo sin sesión.
   - Estado «sesión iniciada como».
   - Diseño con `/frontend-design` reutilizando las clases `.auth-*` y `.field` existentes.
8. **Crear `app/acceso/recuperar/page.tsx`** con su formulario cliente (correo → `requestPasswordResetAction` → mensaje fijo).
9. **Crear `app/acceso/nueva-clave/page.tsx`** con su formulario cliente (nueva contraseña y repetición → `updatePasswordAction`). Si no hay sesión (`ready && !user`), muestra el aviso de enlace caducado.
10. **Menú de cuenta en `components/nav.tsx`**:
    - Desplegable bajo `ALIAS ▾` con el correo y `CERRAR SESIÓN`. Se cierra con clic fuera y con `Esc`.
    - Mientras `!ready`, el botón de cuenta no se muestra, para que no parpadee «Iniciar sesión».
    - Mismo cambio en el panel móvil.
11. **Actualizar `CLAUDE.md`**:
    - Ruta `/acceso` con auth real y nuevas rutas `/acceso/recuperar`, `/acceso/nueva-clave` y `/auth/confirm`.
    - En «Acceso» a Supabase, añadir `lib/session.ts` (cliente de navegador, solo auth), `lib/supabase/proxy.ts` y `app/acceso/actions.ts`.
    - Nota de la configuración manual de Auth (SMTP de Resend, plantillas y URLs).

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] Registrarse con alias `PX_KAI`, un correo real y una contraseña de 8 caracteres muestra `▸ REVISA TU CORREO PARA ACTIVAR LA CUENTA_` y llega un correo enviado por Resend.
- [ ] Antes de confirmar, iniciar sesión con esa cuenta muestra `▸ CONFIRMA TU CORREO ANTES DE ENTRAR_`.
- [ ] Abrir el enlace de confirmación lleva a `/juegos` con la sesión iniciada, y el nav muestra `PX_KAI ▾`.
- [ ] Abrir de nuevo el mismo enlace de confirmación lleva a `/acceso?error=enlace` y muestra `▸ ENLACE CADUCADO O NO VÁLIDO_`.
- [ ] Registrarse con un alias en minúsculas lo convierte a mayúsculas. Un alias con `-` o de más de 10 caracteres no se envía y muestra el error del campo.
- [ ] Una contraseña de 7 caracteres no se envía y muestra el error del campo, tanto en el registro como en `/acceso/nueva-clave`.
- [ ] Iniciar sesión con una contraseña incorrecta muestra `▸ CORREO O CONTRASEÑA INCORRECTOS_`.
- [ ] Iniciar sesión desde `/acceso?next=/salon` lleva a `/salon`.
- [ ] Iniciar sesión desde `/acceso?next=https://ejemplo.com` lleva a `/juegos`.
- [ ] Iniciar sesión desde `/acceso?next=//ejemplo.com` lleva a `/juegos`.
- [ ] Recargar la página con sesión iniciada mantiene la sesión. El nav nunca muestra «Iniciar sesión» mientras carga.
- [ ] En `/juegos/<id>/jugar` con sesión, el campo de nombre del modal de fin aparece prerrellenado con el alias.
- [ ] `ALIAS ▾` abre el menú con el correo y `CERRAR SESIÓN`. Pulsarlo cierra la sesión sin cambiar de página, y el nav vuelve a mostrar «Iniciar sesión».
- [ ] `/acceso/recuperar` muestra `▸ SI EL CORREO EXISTE, TE HEMOS ENVIADO UN ENLACE_` tanto con un correo registrado como con uno inexistente.
- [ ] El enlace de recuperación lleva a `/acceso/nueva-clave`. Al guardar una contraseña nueva, el jugador llega a `/juegos` con sesión y después puede entrar con la contraseña nueva.
- [ ] Abrir `/acceso/nueva-clave` sin sesión muestra `▸ ENLACE CADUCADO O NO VÁLIDO_` y el enlace a `/acceso/recuperar`.
- [ ] Con sesión, `/acceso` muestra `▸ SESIÓN INICIADA COMO <ALIAS>_` y no muestra el formulario ni `JUGAR COMO INVITADO`.
- [ ] Sin sesión, `JUGAR COMO INVITADO` lleva a `/juegos`, y el modal de fin permite guardar con nombre libre como antes.
- [ ] `/acceso` no muestra los botones GOOGLE ni GITHUB ni el divisor `O CONTINÚA CON`.
- [ ] Tras cargar la app, `localStorage` no contiene `av_user`.
- [ ] Ningún componente de `components/` importa `@supabase/*` ni `lib/supabase/*`.

---

## Decisiones

- **Sí:** Supabase Auth con correo y contraseña. El proyecto ya usa Supabase y `@supabase/ssr`.
- **Sí:** dividir en tres specs (12 correo, 13 OAuth y alias, 14 puntuaciones con `user_id`). Juntas tocaban auth, UI, base de datos y guardado de partidas.
- **Sí:** alias en `user_metadata.alias`. Decisión del usuario: sin tabla `profiles` y sin migración.
- **Consecuencia aceptada:** el alias no es único. Hoy los nombres de `scores` tampoco lo son.
- **No:** tabla `profiles` con alias único. Se valoró y se descartó por ahora.
- **Sí:** iniciar sesión con correo. Es lo que admite `signInWithPassword`.
- **No:** iniciar sesión con alias. Con el alias en metadatos, haría falta una función `SECURITY DEFINER` que revelaría qué alias existen.
- **Sí:** confirmación por correo obligatoria. Evita cuentas con correos ajenos.
- **Sí:** Resend como SMTP de Supabase. El SMTP integrado solo envía a los correos del equipo y con un límite muy bajo.
- **Sí:** enlaces con `token_hash` verificados en `/auth/confirm` con `verifyOtp`. Funcionan aunque el correo se abra en otro navegador, a diferencia del flujo PKCE con `code`.
- **Sí:** tras confirmar el correo se va a `/juegos`. El `?next=` solo se respeta al iniciar sesión, para no complicar las plantillas de correo.
- **Sí:** `SessionProvider` en el cliente sobre el cliente de navegador de Supabase. Las páginas siguen estáticas o con PPR.
- **No:** leer el usuario en el layout del servidor. Obligaría a usar `cookies()` en el layout y rompería el cacheo de Cache Components.
- **Sí:** registro, login, logout y recuperación por Server Actions, como `saveScoreAction`. El cliente de navegador solo se usa para leer la sesión.
- **Sí:** `lib/session.ts` pasa a ser un punto de acceso a Supabase permitido. Es una excepción a «los componentes no importan `lib/supabase/*`», que se mantiene para `components/`.
- **Sí:** `proxy.ts` solo refresca la sesión y no protege rutas. Ninguna página exige cuenta.
- **Sí:** `?next=` restringido a rutas internas con `safeNext`, para evitar redirecciones abiertas.
- **Sí:** contraseña de mínimo 8 caracteres, validada en el cliente, en el servidor y en Supabase.
- **Sí:** respuestas que no revelan si un correo existe. La recuperación siempre muestra el mismo mensaje, y Supabase, con la confirmación activada, responde igual al registrar un correo que ya existe.
- **Sí:** menú desplegable para cerrar sesión. El clic directo de hoy cerraba la sesión por error.
- **Sí:** el invitado sigue existiendo. `JUGAR COMO INVITADO` no cierra la sesión y solo aparece sin ella.
- **Sí:** se ocultan los botones de OAuth hasta la SPEC 13, para no tener botones que no hacen nada.
- **Sí:** `/acceso` con sesión muestra «sesión iniciada como» en lugar del formulario. Es el destino del enlace «Cuenta» del panel móvil. La propone esta spec y no se preguntó: se puede ajustar en la revisión.
- **Sí:** se borra `av_user`. La sesión simulada desaparece.
- **No:** migrar `av_user` a una cuenta. No hay contraseña ni correo que migrar.
- **Sí:** solo URLs de localhost en Supabase por ahora. Producción se añade al desplegar.

---

## Riesgos

| Riesgo                                                                                                                               | Mitigación                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resend sin dominio verificado solo entrega al correo dueño de la cuenta, así que el registro de otros jugadores no recibe el correo. | El paso 1 comprueba el envío a un correo ajeno. Sin dominio verificado, la spec no se puede cerrar: se anota en «Problemas conocidos».                                                                                 |
| Tras una Server Action que fija las cookies, el cliente de navegador podría seguir con la sesión anterior en memoria.                | `refresh()` vuelve a leer con `auth.getUser()` después de cada acción, y el formulario llama además a `router.refresh()`. Si aun así no se actualiza, se documenta y se recarga la sesión con `auth.refreshSession()`. |
| `proxy.ts` sin `matcher` correcto interceptaría assets (`/games/rebote/…`) y añadiría latencia o rompería cargas.                    | El `matcher` excluye `_next/*` y los archivos de `public/`. Hay un criterio de aceptación que comprueba REBOTE.                                                                                                        |
| Al desplegar, los correos siguen apuntando a `localhost:3000`.                                                                       | Está fuera de alcance de forma explícita. `CLAUDE.md` anota que hay que cambiar _Site URL_ y _Redirect URLs_ al desplegar.                                                                                             |
| El límite de envíos de Auth (por defecto, pocos correos por hora) bloquea las pruebas.                                               | Con SMTP propio el límite se sube en Auth → Rate Limits. El error se muestra como `rate_limited`.                                                                                                                      |
| Dos jugadores con el mismo alias se confunden en el leaderboard.                                                                     | Es una consecuencia aceptada de la decisión de usar metadatos. La SPEC 14 vincula las puntuaciones a `user_id`. Si molesta, se hará una spec de `profiles` con alias único.                                            |
| El alias en `user_metadata` lo puede cambiar el propio usuario con `auth.updateUser`.                                                | Por ahora solo es un nombre visible, no un permiso. La SPEC 14 no debe usarlo para autorizar nada.                                                                                                                     |

---

## Problemas conocidos

- **Sin dominio verificado en Resend** (2026-11-12): el SMTP de Supabase usa `onboarding@resend.dev`, así que los correos de confirmación y recuperación solo llegan al correo dueño de la cuenta de Resend. El registro de terceros no recibe el correo hasta verificar un dominio en Resend y cambiar el _Sender email_ de Supabase (y `CONTACT_FROM_EMAIL`). Las pruebas de aceptación se hacen con ese correo.

---

## Lo que **no** está en esta spec

- OAuth con Google y GitHub y la pantalla de alias (SPEC 13).
- `scores.user_id`, guardado vinculado a la cuenta y alias fijo en el modal de fin (SPEC 14).
- Alias único o tabla `profiles`.
- Página de perfil (editar alias, correo o contraseña) y borrado de cuenta.
- Rutas protegidas.
- Configuración de producción (_Site URL_ y _Redirect URLs_ del dominio final).
- Inicio de sesión con alias, enlace mágico, 2FA y captcha.

Cada una de estas, si llega, irá en su propia spec.
