/**
 * Traduce las consultas encadenables de la app (estilo supabase-js) a SQL de D1.
 *
 * Solo admite las tablas y columnas del esquema, y solo lo que la app usa:
 * select / insert / update con filtros eq, neq, in, gte, lte, orden y límite.
 * No hay DELETE: en esta versión nada se borra desde la app, para que ningún
 * error de pantalla pueda perder datos.
 */

export const ESQUEMA: Record<string, readonly string[]> = {
  managers: ['id', 'nombre', 'iniciales', 'email', 'rol', 'activo', 'es_admin', 'created_at'],
  contactos: [
    'id', 'nombre', 'empresa', 'area', 'cargo', 'email', 'telefono', 'cumple', 'pais',
    'prioridad', 'last_touch', 'next_touch', 'estado', 'pausa_hasta', 'pausa_motivo',
    'oportunidad', 'notas', 'manager_id', 'created_at',
  ],
  actividades: ['id', 'contacto_id', 'autor_id', 'tipo', 'fecha', 'resultado', 'proximos_pasos', 'created_at'],
  proyectos: ['id', 'nombre', 'contacto_id', 'monto', 'fecha_cierre', 'estado', 'manager_id', 'notas', 'created_at'],
};

export type Filtro = [columna: string, operador: 'eq' | 'neq' | 'in' | 'gte' | 'lte', valor: unknown];

export type Peticion = {
  tabla: string;
  modo: 'select' | 'insert' | 'update';
  columnas?: string;
  filtros?: Filtro[];
  orden?: { col: string; asc: boolean } | null;
  limite?: number | null;
  contar?: boolean;
  payload?: Record<string, unknown> | Record<string, unknown>[];
};

export class ConsultaInvalida extends Error {}

type Valor = string | number | null;
type Sentencia = { sql: string; params: Valor[] };

function columnasDe(tabla: string) {
  const cols = ESQUEMA[tabla];
  if (!cols) throw new ConsultaInvalida(`Tabla desconocida: ${tabla}`);
  return cols;
}

function validar(tabla: string, col: string) {
  if (!columnasDe(tabla).includes(col)) {
    throw new ConsultaInvalida(`Columna desconocida en ${tabla}: ${col}`);
  }
  return col;
}

/** D1 no guarda booleanos: true/false pasan a 1/0; objetos, a JSON. */
function aValor(v: unknown): Valor {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString();
  return JSON.stringify(v);
}

function donde(tabla: string, filtros: Filtro[] = []): Sentencia {
  const partes: string[] = [];
  const params: Valor[] = [];
  for (const [col, op, valor] of filtros) {
    const c = validar(tabla, col);
    if (op === 'in') {
      const lista = Array.isArray(valor) ? valor : [];
      if (lista.length === 0) {
        partes.push('0 = 1');
        continue;
      }
      partes.push(`${c} IN (${lista.map(() => '?').join(', ')})`);
      params.push(...lista.map(aValor));
    } else if (valor === null && (op === 'eq' || op === 'neq')) {
      partes.push(`${c} IS ${op === 'eq' ? '' : 'NOT '}NULL`);
    } else {
      const simbolo = { eq: '=', neq: '!=', gte: '>=', lte: '<=' }[op];
      if (!simbolo) throw new ConsultaInvalida(`Filtro no soportado: ${op}`);
      // email se compara sin distinguir mayúsculas, igual que en el login
      partes.push(`${c} ${simbolo} ?${c === 'email' ? ' COLLATE NOCASE' : ''}`);
      params.push(aValor(valor));
    }
  }
  return { sql: partes.length ? ` WHERE ${partes.join(' AND ')}` : '', params };
}

export function construirSelect(p: Peticion): Sentencia {
  const cols =
    !p.columnas || p.columnas.trim() === '*'
      ? '*'
      : p.columnas.split(',').map((c) => validar(p.tabla, c.trim())).join(', ');
  const w = donde(p.tabla, p.filtros);

  if (p.contar) return { sql: `SELECT COUNT(*) AS total FROM ${p.tabla}${w.sql}`, params: w.params };

  let sql = `SELECT ${cols} FROM ${p.tabla}${w.sql}`;
  if (p.orden) sql += ` ORDER BY ${validar(p.tabla, p.orden.col)} ${p.orden.asc ? 'ASC' : 'DESC'}`;
  if (p.limite && Number.isInteger(p.limite) && p.limite > 0) sql += ` LIMIT ${p.limite}`;
  return { sql, params: w.params };
}

export function construirInserts(p: Peticion): Sentencia[] {
  const filas = Array.isArray(p.payload) ? p.payload : p.payload ? [p.payload] : [];
  if (filas.length === 0) throw new ConsultaInvalida('No hay datos que guardar.');
  if (filas.length > 1000) throw new ConsultaInvalida('Máximo 1000 filas por carga.');

  return filas.map((fila) => {
    const datos: Record<string, unknown> = { id: crypto.randomUUID(), ...fila };
    const cols = Object.keys(datos).map((c) => validar(p.tabla, c));
    return {
      sql: `INSERT INTO ${p.tabla} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) RETURNING *`,
      params: cols.map((c) => aValor(datos[c])),
    };
  });
}

export function construirUpdate(p: Peticion): Sentencia {
  if (!p.filtros?.length) {
    // Un UPDATE sin filtro reescribiría la tabla entera
    throw new ConsultaInvalida('Actualización sin filtro bloqueada para proteger los datos.');
  }
  const datos = (Array.isArray(p.payload) ? p.payload[0] : p.payload) ?? {};
  const cols = Object.keys(datos).filter((c) => c !== 'id').map((c) => validar(p.tabla, c));
  if (cols.length === 0) throw new ConsultaInvalida('No hay cambios que guardar.');

  const w = donde(p.tabla, p.filtros);
  return {
    sql: `UPDATE ${p.tabla} SET ${cols.map((c) => `${c} = ?`).join(', ')}${w.sql} RETURNING *`,
    params: [...cols.map((c) => aValor(datos[c])), ...w.params],
  };
}
