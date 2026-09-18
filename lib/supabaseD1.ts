/**
 * Cliente para la versión Cloudflare: misma API encadenable que supabase-js
 * (la parte que usa la app), pero cada consulta viaja a /api/db y se resuelve
 * contra D1. El login lo maneja Cloudflare Access, no la app.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

type Filtro = [string, 'eq' | 'neq' | 'in' | 'gte' | 'lte', unknown];

async function enviar(cuerpo: unknown) {
  try {
    const r = await fetch('/api/db', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    return await r.json();
  } catch {
    return { data: null, error: { message: 'Sin conexión con el servidor. Revisa tu internet y reintenta.' }, count: null };
  }
}

function consulta(tabla: string) {
  const filtros: Filtro[] = [];
  let columnas = '*';
  let orden: { col: string; asc: boolean } | null = null;
  let limite: number | null = null;
  let unico: 'siempre' | 'quizas' | null = null;
  let contar = false;
  let modo: 'select' | 'insert' | 'update' | 'delete' = 'select';
  let payload: any = null;

  const ejecutar = () => {
    if (modo === 'delete') {
      return Promise.resolve({
        data: null,
        error: { message: 'En esta versión no se borran registros desde la app.' },
        count: null,
      });
    }
    return enviar({ tabla, modo, columnas, filtros, orden, limite, unico, contar, payload });
  };

  const api: any = {
    select: (cols?: string, opciones?: { count?: string; head?: boolean }) => {
      // Tras insert/update, .select() solo pide que devuelva las filas (ya lo hace)
      if (modo === 'select' && cols) columnas = cols;
      if (opciones?.count) contar = true;
      return api;
    },
    insert: (p: any) => ((modo = 'insert'), (payload = p), api),
    update: (p: any) => ((modo = 'update'), (payload = p), api),
    delete: () => ((modo = 'delete'), api),
    eq: (c: string, v: unknown) => (filtros.push([c, 'eq', v]), api),
    neq: (c: string, v: unknown) => (filtros.push([c, 'neq', v]), api),
    in: (c: string, vs: unknown[]) => (filtros.push([c, 'in', vs]), api),
    gte: (c: string, v: unknown) => (filtros.push([c, 'gte', v]), api),
    lte: (c: string, v: unknown) => (filtros.push([c, 'lte', v]), api),
    order: (c: string, o?: { ascending?: boolean }) => ((orden = { col: c, asc: o?.ascending !== false }), api),
    limit: (n: number) => ((limite = n), api),
    single: () => ((unico = 'siempre'), api),
    maybeSingle: () => ((unico = 'quizas'), api),
    then: (res: any, rej: any) => ejecutar().then(res, rej),
  };
  return api;
}

const esLocal = () => typeof window !== 'undefined' && /^(localhost|127\.|192\.168\.)/.test(window.location.hostname);

/** Instancia única: varios useEffect dependen de su identidad. */
let instancia: ReturnType<typeof construir> | null = null;

function construir() {
  return {
    from: (tabla: string) => consulta(tabla),
    auth: {
      getUser: async () => {
        try {
          const r = await fetch('/api/sesion', { cache: 'no-store' });
          const j = (await r.json()) as { user: { email: string } | null; error: { message: string } | null };
          return { data: { user: j.user }, error: j.error };
        } catch {
          return { data: { user: null }, error: { message: 'Sin conexión con el servidor.' } };
        }
      },
      // Con Cloudflare Access no hay contraseña en la app: entrar = pasar por Access
      signInWithPassword: async () => ({ data: {}, error: null }),
      signUp: async () => ({ data: {}, error: null }),
      signOut: async () => {
        if (typeof window !== 'undefined' && !esLocal()) window.location.href = '/cdn-cgi/access/logout';
        return { error: null };
      },
    },
  } as any;
}

export function createD1Client() {
  if (!instancia) instancia = construir();
  return instancia;
}
