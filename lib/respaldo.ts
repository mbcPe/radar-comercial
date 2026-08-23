/**
 * Respaldo descargable de la base.
 *
 * No sustituye a los backups de Supabase: es una copia que el propio consultor
 * puede bajar antes de una importación masiva o de una edición grande, y que
 * queda en su disco aunque alguien se equivoque en la base.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const TABLAS = ['managers', 'contactos', 'actividades', 'proyectos'] as const;

export type Respaldo = {
  generado: string;
  origen: string;
  filas: Record<string, number>;
  datos: Record<string, unknown[]>;
};

/** Lee las cuatro tablas completas. Solo lectura: no escribe nada. */
export async function construirRespaldo(
  supabase: SupabaseClient,
  origen: string
): Promise<{ respaldo: Respaldo | null; error: string | null }> {
  const datos: Record<string, unknown[]> = {};
  const filas: Record<string, number> = {};

  for (const tabla of TABLAS) {
    const { data, error } = await supabase.from(tabla).select('*');
    if (error) {
      // Se aborta entero: un respaldo a medias da falsa tranquilidad
      return { respaldo: null, error: `No se pudo leer la tabla "${tabla}": ${error.message}` };
    }
    datos[tabla] = data ?? [];
    filas[tabla] = (data ?? []).length;
  }

  return {
    respaldo: { generado: new Date().toISOString(), origen, filas, datos },
    error: null,
  };
}

/** Dispara la descarga del archivo en el navegador. */
export function descargar(respaldo: Respaldo) {
  const marca = respaldo.generado.slice(0, 19).replace(/[:T]/g, '-');
  const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `radar-comercial-respaldo-${marca}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export const CLAVE_ULTIMO_RESPALDO = 'mbc-ultimo-respaldo';
