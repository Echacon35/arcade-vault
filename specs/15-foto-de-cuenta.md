# SPEC 15 — Foto de la cuenta en el nav

> **Estado:** Aprobado
> **Depende de:** SPEC 12, SPEC 13
> **Fecha:** 2026-11-13
> **Objetivo:** Mostrar la foto del jugador en un círculo en el botón de cuenta, en el menú de cuenta y en el panel móvil del nav, con las iniciales del alias como respaldo cuando no hay foto.

---

## Por qué existe esta spec

La SPEC 13 dejó fuera de alcance el «avatar del proveedor en el nav o el menú».

Hoy, con sesión iniciada, el nav muestra:

- en escritorio, `ALIAS ▾`;
- hasta 960 px, un icono pixel-art cian.

Las cuentas de Google y GitHub ya traen la foto en `user_metadata`, pero no se usa. Las cuentas de correo (SPEC 12) no tienen foto, así que necesitan un respaldo.

---

## Alcance

**Dentro:**

- **Origen de la foto:**
  - `user_metadata.avatar_url` (GitHub y Google) o, si falta, `user_metadata.picture` (Google).
  - Solo se acepta una URL `https://`. Cualquier otra cosa cuenta como «sin foto».
- **Respaldo: iniciales del alias** en un círculo, en fuente pixel sobre fondo cian oscuro, cuando:
  - la cuenta no tiene foto (cuentas de correo);
  - o la imagen no carga (`onError`).
- **Regla de las iniciales:**
  - Si el alias tiene `_`, la primera letra de las dos primeras partes no vacías: `PX_KAI` → `PK`, `NEON_FOX_2` → `NF`.
  - Si no, sus dos primeros caracteres: `NEONFOX` → `NE`, `A` → `A`.
  - Siempre en mayúsculas y con un máximo de 2 caracteres.
- **Componente compartido `UserAvatar`**, con un tamaño por uso:
  - **28 px** en el botón de escritorio;
  - **40 px** en el botón compacto (≤ 960 px);
  - **48 px** en el menú de cuenta y en el panel móvil.
- **Escritorio (> 960 px), con sesión:** el botón muestra el círculo de 28 px a la izquierda de `ALIAS ▾`.
- **Hasta 960 px, con sesión:** el círculo de 40 px **sustituye** al icono pixel-art de la SPEC 13, con su borde cian. `aria-label="Cuenta de <ALIAS>"` no cambia.
- **Sin sesión:** el icono pixel-art apagado de la SPEC 13 y el texto `Iniciar Sesión` en escritorio no cambian.
- **Menú de cuenta (desplegable):** cabecera con el círculo de 48 px a la izquierda del alias y el correo, en todos los tamaños.
- **Panel de la hamburguesa (móvil), con sesión:** el bloque de cuenta lleva el mismo círculo de 48 px junto al alias y el correo.
- **Carga de la imagen:**
  - `<img>` normal, sin `next/image`, con `referrerPolicy="no-referrer"`, `alt=""` (decorativa: el alias siempre está al lado o en el `aria-label`), `loading="lazy"` y `decoding="async"`.
  - No se toca `next.config.ts`.
- **Documentación:** `CLAUDE.md` refleja `avatarUrl`, `UserAvatar` y la regla de las iniciales.

**Fuera de alcance (para futuras specs):**

- Subir o cambiar la foto (Storage, página de perfil).
- Gravatar u otros servicios externos para las cuentas de correo.
- Fotos en el TOP 10, en el Salón o en el modal de fin (la vista pública no conoce la foto de cada cuenta).
- Optimizar las imágenes con `next/image`.
- Elegir qué foto usar cuando una cuenta tiene varias identidades vinculadas (se usa la que Supabase deje en `user_metadata`).

---

## Modelo de datos

No hay cambios en la base de datos. La foto se lee de los metadatos que ya guarda Supabase Auth.

`SessionUser` (`lib/session.ts`) gana un campo:

```ts
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  hasAlias: boolean;
  aliasSuggestion: string;
  /** Foto del proveedor (`avatar_url` o `picture`), solo si es https; si no, null (SPEC 15). */
  avatarUrl: string | null;
};
```

Novedad en `lib/auth-rules.ts`:

```ts
/** Iniciales para el avatar de respaldo: PX_KAI → "PK", NEONFOX → "NE", A → "A". */
export function aliasInitials(alias: string): string;
```

| Alias        | Iniciales |
| ------------ | --------- |
| `PX_KAI`     | `PK`      |
| `NEON_FOX_2` | `NF`      |
| `NEONFOX`    | `NE`      |
| `A`          | `A`       |
| `_X_`        | `X`       |
| `JUGADOR`    | `JU`      |

Componente nuevo `components/user-avatar.tsx`:

```ts
type UserAvatarProps = {
  name: string; // alias, para las iniciales
  avatarUrl: string | null;
  size: 28 | 40 | 48;
};
```

Pinta la foto si hay `avatarUrl` y no ha fallado; si no, las iniciales. Es decorativo (`aria-hidden` en el contenedor): el texto accesible lo da el botón o el alias que va al lado.

---

## Plan de implementación

1. **Añadir `aliasInitials` a `lib/auth-rules.ts` y `avatarUrl` a `SessionUser`** en `lib/session.ts` (incluido en `sameUser`). Comprobación: los seis ejemplos de la tabla dan el resultado indicado (script manual con Node). La UI no cambia todavía.
2. **Crear `components/user-avatar.tsx`** con sus estilos en `app/globals.css`, diseñado con `/frontend-design`:
   - círculo con borde cian;
   - iniciales en fuente pixel;
   - respaldo a iniciales con `onError`.

   No lo usa nadie todavía.

3. **Botón de cuenta en escritorio y cabecera del menú** en `components/nav.tsx`: círculo de 28 px + `ALIAS ▾`, y círculo de 48 px junto al alias y el correo en el menú.
4. **Botón compacto (≤ 960 px) con sesión y panel de la hamburguesa**:
   - el círculo de 40 px sustituye a `AccountGlyph`;
   - el bloque de cuenta del panel lleva el círculo de 48 px.

   Sin sesión no cambia nada. Comprobación: a 360, 390 y 961 px no hay scroll horizontal, con y sin sesión.

5. **Actualizar `CLAUDE.md`**: `avatarUrl` en `SessionUser`, `UserAvatar` y la regla de las iniciales en el párrafo de autenticación.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] `aliasInitials` da los seis resultados de la tabla.
- [ ] Con una cuenta de GitHub, el botón de escritorio muestra su foto en un círculo de 28 px a la izquierda de `ALIAS ▾`.
- [ ] Con una cuenta de Google, igual con su foto de Google.
- [ ] Con una cuenta de correo, el círculo muestra las iniciales del alias (`PX_KAI` → `PK`) en lugar de una foto.
- [ ] Si la URL de la foto no carga, el círculo pasa a mostrar las iniciales sin dejar una imagen rota.
- [ ] El menú de cuenta muestra el círculo de 48 px junto al alias y el correo.
- [ ] A ≤ 960 px y con sesión, el botón de cuenta es el círculo de 40 px con la foto o las iniciales, con `aria-label="Cuenta de <ALIAS>"`, y abre el menú.
- [ ] A ≤ 960 px y sin sesión, se sigue viendo el icono pixel-art apagado, que lleva a `/acceso`.
- [ ] El bloque de cuenta del panel de la hamburguesa muestra el círculo de 48 px junto al alias y el correo.
- [ ] A 360, 390 y 961 px no hay scroll horizontal en `/`, `/juegos` y `/acceso`, con y sin sesión.
- [ ] Las `<img>` del avatar llevan `alt=""` y `referrerPolicy="no-referrer"`.
- [ ] `next.config.ts` no cambia.

---

## Decisiones

- **Sí:** iniciales del alias como respaldo. No dependen de servicios externos y usan la tipografía del sitio.
- **No:** Gravatar. Hace una petición externa con un identificador derivado del correo.
- **No:** el icono pixel-art dentro del círculo. Sería igual para todas las cuentas sin foto.
- **Sí:** círculo + `ALIAS ▾` en escritorio, porque se sigue leyendo quién ha iniciado sesión.
- **No:** solo el círculo en escritorio.
- **Sí:** hasta 960 px, con sesión, el círculo sustituye al icono pixel-art. Sin sesión se mantiene el icono apagado, que señala «Iniciar sesión».
- **Sí:** foto grande en el menú y en el panel móvil, para que la cuenta se vea igual en todas partes.
- **Sí:** iniciales por partes con `_` y, si no las hay, dos letras. Más distintivas que una sola letra.
- **Sí:** `<img>` normal con `referrerPolicy="no-referrer"`. Son imágenes pequeñas, no hace falta tocar `next.config.ts`, y Google a veces rechaza la petición si lleva referer.
- **No:** `next/image` con `remotePatterns`. Más configuración y un dominio nuevo por cada proveedor.
- **Sí:** solo URLs `https://`. Una URL `http:` o con otro esquema se trata como «sin foto».
- **Sí:** el avatar es decorativo (`alt=""`). El alias siempre está al lado o en el `aria-label` del botón, y repetirlo lo leería dos veces.
- **Sí:** se usa la foto que Supabase deje en `user_metadata` aunque haya varias identidades. Elegir entre ellas no aporta valor ahora.

---

## Riesgos

| Riesgo                                                                                                             | Mitigación                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| La URL de la foto caduca o el proveedor la cambia (la foto de Google puede devolver 403).                          | `onError` cambia a las iniciales. La foto se actualiza en el siguiente acceso con el proveedor.                   |
| `user_metadata.avatar_url` lo puede cambiar el propio usuario con `auth.updateUser` y poner cualquier URL `https`. | Solo se muestra a ese mismo usuario en su nav, nunca a otros jugadores. No se usa para autorizar nada.            |
| El círculo de 28 px en escritorio vuelve a apretar el nav justo por encima de 960 px.                              | El criterio de 961 px sin scroll horizontal se comprueba con sesión, y con un alias de 10 caracteres si se puede. |
| Cargar imágenes de terceros revela al proveedor la IP del jugador.                                                 | Es la misma foto que el jugador ya usa en ese proveedor, y `no-referrer` evita enviar la URL de Arcade Vault.     |

---

## Lo que **no** está en esta spec

- Subir o cambiar la foto, y página de perfil.
- Gravatar u otros servicios.
- Fotos en el TOP 10, en el Salón o en el modal de fin.
- `next/image` y cambios en `next.config.ts`.
- Elegir entre fotos de varias identidades.

Cada una de estas, si llega, irá en su propia spec.
