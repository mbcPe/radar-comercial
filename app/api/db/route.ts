/**
 * Puerta única entre la app y la base D1 (versión Cloudflare).
 * Recibe la consulta que arma lib/supabaseD1.ts y responde con la misma forma
 * que supabase-js: { data, error, count }, así las pantallas no cambian.
 */

import { baseDatos, emailDelUsuario, SinAcceso } from '@/lib/servidor/identidad';
import {
  ConsultaInvalida,
  construirInserts,
  construirSelect,
  construirUpdate,
  type Peticion,
} from '@/lib/servidor/sql';

type Cuerpo = Peticion & { unico?: 'siempre' | 'quizas' | null };

const BOOLEANOS: Record<string, string[]> = {
  managers: ['activo', 'es_admin'],
  contactos: ['archivado'],
  actividades: ['pasos_hecho'],
};

/** D1 devuelve 1/0; la app espera true/false como en Postgres. */
function normalizar(tabla: string, filas: Record<string, unknown>[]) {
  const cols = BOOLEANOS[tabla];
  if (!cols) return filas;
  return filas.map((f) => {
    const copia = { ...f };
    for (const c of cols) if (c in copia && copia[c] !== null) copia[c] = Boolean(copia[c]);
    return copia;
  });
}

const responder = (data: unknown, error: { message: string } | null, count: number | null, status = 200) =>
  Response.json({ data, error, count }, { status });

export async function POST(req: Request) {
  try {
    await emailDelUsuario(req);
  } catch (e) {
    const msg = e instanceof SinAcceso ? e.message : 'No pudimos confirmar tu identidad.';
    return responder(null, { message: msg }, null, 401);
  }

  let p: Cuerpo;
  try {
    p = (await req.json()) as Cuerpo;
  } catch {
    return responder(null, { message: 'La consulta llegó incompleta.' }, null, 400);
  }

  const db = baseDatos();

  try {
    if (p.modo === 'insert') {
      const sentencias = construirInserts(p).map((s) => db.prepare(s.sql).bind(...s.params));
      const resultados = await db.batch(sentencias);
      const filas = resultados.flatMap((r) => (r.results ?? []) as Record<string, unknown>[]);
      return responder(normalizar(p.tabla, filas), null, filas.length);
    }

    if (p.modo === 'update') {
      const s = construirUpdate(p);
      const r = await db.prepare(s.sql).bind(...s.params).all();
      const filas = (r.results ?? []) as Record<string, unknown>[];
      return responder(normalizar(p.tabla, filas), null, filas.length);
    }

    if (p.modo !== 'select') {
      return responder(null, { message: 'Operación no permitida.' }, null, 400);
    }

    const s = construirSelect(p);
    if (p.contar) {
      const fila = await db.prepare(s.sql).bind(...s.params).first<{ total: number }>();
      return responder(null, null, fila?.total ?? 0);
    }

    const r = await db.prepare(s.sql).bind(...s.params).all();
    const filas = normalizar(p.tabla, (r.results ?? []) as Record<string, unknown>[]);

    if (p.unico) {
      if (filas.length === 0) {
        return p.unico === 'siempre'
          ? responder(null, { message: 'No se encontró el registro.' }, 0)
          : responder(null, null, 0);
      }
      return responder(filas[0], null, 1);
    }
    return responder(filas, null, filas.length);
  } catch (e) {
    const msg =
      e instanceof ConsultaInvalida
        ? e.message
        : `La base de datos no respondió: ${e instanceof Error ? e.message : String(e)}`;
    return responder(null, { message: msg }, null, e instanceof ConsultaInvalida ? 400 : 500);
  }
}
