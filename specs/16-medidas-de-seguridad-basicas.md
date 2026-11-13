# SPEC 16 — Medidas de seguridad básicas

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 12, SPEC 14
> **Fecha:** 2026-11-13
> **Objetivo:** Cerrar el checklist de `references/security/security-checklist.md`: comprobar RLS, exigir contraseñas de 8 o más con minúscula, mayúscula, dígito y símbolo, limitar registros e inicios de sesión por IP, añadir cabeceras HTTP de seguridad y quitar el aviso del asesor sobre `rls_auto_enable()`.

---

## Por qué existe esta spec

El checklist de seguridad básico pide cinco cosas. Estado antes de esta spec (revisado con el MCP de Supabase y `next.config.ts` el 2026-11-13):

| Punto del checklist               | Estado                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| RLS en `games` y `scores`         | Activo en las dos. `games`: lectura pública. `scores`: lectura pública e insert propio o anónimo (SPEC 14).                          |
| Contraseña mínima de 8            | Configurada en el panel según `CLAUDE.md` (SPEC 12); `lib/auth-rules.ts` ya exige `MIN_PASSWORD = 8`. Falta comprobarlo en el panel. |
| Leaked password protection        | Desactivada (aviso `auth_leaked_password_protection` del asesor). Solo existe en el plan Pro o superior, y el proyecto está en Free. |
| Límite de registros por IP        | Sin revisar; el valor por defecto de Supabase es 30 cada 5 minutos.                                                                  |
| Cabeceras de seguridad en Next.js | `next.config.ts` no define ninguna.                                                                                                  |

Además, el usuario pide (2026-11-13) que la contraseña cumpla el requisito **«Lowercase, uppercase letters, digits and symbols (recommended)»** de Supabase. Hoy la app solo comprueba la longitud (`MIN_PASSWORD` en `lib/auth-rules.ts`, `components/auth-form.tsx`, `components/new-password-form.tsx` y `app/acceso/actions.ts`), y el mensaje `weak_password` solo habla de los 8 caracteres.

El asesor de seguridad también avisa (dos veces, `WARN`) de que `public.rls_auto_enable()`, función `SECURITY DEFINER` del event trigger `ensure_rls`, se puede ejecutar por `/rest/v1/rpc/rls_auto_enable` como `anon` y como `authenticated`. No está en el checklist, pero entra en esta spec.

---

## Alcance

**Dentro:**

- **RLS:** comprobar con SQL que `games` y `scores` tienen `relrowsecurity = true` y sus políticas. No se cambia nada.
- **Contraseña mínima:** comprobar en Auth → Providers → Email que el mínimo es 8. Si no lo es, ponerlo a 8.
- **Requisitos de la contraseña:** 8 o más caracteres con, al menos, una minúscula (`a-z`), una mayúscula (`A-Z`), un dígito (`0-9`) y un símbolo del mismo set que Supabase: ``!@#$%^&*()_+-=[]{};'\:"|<>?,./`~``.
  - **Panel:** _Password requirements_ en «Lowercase, uppercase letters, digits and symbols (recommended)» (Auth → Providers → Email, manual).
  - **Reglas compartidas** en `lib/auth-rules.ts`: `PASSWORD_SYMBOLS`, `passwordChecks()` e `isStrongPassword()`.
  - **Server Actions:** `signUpAction` y `updatePasswordAction` validan con `isStrongPassword` y, si no se cumple, devuelven `weak_password` (antes `invalid_input`).
  - **Cliente:** la pestaña de registro de `/acceso` (`components/auth-form.tsx`) y `/acceso/nueva-clave` (`components/new-password-form.tsx`) validan con `isStrongPassword` antes de enviar.
  - **Lista de requisitos en vivo** bajo el campo de contraseña, en esas dos pantallas: componente nuevo `components/password-requirements.tsx`, con cinco líneas (`8+ CARACTERES`, `MINÚSCULA`, `MAYÚSCULA`, `DÍGITO`, `SÍMBOLO`) que pasan de apagadas a cian al cumplirse. Diseñado con `/frontend-design`, con la estética de `components/auth-ui.tsx`.
  - **Accesibilidad:** el input lleva `aria-describedby` hacia la lista, y cada línea tiene un texto `sr-only` «cumplido» o «pendiente». La lista no usa `aria-live` (anunciaría cada tecla).
  - **Mensajes:** `weak_password` y `FIELD_MESSAGES.password` (`components/auth-ui.tsx`) pasan a `▸ LA CONTRASEÑA NO CUMPLE LOS REQUISITOS_`.
  - **Cuentas existentes:** siguen entrando aunque su contraseña no cumpla. El login (`signInAction` y la pestaña de inicio de sesión) no valida la fortaleza, igual que hoy no valida la longitud.
- **Leaked password protection:** no se activa (plan Free). Queda en «Problemas conocidos» de `CLAUDE.md` y en el checklist, y el aviso del asesor se acepta.
- **Límite de registros e inicios de sesión por IP:** en Auth → Rate Limits, _sign-ups and sign-ins_ a **5 cada 5 minutos** (configuración manual en el panel; el MCP no la expone).
- **Mensaje claro al llegar al límite:**
  - `mapError` de `app/acceso/actions.ts` ya traduce `over_request_rate_limit`, `over_email_send_rate_limit` y cualquier `429` a `rate_limited`. Se comprueba que el registro y el login llegan a ese caso.
  - El texto de `rate_limited` en `components/auth-ui.tsx` pasa de `▸ DEMASIADOS INTENTOS — ESPERA UN MINUTO_` a `▸ DEMASIADOS INTENTOS — ESPERA UNOS MINUTOS_`, porque la ventana es de 5 minutos.
- **Cabeceras HTTP de seguridad** en `next.config.ts`, con `async headers()` y `source: "/(.*)"`, en todas las rutas:

  | Cabecera                    | Valor                                      |
  | --------------------------- | ------------------------------------------ |
  | `X-Content-Type-Options`    | `nosniff`                                  |
  | `X-Frame-Options`           | `DENY`                                     |
  | `Referrer-Policy`           | `strict-origin-when-cross-origin`          |
  | `Strict-Transport-Security` | `max-age=63072000; includeSubDomains`      |
  | `Permissions-Policy`        | `camera=(), microphone=(), geolocation=()` |

- **`rls_auto_enable()`:** migración `revoke_rls_auto_enable_execute` que revoca `EXECUTE` a `public`, `anon` y `authenticated`. El event trigger `ensure_rls` sigue funcionando porque lo dispara Postgres, no un rol de la API.
- **Checklist:** marcar `[x]` en `references/security/security-checklist.md` lo que quede hecho o comprobado, y anotar junto a «Leaked password protection» que no está disponible en el plan Free.
- **Documentación:** `CLAUDE.md` recoge el rate limit, las cabeceras, la migración y el problema conocido.
- **Protección de rutas con el Proxy de Next.js** (`proxy.ts`, ver https://nextjs.org/docs/app/getting-started/proxy y `node_modules/next/dist/docs/`), _concretado al empezar la implementación, 2026-11-13_:
  - **Sin sesión:** `/acceso/alias` y `/acceso/nueva-clave` redirigen a `/acceso?next=<ruta original con su query>`.
  - **Con sesión:** `/acceso` y `/acceso/recuperar` redirigen a `safeNext(next)` (por defecto `DEFAULT_NEXT` = `/juegos`; si `next` apunta a otra ruta solo para invitados, también `/juegos`, para no entrar en bucle). Solo se redirigen peticiones GET y HEAD: las Server Actions son POST a la propia ruta. Sustituye al estado «sesión iniciada como» de `/acceso` (SPEC 12).
  - El usuario sale del `getUser()` que ya hace `updateSession` (`lib/supabase/proxy.ts`), sin otra llamada a Supabase. La redirección conserva las cookies de sesión que `updateSession` haya refrescado.
  - `/auth/*` y el resto de rutas no cambian: siguen siendo públicas.

**Fuera de alcance (para futuras specs):**

- Content-Security-Policy (con Next 16, PPR, scripts en línea y fotos de Google y GitHub merece su propia spec).
- CAPTCHA en registro e inicio de sesión (Turnstile o hCaptcha).
- Reenviar la IP real del jugador a Supabase Auth para que el rate limit cuente por jugador y no por servidor.
- Rate limit propio en las Server Actions (`saveScoreAction`, formulario de contacto).
- Pasar al plan Pro para activar la protección contra contraseñas filtradas.
- Cambiar `leaderboard` a `security_invoker` (aviso `security_definer_view` aceptado en SPEC 14).
- `poweredByHeader: false` y otras cabeceras no listadas arriba.
- Obligar a cambiar la contraseña a las cuentas existentes que no cumplan los requisitos.
- Medidor de fortaleza (entropía, zxcvbn) más allá de los cinco requisitos.

---

## Modelo de datos

No hay tablas ni columnas nuevas.

Novedades en `lib/auth-rules.ts` (sin dependencias, compartidas por cliente y servidor):

```ts
/** Símbolos aceptados: el mismo set que Supabase Auth (SPEC 16). */
export const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

/** Requisitos de la contraseña, en el orden en que se muestran. */
export const PASSWORD_CHECKS = [
  "length",
  "lower",
  "upper",
  "digit",
  "symbol",
] as const;
export type PasswordCheck = (typeof PASSWORD_CHECKS)[number];

/** Qué requisitos cumple una contraseña: length ≥ MIN_PASSWORD, a-z, A-Z, 0-9 y un símbolo de PASSWORD_SYMBOLS. */
export function passwordChecks(
  password: string,
): Record<PasswordCheck, boolean>;

/** true si cumple los cinco requisitos. */
export function isStrongPassword(password: string): boolean;
```

| Contraseña  | length | lower | upper | digit | symbol | `isStrongPassword` |
| ----------- | ------ | ----- | ----- | ----- | ------ | ------------------ |
| `Abcdef1!`  | ✓      | ✓     | ✓     | ✓     | ✓      | `true`             |
| `abcdefg1!` | ✓      | ✓     | ✗     | ✓     | ✓      | `false`            |
| `ABCDEFG1!` | ✓      | ✗     | ✓     | ✓     | ✓      | `false`            |
| `Abcdefgh!` | ✓      | ✓     | ✓     | ✗     | ✓      | `false`            |
| `Abcdefg1`  | ✓      | ✓     | ✓     | ✓     | ✗      | `false`            |
| `Ab1!`      | ✗      | ✓     | ✓     | ✓     | ✓      | `false`            |
| `Ñandú123ñ` | ✓      | ✓     | ✗     | ✓     | ✗      | `false`            |
| `Abcdef1 `  | ✓      | ✓     | ✓     | ✓     | ✗      | `false`            |

(La `Ñ` y las tildes no cuentan como mayúscula, minúscula ni símbolo; el espacio tampoco es símbolo.)

Componente nuevo `components/password-requirements.tsx`:

```ts
type PasswordRequirementsProps = {
  id: string; // para el aria-describedby del input
  password: string;
};
```

Etiquetas: `length` → `8+ CARACTERES`, `lower` → `MINÚSCULA`, `upper` → `MAYÚSCULA`, `digit` → `DÍGITO`, `symbol` → `SÍMBOLO`.

Permisos en la base de datos:

```sql
-- supabase/migrations/<version>_revoke_rls_auto_enable_execute.sql
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

`lib/supabase/database.types.ts` no cambia (la función devuelve `event_trigger` y no aparece en los tipos), pero se regenera igualmente para confirmarlo.

Configuración nueva en `next.config.ts`:

```ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// dentro de nextConfig
async headers() {
  return [{ source: "/(.*)", headers: securityHeaders }];
},
```

Configuración manual en el panel de Supabase:

| Panel                    | Ajuste                                | Valor                                                          |
| ------------------------ | ------------------------------------- | -------------------------------------------------------------- |
| Auth → Providers → Email | Minimum password length               | 8                                                              |
| Auth → Providers → Email | Password requirements                 | Lowercase, uppercase letters, digits and symbols (recommended) |
| Auth → Rate Limits       | Sign-ups and sign-ins (por IP, 5 min) | 5                                                              |
| Auth → Providers → Email | Leaked password protection            | No disponible en Free                                          |

---

## Plan de implementación

1. **Comprobar RLS** con `execute_sql` sobre `pg_class` y `pg_policy`: `games` y `scores` con `relrowsecurity = true`, `games` con la política de lectura y `scores` con lectura e insert. Sin cambios en código.
2. **Revocar `EXECUTE` de `rls_auto_enable()`** con `apply_migration` (`revoke_rls_auto_enable_execute`) y guardar el `.sql` idéntico en `supabase/migrations/` con la versión que devuelva `list_migrations`. Regenerar `lib/supabase/database.types.ts`. Comprobación:
   - `has_function_privilege('anon', 'public.rls_auto_enable()', 'execute')` y la misma con `authenticated` devuelven `false`.
   - `get_advisors` (security) ya no muestra `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable`.
3. **Cabeceras de seguridad** en `next.config.ts`, consultando antes `node_modules/next/dist/docs/` (guía de `headers` en `next.config.js`). Comprobación: con `npm run build` y `npm run start`, `curl -I` a `/`, `/juegos`, `/acceso` y `/juegos/asteroides/jugar` devuelve las cinco cabeceras. Las fotos de Google y GitHub del nav siguen cargando y el login con OAuth sigue funcionando.
4. **Reglas de contraseña en `lib/auth-rules.ts`:** `PASSWORD_SYMBOLS`, `PASSWORD_CHECKS`, `passwordChecks` e `isStrongPassword`. Comprobación: las ocho contraseñas de la tabla dan el resultado indicado (script manual con Node). La UI no cambia todavía.
5. **Server Actions:** `signUpAction` y `updatePasswordAction` usan `isStrongPassword` y devuelven `weak_password` si no se cumple. `signInAction` no cambia. Los textos de `weak_password` y `FIELD_MESSAGES.password` pasan a `▸ LA CONTRASEÑA NO CUMPLE LOS REQUISITOS_`.
6. **Lista de requisitos en vivo:** crear `components/password-requirements.tsx` (con `/frontend-design` y sus estilos en `app/globals.css` si hacen falta) y montarlo en la pestaña de registro de `components/auth-form.tsx` y en `components/new-password-form.tsx`, que validan con `isStrongPassword`. Comprobación: la lista se enciende línea a línea al escribir, no aparece en la pestaña de inicio de sesión, y a 360 px no hay scroll horizontal en `/acceso` ni en `/acceso/nueva-clave`.
7. **Panel de Supabase (manual, lo hace el usuario):**
   - comprobar que la contraseña mínima es 8;
   - poner _Password requirements_ en «Lowercase, uppercase letters, digits and symbols (recommended)»;
   - poner _sign-ups and sign-ins_ a 5 cada 5 minutos en Auth → Rate Limits;
   - confirmar que la leaked password protection no está disponible en Free.
8. **Mensaje de rate limit:** cambiar el texto de `rate_limited` en `components/auth-ui.tsx` a `▸ DEMASIADOS INTENTOS — ESPERA UNOS MINUTOS_`. Comprobación con Playwright: seis intentos de login con contraseña incorrecta seguidos en `/acceso` y el sexto muestra ese mensaje; si el registro tiene un contador separado, igual en la pestaña de registro. Tras 5 minutos se puede volver a entrar.
9. **Protección de rutas con el Proxy:** `updateSession` devuelve también `hasSession` y `proxy.ts` redirige según las reglas del alcance. Comprobación: sin sesión, `/acceso/alias?next=/salon` lleva a `/acceso?next=%2Facceso%2Falias%3Fnext%3D%252Fsalon`; con sesión, `/acceso` lleva a `/juegos` y `/acceso?next=/salon` a `/salon`; el flujo de recuperación (enlace del correo → `/auth/confirm` → `/acceso/nueva-clave`) sigue funcionando.
10. **Checklist y documentación:**
    - marcar las casillas en `references/security/security-checklist.md` y anotar lo de la leaked password protection;
    - `CLAUDE.md`: requisitos de contraseña (`isStrongPassword`, `PasswordRequirements`) en el párrafo de autenticación, _Password requirements_ y rate limit en la configuración de Auth, cabeceras en «Stack y particularidades», la migración en «Supabase» y dos entradas en «Problemas conocidos» (contraseñas filtradas en Free y rate limit por IP del servidor).

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] `games` y `scores` tienen RLS activo y las mismas políticas que antes de la spec.
- [ ] La contraseña mínima en el panel es 8 y _Password requirements_ está en «Lowercase, uppercase letters, digits and symbols (recommended)».
- [ ] `passwordChecks` e `isStrongPassword` dan los resultados de la tabla del modelo de datos.
- [ ] En la pestaña de registro de `/acceso` y en `/acceso/nueva-clave` aparece la lista de cinco requisitos, y cada línea pasa a cian en cuanto se cumple.
- [ ] La pestaña de inicio de sesión no muestra la lista.
- [ ] Registrarse con `abcdefg1!` (sin mayúscula) no envía el formulario y muestra `▸ LA CONTRASEÑA NO CUMPLE LOS REQUISITOS_`; con `Abcdef1!` se envía.
- [ ] Llamar a `signUpAction` o `updatePasswordAction` con una contraseña débil (saltándose el cliente) devuelve `{ ok: false, error: "weak_password" }`.
- [ ] Supabase rechaza con `weak_password` una contraseña sin símbolo enviada directamente a Auth.
- [ ] Una cuenta existente con contraseña que no cumple los requisitos sigue pudiendo iniciar sesión.
- [ ] El input de contraseña tiene `aria-describedby` hacia la lista, y cada línea expone «cumplido» o «pendiente» a lectores de pantalla.
- [ ] A 360 px no hay scroll horizontal en `/acceso` (registro) ni en `/acceso/nueva-clave`.
- [ ] Auth → Rate Limits muestra 5 _sign-ups and sign-ins_ cada 5 minutos.
- [ ] El sexto intento de login seguido en `/acceso` muestra `▸ DEMASIADOS INTENTOS — ESPERA UNOS MINUTOS_`, sin error genérico.
- [ ] `curl -I` a `/`, `/juegos`, `/acceso` y `/juegos/asteroides/jugar` (con `npm run start`) devuelve las cinco cabeceras con los valores de la tabla.
- [ ] Con sesión de GitHub o Google, la foto del nav sigue cargando y el login con OAuth sigue funcionando.
- [ ] Los juegos con motor (ASTEROIDES, TETRA, REBOTE, VIBORITA, RANARIA) siguen cargando y se pueden guardar puntuaciones.
- [ ] `anon` y `authenticated` no tienen `EXECUTE` sobre `public.rls_auto_enable()` y el asesor de seguridad ya no muestra esos dos avisos.
- [ ] `supabase/migrations/` tiene el `.sql` de `revoke_rls_auto_enable_execute` con la misma versión que `list_migrations`.
- [ ] El asesor solo muestra `security_definer_view` (aceptado, SPEC 14) y `auth_leaked_password_protection` (aceptado, plan Free).
- [ ] Sin sesión, `/acceso/alias` y `/acceso/nueva-clave` redirigen a `/acceso?next=<ruta>`.
- [ ] Con sesión, `/acceso` y `/acceso/recuperar` redirigen a `/juegos` (o al `next` interno si lo hay), y un POST a esas rutas no se redirige.
- [ ] El flujo de recuperación de contraseña y el alias obligatorio tras OAuth siguen funcionando.
- [ ] `references/security/security-checklist.md` tiene marcadas las casillas hechas y la nota de la leaked password protection.
- [ ] `CLAUDE.md` recoge el rate limit, las cabeceras, la migración y los dos problemas conocidos.

---

## Decisiones

- **Sí:** minúscula, mayúscula, dígito y símbolo, además de los 8 caracteres (petición del usuario), aplicados en el panel, en el cliente y en las Server Actions.
- **Sí:** el mismo set de símbolos que Supabase. Si la app aceptara un carácter que Supabase no cuenta como símbolo, el jugador vería `weak_password` tras pasar la validación del cliente.
- **No:** «cualquier carácter no alfanumérico» como símbolo.
- **Sí:** lista de requisitos en vivo bajo el campo. El jugador sabe qué le falta antes de enviar.
- **No:** solo un mensaje de error al enviar, ni un mensaje que enumere lo que falta.
- **Sí:** la Server Action devuelve `weak_password` (no `invalid_input`) si la contraseña es débil, para que el mensaje coincida con el del cliente y con el de Supabase.
- **Sí:** las cuentas existentes siguen entrando. Las reglas solo se aplican al crear o cambiar contraseña, igual que en Supabase.
- **No:** forzar el cambio de contraseña al iniciar sesión.
- **Sí:** 5 registros e inicios de sesión cada 5 minutos por IP (decisión del usuario). Frena los bots más que el valor por defecto.
- **No:** dejar 30 ni bajar a 10.
- **Sí:** mostrar un mensaje claro al llegar al límite. Se aprovecha `rate_limited`, que ya existe, y solo se ajusta el texto a la ventana de 5 minutos.
- **Sí:** HSTS y Permissions-Policy además de las tres cabeceras del checklist. Son baratas y no rompen nada; HSTS solo tiene efecto en HTTPS, así que en `localhost` no molesta.
- **No:** `preload` en HSTS. Obliga a HTTPS de forma casi irreversible y aún no hay dominio de producción.
- **No:** Content-Security-Policy en esta spec. Con PPR y scripts en línea necesita nonces o hashes y su propia verificación.
- **Sí:** `X-Frame-Options: DENY`. Arcade Vault no se embebe en ninguna parte.
- **Sí:** `Referrer-Policy: strict-origin-when-cross-origin`. Los `<img>` del avatar siguen con su `referrerPolicy="no-referrer"` propio (SPEC 15).
- **Sí:** documentar la leaked password protection como no disponible (plan Free) en lugar de cambiar de plan.
- **Sí:** revocar `EXECUTE` de `rls_auto_enable()` aunque no esté en el checklist. Elimina dos avisos del asesor sin afectar al event trigger.
- **No:** borrar el event trigger `ensure_rls`. Es útil: activa RLS en cualquier tabla nueva de `public`.
- **Sí:** el Proxy protege las rutas que exigen sesión (`/acceso/alias`, `/acceso/nueva-clave`) y saca de `/acceso` y `/acceso/recuperar` a quien ya la tiene (decisión del usuario al empezar la implementación). Reutiliza el `getUser()` del refresco de sesión.
- **No:** solo proteger las rutas con sesión, ni sacar el proxy a otra spec.
- **Sí:** marcar las casillas del checklist al terminar, para que siga siendo una referencia fiel.

---

## Riesgos

| Riesgo                                                                                                                                                                         | Mitigación                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Registro y login son Server Actions: Supabase cuenta la IP del servidor de Next, no la del jugador. En producción, todos los jugadores compartirían el límite de 5 cada 5 min. | Hoy solo se ejecuta en local. Queda en «Problemas conocidos» de `CLAUDE.md` para revisarlo antes de desplegar (reenviar la IP real o subir el límite). |
| Una red compartida (oficina o escuela) agota el límite entre varios usuarios.                                                                                                  | El mensaje dice que esperen unos minutos. Se revisa junto al riesgo anterior.                                                                          |
| `X-Frame-Options: DENY` o `Permissions-Policy` rompen algo que hoy funciona (OAuth, fotos, juegos, pad táctil).                                                                | Los criterios comprueban OAuth, fotos y los cinco juegos con motor. Ninguna función usa cámara, micrófono ni geolocalización.                          |
| HSTS con `includeSubDomains` obliga a HTTPS en subdominios cuando haya dominio de producción.                                                                                  | Sin `preload` y con `max-age` revisable. Se tiene en cuenta al desplegar.                                                                              |
| Las reglas de la app y las del panel se desincronizan (alguien cambia _Password requirements_ en Supabase y no `lib/auth-rules.ts`).                                           | `PASSWORD_SYMBOLS` documenta que es el set de Supabase, y la Server Action sigue mapeando el `weak_password` de Supabase al mismo mensaje.             |
| Un jugador con teclado en español escribe `ñ` o letras con tilde esperando que cuenten como minúscula o símbolo.                                                               | La lista en vivo muestra al momento que no cuentan.                                                                                                    |
| Los ajustes del panel (rate limit, contraseña mínima, requisitos) no quedan versionados.                                                                                       | Quedan documentados en `CLAUDE.md`, igual que el resto de la configuración de Auth.                                                                    |

---

## Problemas conocidos

- **El límite de 5 _sign-ups and sign-ins_ no salta con inicios de sesión fallidos** (Paso 8, 2026-11-13). Con el ajuste en 5 cada 5 minutos en el panel, siete intentos seguidos de `/acceso` con contraseña incorrecta devolvieron `400 invalid_credentials` y ninguno `429`. Según los logs de Auth, los siete llegaron desde la misma IP (`POST /auth/v1/token?grant_type=password`). No se sabe si el ajuste no llegó a aplicarse o si ese límite no cuenta los logins fallidos. El texto de `rate_limited` ya se cambió y `mapError` traduce cualquier `429`, así que el mensaje saldrá en cuanto Supabase lo devuelva. El criterio «el sexto intento muestra `▸ DEMASIADOS INTENTOS — ESPERA UNOS MINUTOS_`» queda sin verificar. Decisión del usuario: documentarlo y seguir.

---

## Lo que **no** está en esta spec

- Content-Security-Policy.
- CAPTCHA.
- Reenviar la IP real del jugador a Supabase Auth.
- Rate limit propio en `saveScoreAction` o en el formulario de contacto.
- Plan Pro y protección contra contraseñas filtradas.
- Cambiar `leaderboard` a `security_invoker`.
- Forzar el cambio de contraseña a cuentas existentes.
- Medidor de fortaleza más allá de los cinco requisitos.

Cada una de estas, si llega, irá en su propia spec.
