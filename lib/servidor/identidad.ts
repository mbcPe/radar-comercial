/**
 * Identidad del usuario en la versión Cloudflare.
 *
 * El login lo hace Cloudflare Access delante del subdominio: cuando la petición
 * llega a la app ya trae un JWT firmado por Access con el email del usuario.
 * Aquí se verifica esa firma (no basta con leer la cabecera de email, porque
 * cualquiera podría enviarla si llegara a la app por otra ruta).
 *
 * En desarrollo local no hay Access: se usa DEV_USER_EMAIL.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getCloudflareContext } from '@opennextjs/cloudflare';

type EnvAcceso = {
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  DEV_USER_EMAIL?: string;
};

const llaveros = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function llavero(equipo: string) {
  let jwks = llaveros.get(equipo);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${equipo}/cdn-cgi/access/certs`));
    llaveros.set(equipo, jwks);
  }
  return jwks;
}

export class SinAcceso extends Error {}

/** Devuelve el email verificado del usuario o lanza SinAcceso. */
export async function emailDelUsuario(req: Request): Promise<string> {
  const env = getCloudflareContext().env as unknown as EnvAcceso;

  if (process.env.NODE_ENV === 'development') {
    return (env.DEV_USER_EMAIL || process.env.DEV_USER_EMAIL || 'dev@mbc-latam.com').toLowerCase();
  }

  const equipo = env.ACCESS_TEAM_DOMAIN;
  const aud = env.ACCESS_AUD;
  if (!equipo || !aud) {
    throw new SinAcceso('El acceso con Cloudflare todavía no está configurado en este sitio.');
  }

  const token = req.headers.get('cf-access-jwt-assertion');
  if (!token) throw new SinAcceso('Tu sesión no llegó. Vuelve a entrar al Radar.');

  try {
    const { payload } = await jwtVerify(token, llavero(equipo), {
      issuer: `https://${equipo}`,
      audience: aud,
    });
    const email = typeof payload.email === 'string' ? payload.email : '';
    if (!email) throw new SinAcceso('Tu sesión no trae un email.');
    return email.toLowerCase();
  } catch (e) {
    if (e instanceof SinAcceso) throw e;
    throw new SinAcceso('Tu sesión venció o no es válida. Vuelve a entrar al Radar.');
  }
}

/** Base D1 enlazada como "DB" en wrangler.jsonc. */
export function baseDatos(): D1Database {
  return (getCloudflareContext().env as unknown as { DB: D1Database }).DB;
}
