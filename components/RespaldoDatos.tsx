'use client';

/**
 * Control de respaldo: deja bajar una copia completa de las cuatro tablas
 * antes de cualquier operación que pueda pisar datos.
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { MODO_DEMO } from '@/lib/modoDemo';
import { construirRespaldo, descargar, CLAVE_ULTIMO_RESPALDO } from '@/lib/respaldo';
import { explicarError } from '@/lib/lenguaje';
import { Card } from '@/components/ui/kit';

export default function RespaldoDatos() {
  const supabase = createClient();
  const [ocupado, setOcupado] = useState(false);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [resumen, setResumen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUltimo(localStorage.getItem(CLAVE_ULTIMO_RESPALDO));
  }, []);

  async function generar() {
    setOcupado(true);
    setError(null);
    setResumen(null);

    const { respaldo, error: err } = await construirRespaldo(
      supabase,
      MODO_DEMO ? 'datos ficticios (modo demo)' : 'base de datos real'
    );

    if (err || !respaldo) {
      const legible = explicarError(err ?? null, 'generar el respaldo');
      setError(`${legible.titulo} ${legible.sugerencia}`);
      setOcupado(false);
      return;
    }

    descargar(respaldo);
    const cuando = new Date().toLocaleString('es-PE');
    localStorage.setItem(CLAVE_ULTIMO_RESPALDO, cuando);
    setUltimo(cuando);
    setResumen(
      Object.entries(respaldo.filas)
        .map(([t, n]) => `${n} ${t}`)
        .join(' · ')
    );
    setOcupado(false);
  }

  const dias = ultimo
    ? Math.floor((Date.now() - new Date(ultimo).getTime()) / 86400000)
    : null;
  const viejo = dias === null || Number.isNaN(dias) || dias > 7;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="kicker">Respaldo de datos</div>
          <p className="mt-1 max-w-xl text-sm text-tinta">
            Descarga una copia completa de contactos, actividades, proyectos y equipo.
            Hazlo <strong>antes</strong> de una importación masiva o de editar muchos registros.
          </p>
        </div>
        <button onClick={generar} disabled={ocupado} className="btn-primary px-4 py-2 text-xs">
          {ocupado ? 'Preparando…' : 'Descargar respaldo'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className="chip"
          style={{
            backgroundColor: viejo ? '#FDF0E1' : '#E7F6EE',
            color: viejo ? '#9A5400' : '#1E6B3C',
          }}
        >
          {ultimo ? `Último respaldo: ${ultimo}` : 'Nunca has descargado un respaldo'}
        </span>
        {MODO_DEMO && (
          <span className="chip" style={{ backgroundColor: '#FDF0E1', color: '#9A5400' }}>
            En modo demo copia los datos ficticios, no los reales
          </span>
        )}
      </div>

      {resumen && (
        <p className="mt-2 text-xs" style={{ color: '#1E6B3C' }}>
          Respaldo descargado: {resumen}.
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs" style={{ color: '#A62222' }}>
          {error}
        </p>
      )}

      <p className="mt-3 text-[11px] text-arena">
        Esto no reemplaza a los backups automáticos de Supabase: es una copia local para
        recuperar datos puntuales. Los respaldos del servidor se configuran en el panel del proyecto.
      </p>
    </Card>
  );
}
