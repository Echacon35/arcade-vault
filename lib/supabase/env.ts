/**
 * Lee y valida las variables públicas de Supabase.
 *
 * El acceso es literal (`process.env.NEXT_PUBLIC_...`) para que Next las
 * inyecte en el bundle del navegador; una lectura dinámica no se inyectaría.
 * Se llama bajo demanda al crear un cliente, nunca al importar el módulo.
 */
export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL. Añádela a .env.local (ver .env.example).",
    );
  }

  if (!publishableKey) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Añádela a .env.local (ver .env.example).",
    );
  }

  return { url, publishableKey };
}
