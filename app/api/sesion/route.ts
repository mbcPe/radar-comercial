/**
 * Quién está conectado (versión Cloudflare).
 *
 * Cloudflare Access ya decidió que el email puede entrar; si ese email aún no
 * está en `managers`, se le da de alta aquí. El primero en entrar queda como
 * administrador, para que el equipo no dependa de tocar la base a mano.
 */

import { baseDatos, emailDelUsuario, SinAcceso } from '@/lib/servidor/identidad';

function nombreDesdeEmail(email: string) {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ');
}

function iniciales(nombre: string) {
  const partes = nombre.split(' ').filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? partes[0]?.[1] ?? '')).toUpperCase();
}

export async function GET(req: Request) {
  let email: string;
  try {
    email = await emailDelUsuario(req);
  } catch (e) {
    const msg = e instanceof SinAcceso ? e.message : 'No pudimos confirmar tu identidad.';
    return Response.json({ user: null, error: { message: msg } }, { status: 401 });
  }

  const db = baseDatos();
  const existente = await db.prepare('SELECT id FROM managers WHERE email = ? COLLATE NOCASE').bind(email).first();

  if (!existente) {
    const hay = await db.prepare('SELECT COUNT(*) AS total FROM managers').first<{ total: number }>();
    const primero = (hay?.total ?? 0) === 0;
    const nombre = nombreDesdeEmail(email);
    await db
      .prepare(
        'INSERT OR IGNORE INTO managers (id, nombre, iniciales, email, rol, activo, es_admin) VALUES (?, ?, ?, ?, ?, 1, ?)'
      )
      .bind(crypto.randomUUID(), nombre, iniciales(nombre), email, primero ? 'Administrador' : 'Manager', primero ? 1 : 0)
      .run();
  }

  return Response.json({ user: { email }, error: null });
}
