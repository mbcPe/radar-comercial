'use client';

import { useMemo, useRef, useState } from 'react';
import { evaluarRegistro } from '@/lib/calidadRegistro';
import { explicarError, type ErrorLegible } from '@/lib/lenguaje';
import { createClient } from '@/lib/supabase';
import Ventana from '@/components/ui/Ventana';
import { cadencia, esFechaLejana, hoyISO, PRIORIDADES, sugerirProximo } from '@/lib/cartera';

/** Acción ya registrada que se quiere corregir o completar. */
export type ActividadEditable = {
  id: string;
  tipo: string;
  fecha: string;
  resultado: string | null;
  proximos_pasos: string | null;
  pasos_hecho?: boolean | null;
};

type Props = {
  contactoId: string;
  contactoNombre: string;
  contactoCargo: string | null;
  contactoEmpresa: string;
  contactoPrioridad: string;
  contactoOportunidad: string | null;
  autorId: string;
  autorNombre: string;
  onClose: () => void;
  onSaved: () => void;
  /** Medio ya elegido (p. ej. desde el botón "Contactado" de la portada). */
  tipoInicial?: string;
  /** Si viene, la ventana edita esa acción en vez de crear una nueva. */
  actividad?: ActividadEditable;
  /** Tras guardar, abre la edición de los datos del contacto. */
  onEditarContacto?: () => void;
};

export const TIPOS_ACCION = [
  'Llamada',
  'Reunión presencial',
  'Reunión virtual',
  'Email',
  'WhatsApp',
  'Mensaje LinkedIn',
];

export default function ModalRegistrarAccion({
  contactoId,
  contactoNombre,
  contactoCargo,
  contactoEmpresa,
  contactoPrioridad,
  contactoOportunidad,
  autorId,
  autorNombre,
  onClose,
  onSaved,
  tipoInicial,
  actividad,
  onEditarContacto,
}: Props) {
  const supabase = createClient();
  const editando = Boolean(actividad);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorLegible | null>(null);

  const [form, setForm] = useState({
    tipo:
      actividad?.tipo ?? (tipoInicial && TIPOS_ACCION.includes(tipoInicial) ? tipoInicial : 'Llamada'),
    fecha: actividad?.fecha?.slice(0, 10) ?? hoyISO(),
    resultado: actividad?.resultado ?? '',
    proximos_pasos: actividad?.proximos_pasos ?? '',
    pasos_hecho: Boolean(actividad?.pasos_hecho),
    prioridad: contactoPrioridad || 'P2',
    next_touch: sugerirProximo(contactoPrioridad),
    oportunidad: contactoOportunidad || '',
  });
  const dias = cadencia(form.prioridad);
  /** Qué hacer al terminar de guardar: cerrar o seguir con los datos del contacto. */
  // Ref y no estado: el clic del botón y el submit ocurren en el mismo tick
  const despues = useRef<'cerrar' | 'editar-contacto'>('cerrar');

  // El crítico revisa lo escrito en vivo y propone qué falta preguntar
  const critica = useMemo(
    () =>
      evaluarRegistro({
        tipo: form.tipo,
        resultado: form.resultado,
        proximosPasos: form.proximos_pasos,
      }),
    [form.tipo, form.resultado, form.proximos_pasos]
  );

  /** Añade el encabezado de lo que falta para que el consultor lo complete. */
  const SALTO = String.fromCharCode(10);

  function profundizar(plantilla: string) {
    setForm((f) => ({
      ...f,
      resultado: f.resultado.trimEnd() + (f.resultado.trim() ? SALTO : '') + plantilla,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const conPasos = form.proximos_pasos.trim() !== '';
    const ahora = new Date().toISOString();

    // Edición: solo se corrige la acción; el contacto y su cadencia no se tocan
    if (actividad) {
      const cambios: Record<string, unknown> = {
        tipo: form.tipo,
        fecha: form.fecha,
        resultado: form.resultado || null,
        proximos_pasos: form.proximos_pasos || null,
        pasos_hecho: conPasos && form.pasos_hecho,
        editado_en: ahora,
      };
      // Se conserva la fecha original si ya estaba marcado como hecho
      if (!(conPasos && form.pasos_hecho)) cambios.pasos_hecho_en = null;
      else if (!actividad.pasos_hecho) cambios.pasos_hecho_en = ahora;

      const { error: updError } = await supabase
        .from('actividades')
        .update(cambios)
        .eq('id', actividad.id);
      setLoading(false);
      if (updError) {
        setError(explicarError(updError, 'guardar los cambios de la acción'));
        return;
      }
      onSaved();
      onClose();
      return;
    }

    // 1. Insertar la actividad
    const { error: insertError } = await supabase.from('actividades').insert({
      contacto_id: contactoId,
      tipo: form.tipo,
      resultado: form.resultado || null,
      proximos_pasos: form.proximos_pasos || null,
      pasos_hecho: conPasos && form.pasos_hecho,
      pasos_hecho_en: conPasos && form.pasos_hecho ? ahora : null,
      fecha: form.fecha,
      autor_id: autorId,
    });

    if (insertError) {
      setError(explicarError(insertError, 'guardar la acción'));
      setLoading(false);
      return;
    }

    // 2. Actualizar el contacto: last_touch, next_touch, prioridad, oportunidad
    const { error: updateError } = await supabase
      .from('contactos')
      .update({
        last_touch: form.fecha,
        next_touch: form.next_touch,
        prioridad: form.prioridad,
        oportunidad: form.oportunidad || null,
      })
      .eq('id', contactoId);

    if (updateError) {
      setError(explicarError(updateError, 'actualizar el contacto'));
      setLoading(false);
      return;
    }

    setLoading(false);
    onSaved();
    onClose();
    if (despues.current === 'editar-contacto') onEditarContacto?.();
  }

  const CLASE_CAMPO =
    'w-full px-3 py-2 border border-ceramica-300 rounded-md text-sm text-mbc focus:outline-none focus:ring-2';

  return (
    <Ventana titulo={editando ? 'Editar acción' : 'Registrar acción comercial'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-4 sm:p-6">
        {/* Card de contexto del contacto */}
        <div className="px-3 py-2 bg-ceramica border border-ceramica-300 rounded-md text-sm mb-4">
          <span className="font-medium text-mbc">{contactoNombre}</span>
          {contactoCargo && <span className="text-tinta"> · {contactoCargo}</span>}
          <span className="text-tinta"> · {contactoEmpresa}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-tinta mb-1">Tipo de acción *</label>
            <select
              required
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className={`${CLASE_CAMPO} bg-white`}
            >
              {TIPOS_ACCION.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-tinta mb-1">Fecha de la acción *</label>
            <input
              type="date"
              required
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className={CLASE_CAMPO}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-tinta mb-1">Resultado</label>
            <textarea
              value={form.resultado}
              onChange={(e) => setForm({ ...form, resultado: e.target.value })}
              className={`${CLASE_CAMPO} min-h-[80px] resize-y`}
              placeholder="¿Qué pasó? Si aún no responde, déjalo dicho y edítalo cuando conteste."
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-tinta mb-1">Próximos pasos</label>
            <textarea
              value={form.proximos_pasos}
              onChange={(e) => setForm({ ...form, proximos_pasos: e.target.value })}
              className={`${CLASE_CAMPO} min-h-[60px] resize-y`}
              placeholder="Compromisos pendientes..."
            />
            {form.proximos_pasos.trim() && (
              <label className="mt-2 flex items-center gap-2 text-sm text-tinta">
                <input
                  type="checkbox"
                  checked={form.pasos_hecho}
                  onChange={(e) => setForm({ ...form, pasos_hecho: e.target.checked })}
                  className="h-4 w-4"
                />
                Ya se hicieron estos próximos pasos
              </label>
            )}
          </div>

          {!editando && (
            <>
              <div>
                <label className="block text-xs font-medium text-tinta mb-1">Prioridad del cliente</label>
                <select
                  value={form.prioridad}
                  onChange={(e) =>
                    setForm({ ...form, prioridad: e.target.value, next_touch: sugerirProximo(e.target.value) })
                  }
                  className={`${CLASE_CAMPO} bg-white`}
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                {form.prioridad !== contactoPrioridad && (
                  <p className="text-xs mt-1" style={{ color: '#1F6FEB' }}>
                    Pasa de {contactoPrioridad} a {form.prioridad} al guardar.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-tinta mb-1">
                  Próximo contacto (NextTouch) *
                </label>
                <input
                  type="date"
                  required
                  value={form.next_touch}
                  onChange={(e) => setForm({ ...form, next_touch: e.target.value })}
                  className={CLASE_CAMPO}
                />
                <p className="text-xs text-arena mt-1">
                  Sugerencia según prioridad {form.prioridad} ({dias}d). Editable si el cliente pidió fecha
                  específica.
                </p>
                {esFechaLejana(form.next_touch, form.prioridad) && (
                  <p className="text-xs mt-1" style={{ color: '#9A5400' }}>
                    ⚠ Queda a más del doble de la cadencia de {form.prioridad}. Revisa que sea la fecha correcta.
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-tinta mb-1">
                  Oportunidad activa (opcional)
                </label>
                <input
                  type="text"
                  value={form.oportunidad}
                  onChange={(e) => setForm({ ...form, oportunidad: e.target.value })}
                  className={CLASE_CAMPO}
                  placeholder="Ej. Migración cloud Q3"
                />
                <p className="text-xs text-arena mt-1">
                  Negocio en evaluación. Vacío si no hay nada concreto en juego.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Crítico del nivel de detalle: qué falta y qué preguntar */}
        <div
          className="mt-5 rounded-xl p-4"
          style={{
            backgroundColor:
              critica.nivel === 'solido'
                ? '#E7F6EE'
                : critica.nivel === 'aceptable'
                  ? '#EAF2FE'
                  : '#FDF0E1',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="kicker" style={{ color: '#14548F' }}>
                Revisión del registro
              </div>
              <p className="mt-1 text-sm text-tinta">{critica.mensaje}</p>
            </div>
            <span
              className="chip shrink-0"
              style={{
                backgroundColor:
                  critica.nivel === 'solido'
                    ? '#2E9E5B'
                    : critica.nivel === 'aceptable'
                      ? '#1F6FEB'
                      : '#E58413',
                color: '#fff',
              }}
            >
              {critica.nivel === 'vacio'
                ? 'sin contenido'
                : critica.nivel === 'superficial'
                  ? 'superficial'
                  : critica.nivel === 'aceptable'
                    ? 'aceptable'
                    : 'sólido'}
            </span>
          </div>

          {critica.huecos.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-tinta/70">
                Toca lo que quieras profundizar
              </p>
              <div className="mt-2 space-y-1.5">
                {critica.huecos.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => profundizar(h.plantilla)}
                    className="flex w-full items-start gap-2 rounded-lg bg-white/70 p-2 text-left transition-colors hover:bg-white"
                  >
                    <span
                      className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: h.critico ? '#D64545' : '#7C8899' }}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-mbc">{h.etiqueta}</span>
                      <span className="block text-[11px] text-tinta/80">{h.pregunta}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {!editando && autorNombre && (
          <p className="text-xs text-arena mt-4">
            Quedará registrada como hecha por: <strong className="text-tinta">{autorNombre}</strong>
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-xl p-3" style={{ backgroundColor: '#FBEBEB' }} role="alert">
            <p className="text-sm font-semibold" style={{ color: '#A62222' }}>
              {error.titulo}
            </p>
            <p className="mt-1 text-xs text-tinta">{error.sugerencia}</p>
            {error.detalle && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-arena">Detalle técnico</summary>
                <code className="mt-1 block break-all text-[11px] text-arena">{error.detalle}</code>
              </details>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 mt-6 pt-4 border-t border-ceramica-300">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-tinta bg-white border border-ceramica-300 rounded-md hover:bg-ceramica"
          >
            Cancelar
          </button>
          {!editando && onEditarContacto && (
            <button
              type="submit"
              disabled={loading}
              onClick={() => (despues.current = 'editar-contacto')}
              className="px-4 py-2 text-sm font-medium text-mbc bg-white border border-[#0A3A6B] rounded-md hover:bg-ceramica disabled:opacity-50"
            >
              Guardar y actualizar datos del contacto
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            onClick={() => (despues.current = 'cerrar')}
            className="px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#0A3A6B' }}
          >
            {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Guardar acción'}
          </button>
        </div>
      </form>
    </Ventana>
  );
}
