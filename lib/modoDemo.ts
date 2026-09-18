/**
 * Modo demo: la app funciona completa con datos ficticios, sin Supabase.
 * Se activa con NEXT_PUBLIC_DEMO=1 en .env.local.
 *
 * Sirve para recorrer todas las pestañas en local sin credenciales y para
 * enseñar la herramienta sin exponer la cartera real. En modo demo no se
 * escribe nada: los registros y ediciones se pierden al recargar.
 */
export const MODO_DEMO = process.env.NEXT_PUBLIC_DEMO === '1';

/**
 * Versión Cloudflare: datos en D1 y login con Cloudflare Access.
 * Se activa con NEXT_PUBLIC_BACKEND=d1 (scripts dev:d1 y cf:*). Sin esa
 * variable la app sigue usando Supabase, como en Vercel.
 */
export const MODO_D1 = !MODO_DEMO && process.env.NEXT_PUBLIC_BACKEND === 'd1';
