'use client';

/**
 * Cumpleaños con día y mes obligatorios entre sí y año opcional: el cliente
 * casi nunca da el año. Guarda 'AAAA-MM-DD' o '--MM-DD' (ver lib/cartera.ts).
 */

import { componerCumple, leerCumple, MESES } from '@/lib/cartera';

const CLASE =
  'w-full px-3 py-2 border border-ceramica-300 rounded-md text-sm text-mbc bg-white focus:outline-none focus:ring-2 focus:ring-[#0A3A6B]';

export default function CampoCumple({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (valor: string) => void;
}) {
  const c = leerCumple(valor);
  // Se conserva lo elegido aunque falte una parte (p. ej. día sin mes todavía)
  const [diaTxt, mesTxt, anioTxt] = c
    ? [String(c.dia), String(c.mes), c.anio ? String(c.anio) : '']
    : (valor.startsWith('?') ? valor.slice(1).split('|') : ['', '', '']);

  function actualizar(dia: string, mes: string, anio: string) {
    const anioNum = /^\d{4}$/.test(anio) ? Number(anio) : null;
    const compuesto = componerCumple(Number(dia) || null, Number(mes) || null, anioNum);
    // Incompleto: se guarda en borrador para no perder la selección; al guardar vale null
    onChange(compuesto && (anio === '' || anioNum) ? compuesto : dia || mes || anio ? `?${dia}|${mes}|${anio}` : '');
  }

  return (
    <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
      <select
        aria-label="Día"
        value={diaTxt}
        onChange={(e) => actualizar(e.target.value, mesTxt, anioTxt)}
        className={CLASE}
      >
        <option value="">Día</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select
        aria-label="Mes"
        value={mesTxt}
        onChange={(e) => actualizar(diaTxt, e.target.value, anioTxt)}
        className={CLASE}
      >
        <option value="">Mes</option>
        {MESES.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <input
        aria-label="Año (opcional)"
        inputMode="numeric"
        maxLength={4}
        placeholder="Año (opc.)"
        value={anioTxt}
        onChange={(e) => actualizar(diaTxt, mesTxt, e.target.value.replace(/\D/g, ''))}
        className={CLASE}
      />
    </div>
  );
}

/** Valor listo para guardar: el borrador incompleto ('?d|m|a') se descarta. */
export function cumpleParaGuardar(valor: string): string | null {
  return valor && !valor.startsWith('?') ? valor : null;
}

/** Hay día o mes elegidos pero no forman una fecha válida. */
export function cumpleIncompleto(valor: string): boolean {
  return valor.startsWith('?');
}
