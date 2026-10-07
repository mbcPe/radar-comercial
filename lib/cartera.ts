/**
 * Reglas de la cartera compartidas por todas las pantallas: cadencia por
 * prioridad, fechas del próximo contacto y cumpleaños.
 *
 * Las fechas se tratan como días del calendario local (Perú), no como
 * instantes UTC: `new Date('2026-10-06')` se interpreta en UTC y en Lima
 * muestra el 5 de octubre; `toISOString()` después de las 19:00 ya da el día
 * siguiente. Todo pasa por aquí para evitar esos corrimientos.
 */

/** Cada cuántos días hay que tocar a un contacto según su prioridad. */
export const DIAS_POR_PRIORIDAD: Record<string, number> = { P1: 30, P2: 60, P3: 75 };

export const PRIORIDADES = [
  { value: 'P1', label: 'P1 · cada 30 días', dias: 30 },
  { value: 'P2', label: 'P2 · cada 60 días', dias: 60 },
  { value: 'P3', label: 'P3 · cada 75 días', dias: 75 },
] as const;

export function cadencia(prioridad: string | null | undefined): number {
  return DIAS_POR_PRIORIDAD[prioridad ?? ''] ?? 60;
}

const DIA_MS = 86400000;

/** Día local en formato AAAA-MM-DD. */
export function aISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}

export function hoyISO(): string {
  return aISO(new Date());
}

/**
 * Lee 'AAAA-MM-DD' como día local. Un instante con hora ('…T02:56:30Z', p. ej.
 * archivado_en) se convierte primero a la hora local: a las 22:00 de Lima ya
 * es el día siguiente en UTC. Devuelve null si no es una fecha real.
 */
export function leerFecha(fecha: string | null | undefined): Date | null {
  if (!fecha) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(fecha.trim())) {
    const instante = new Date(fecha);
    if (Number.isNaN(instante.getTime())) return null;
    return new Date(instante.getFullYear(), instante.getMonth(), instante.getDate());
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha.trim());
  if (!m) return null;
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(a, mes - 1, d);
  if (f.getFullYear() !== a || f.getMonth() !== mes - 1 || f.getDate() !== d) return null;
  return f;
}

/** Días desde hoy hasta la fecha (negativo si ya pasó). null si no hay fecha válida. */
export function diasHasta(fecha: string | null | undefined): number | null {
  const f = leerFecha(fecha);
  if (!f) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((f.getTime() - hoy.getTime()) / DIA_MS);
}

/** Suma días a una fecha (por defecto, a hoy) y devuelve AAAA-MM-DD. */
export function sumarDias(dias: number, desde?: string | null): string {
  const base = leerFecha(desde) ?? new Date();
  const f = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias);
  return aISO(f);
}

/** Fecha sugerida del próximo contacto según la prioridad. */
export function sugerirProximo(prioridad: string | null | undefined, desde?: string | null): string {
  return sumarDias(cadencia(prioridad), desde);
}

/**
 * Una fecha es "lejana" si queda a más del doble de la cadencia de su
 * prioridad. Un P1 programado a 7 meses casi siempre es un error de carga.
 */
export function esFechaLejana(fecha: string | null | undefined, prioridad: string | null | undefined): boolean {
  const d = diasHasta(fecha);
  return d !== null && d > cadencia(prioridad) * 2;
}

export type ProblemaFecha = 'sin-fecha' | 'invalida' | 'lejana';

/** Qué tiene de malo la fecha del próximo contacto, si algo. Los pausados no se revisan. */
export function problemaFecha(c: {
  next_touch: string | null;
  prioridad: string | null;
  estado?: string | null;
}): ProblemaFecha | null {
  if (c.estado === 'pausa') return null;
  if (!c.next_touch) return 'sin-fecha';
  if (!leerFecha(c.next_touch)) return 'invalida';
  if (esFechaLejana(c.next_touch, c.prioridad)) return 'lejana';
  return null;
}

export const TEXTO_PROBLEMA: Record<ProblemaFecha, string> = {
  'sin-fecha': 'sin fecha',
  invalida: 'fecha no válida',
  lejana: 'fecha muy lejana',
};

const FORMATO_CORTO: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };

/** '06 oct 2026'. Si la fecha no es válida devuelve '—' en vez de 'Invalid Date'. */
export function formatearFecha(fecha: string | null | undefined, opciones = FORMATO_CORTO): string {
  const f = leerFecha(fecha);
  return f ? f.toLocaleDateString('es', opciones) : '—';
}

/**
 * Normaliza lo que viene de un Excel/CSV a AAAA-MM-DD.
 * Acepta número de serie de Excel, AAAA-MM-DD y DD/MM/AAAA (o con guiones),
 * el formato peruano. Devuelve null si no se reconoce: mejor vacío y avisado
 * que una fecha inventada.
 */
export function normalizarFecha(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    // Serie de Excel: días desde 1899-12-30
    const f = new Date(Date.UTC(1899, 11, 30) + Math.round(valor) * DIA_MS);
    return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCDate()).padStart(2, '0')}`;
  }
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return aISO(valor);

  const t = String(valor).trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (iso) {
    const s = `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
    return leerFecha(s) ? s : null;
  }
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(t);
  if (dmy) {
    const anio = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    const s = `${anio}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    return leerFecha(s) ? s : null;
  }
  return null;
}

/* ---------------- Cumpleaños (el año es opcional) ---------------- */

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export type Cumple = { dia: number; mes: number; anio: number | null };

/**
 * Lee el cumpleaños guardado. Formatos: 'AAAA-MM-DD' (con año) y '--MM-DD'
 * (sin año, notación ISO 8601). También tolera 'DD/MM' y 'DD/MM/AAAA'.
 */
export function leerCumple(valor: string | null | undefined): Cumple | null {
  if (!valor) return null;
  const t = valor.trim();
  let dia: number, mes: number, anio: number | null = null;

  const conAnio = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  const sinAnio = /^--(\d{2})-(\d{2})$/.exec(t);
  const dm = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}))?$/.exec(t);
  if (conAnio) [anio, mes, dia] = [Number(conAnio[1]), Number(conAnio[2]), Number(conAnio[3])];
  else if (sinAnio) [mes, dia] = [Number(sinAnio[1]), Number(sinAnio[2])];
  else if (dm) [dia, mes, anio] = [Number(dm[1]), Number(dm[2]), dm[3] ? Number(dm[3]) : null];
  else return null;

  // 2000 es bisiesto: así el 29 de febrero sin año también es válido
  const prueba = new Date(anio ?? 2000, mes - 1, dia);
  if (prueba.getMonth() !== mes - 1 || prueba.getDate() !== dia) return null;
  return { dia, mes, anio };
}

/** Arma el valor a guardar. Sin día o mes, no hay cumpleaños. */
export function componerCumple(dia: number | null, mes: number | null, anio: number | null): string | null {
  if (!dia || !mes) return null;
  const mm = String(mes).padStart(2, '0');
  const dd = String(dia).padStart(2, '0');
  return anio ? `${anio}-${mm}-${dd}` : `--${mm}-${dd}`;
}

/** '14 de mayo' o '14 de mayo de 1980'. */
export function formatearCumple(valor: string | null | undefined): string {
  const c = leerCumple(valor);
  if (!c) return '—';
  return `${c.dia} de ${MESES[c.mes - 1]}${c.anio ? ` de ${c.anio}` : ''}`;
}

/** Días hasta el próximo cumpleaños (0 = hoy). */
export function diasHastaCumple(valor: string | null | undefined): number | null {
  const c = leerCumple(valor);
  if (!c) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const en = (anio: number) => {
    // 29 de febrero en año no bisiesto: se saluda el 28
    const f = new Date(anio, c.mes - 1, c.dia);
    return f.getMonth() === c.mes - 1 ? f : new Date(anio, c.mes - 1, 28);
  };
  let prox = en(hoy.getFullYear());
  if (prox < hoy) prox = en(hoy.getFullYear() + 1);
  return Math.round((prox.getTime() - hoy.getTime()) / DIA_MS);
}
