/**
 * Cliente falso de Supabase para el modo demo.
 *
 * Implementa la parte de la API que usa la app (auth + constructor de consultas
 * encadenable) contra los arrays en memoria de `demoData`. Así los modales
 * —registrar acción, pausar, editar, nuevo contacto, proyecto ganado, importar—
 * funcionan de verdad en la demo en vez de fallar contra una base inexistente.
 *
 * Los cambios viven en memoria: se pierden al recargar la página.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ACTIVIDADES, CONTACTOS, MANAGERS_LISTA, PROYECTOS, USUARIO_DEMO } from '@/lib/demoData';

type Fila = Record<string, any>;

const DB: Record<string, Fila[]> = {
  managers: MANAGERS_LISTA as unknown as Fila[],
  contactos: CONTACTOS as unknown as Fila[],
  actividades: ACTIVIDADES as unknown as Fila[],
  proyectos: PROYECTOS as unknown as Fila[],
};

let secuencia = 0;
const nuevoId = (tabla: string) => `${tabla[0]}-demo-${++secuencia}`;

/** Constructor de consultas equivalente al de supabase-js, sobre memoria. */
function consulta(nombre: string) {
  const filtros: Array<(f: Fila) => boolean> = [];
  let orden: { col: string; asc: boolean } | null = null;
  let unico = false;
  let contar = false;
  let modo: 'select' | 'insert' | 'update' | 'delete' = 'select';
  let payload: any = null;

  function ejecutar() {
    const filas = DB[nombre];
    if (!filas) return { data: null, error: { message: `Tabla desconocida: ${nombre}` }, count: 0 };

    if (modo === 'insert') {
      const nuevos = (Array.isArray(payload) ? payload : [payload]).map((p: Fila) => ({
        id: nuevoId(nombre),
        ...p,
      }));
      filas.push(...nuevos);
      return { data: nuevos, error: null, count: nuevos.length };
    }

    const seleccionadas = filas.filter((f) => filtros.every((fn) => fn(f)));

    if (modo === 'update') {
      seleccionadas.forEach((f) => Object.assign(f, payload));
      return { data: seleccionadas, error: null, count: seleccionadas.length };
    }
    if (modo === 'delete') {
      DB[nombre] = filas.filter((f) => !seleccionadas.includes(f));
      return { data: seleccionadas, error: null, count: seleccionadas.length };
    }

    let salida = seleccionadas;
    if (orden) {
      const { col, asc } = orden;
      salida = [...salida].sort((a, b) => {
        const x = a[col] ?? '';
        const y = b[col] ?? '';
        return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1);
      });
    }
    if (contar) return { data: null, error: null, count: salida.length };
    if (unico) {
      return salida.length
        ? { data: salida[0], error: null, count: 1 }
        : { data: null, error: { message: 'No rows found' }, count: 0 };
    }
    return { data: salida, error: null, count: salida.length };
  }

  const api: any = {
    select: (_cols?: string, opciones?: { count?: string; head?: boolean }) => {
      if (opciones?.count) contar = true;
      return api;
    },
    insert: (p: any) => ((modo = 'insert'), (payload = p), api),
    update: (p: any) => ((modo = 'update'), (payload = p), api),
    delete: () => ((modo = 'delete'), api),
    eq: (c: string, v: any) => (filtros.push((f) => f[c] === v), api),
    neq: (c: string, v: any) => (filtros.push((f) => f[c] !== v), api),
    in: (c: string, vs: any[]) => (filtros.push((f) => vs.includes(f[c])), api),
    gte: (c: string, v: any) => (filtros.push((f) => !!f[c] && new Date(f[c]) >= new Date(v)), api),
    lte: (c: string, v: any) => (filtros.push((f) => !!f[c] && new Date(f[c]) <= new Date(v)), api),
    order: (c: string, o?: { ascending?: boolean }) => (
      (orden = { col: c, asc: o?.ascending !== false }), api
    ),
    limit: () => api,
    single: () => ((unico = true), api),
    maybeSingle: () => ((unico = true), api),
    then: (res: any, rej: any) => Promise.resolve(ejecutar()).then(res, rej),
  };
  return api;
}

export function createDemoClient() {
  return {
    from: (nombre: string) => consulta(nombre),
    auth: {
      getUser: async () => ({ data: { user: { email: USUARIO_DEMO.email } }, error: null }),
      signInWithPassword: async () => ({ data: {}, error: null }),
      signUp: async () => ({ data: {}, error: null }),
      signOut: async () => ({ error: null }),
    },
  } as any;
}
