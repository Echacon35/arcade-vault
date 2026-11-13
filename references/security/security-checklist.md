## Checklist de seguridad básico

Estado tras la SPEC 16 (`specs/16-medidas-de-seguridad-basicas.md`, 2026-11-13).

- [x] RLS: Row Level Security habilitado en ambas tablas: `games` y `scores` (comprobado; sin cambios)
- [x] Minimum password length — mínimo 8 caracteres (panel), y además minúscula, mayúscula, dígito y símbolo (_Password requirements_ en el panel, `isStrongPassword` en `lib/auth-rules.ts` y lista en vivo `components/password-requirements.tsx`)
- [ ] Leaked password protection — (el warning 4). **No disponible en el plan Free** de Supabase: requiere Pro o superior. El aviso `auth_leaked_password_protection` del asesor queda aceptado.
- [x] Max signup rate — limitar signups por IP (anti-bot): _sign-ups and sign-ins_ a 5 cada 5 minutos en Auth → Rate Limits. Ojo: no se pudo comprobar que salte con inicios de sesión fallidos (ver «Problemas conocidos» de la SPEC 16), y en producción Supabase contaría la IP del servidor de Next.
- [x] Headers de seguridad en Next.js (`next.config.ts`): las tres del ejemplo más `Strict-Transport-Security` y `Permissions-Policy`

Ej:

```ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

// En la config de Next.js:
headers: async () => [{ source: "/(.*)", headers: securityHeaders }];
```

Extras de la SPEC 16, fuera del checklist original:

- [x] `EXECUTE` revocado a `anon`/`authenticated` sobre `public.rls_auto_enable()` (migración `revoke_rls_auto_enable_execute`).
- [x] Protección de rutas en `proxy.ts`: `/acceso/alias` y `/acceso/nueva-clave` exigen sesión; `/acceso` y `/acceso/recuperar` sacan a quien ya la tiene.

## Por el lado de Supabase:

Cubierto arriba (RLS, contraseña, leaked password protection y rate limit).
