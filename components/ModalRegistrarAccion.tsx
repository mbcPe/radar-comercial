'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

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
};

const TIPOS_ACCION = [
  'Llamada',
  'Reunión presencial',
  'Reunión virtual',
  'Email',
  'WhatsApp',
  'Mensaje LinkedIn',
];

// Días según prioridad
const DIAS_POR_PRIORIDAD: Record<string, number> = {
  P1: 30,
  P2: 60,
  P3: 75,
};

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
}: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hoy = new Date().toISOString().slice(0, 10);
  const dias = DIAS_POR_PRIORIDAD[contactoPrioridad] || 60;
  const nextSugerido = new Date(Date.now() + dias * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  const [form, setForm] = useState({
    tipo: 'Llamada',
    fecha: hoy,
    resultado: '',
    proximos_pasos: '',
    next_touch: nextSugerido,
    oportunidad: contactoOportunidad || '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Insertar la actividad
    const { error: insertError } = await supabase.from('actividades').insert({
      contacto_id: contactoId,
      tipo: form.tipo,
      resultado: form.resultado || null,
      proximos_pasos: form.proximos_pasos || null,
      fecha: form.fecha,
      autor_id: autorId,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // 2. Actualizar el contacto: last_touch, next_touch, oportunidad
    const { error: updateError } = await supabase
      .from('contactos')
      .update({
        last_touch: form.fecha,
        next_touch: form.next_touch,
        oportunidad: form.oportunidad || null,
      })
      .eq('id', contactoId);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-medium text-gray-900">Registrar acción comercial</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Card de contexto del contacto */}
          <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm mb-4">
            <span className="font-medium text-gray-900">{contactoNombre}</span>
            {contactoCargo && <span className="text-gray-700"> · {contactoCargo}</span>}
            <span className="text-gray-700"> · {contactoEmpresa}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de acción *</label>
              <select
                required
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 bg-white"
              >
                {TIPOS_ACCION.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de la acción *</label>
              <input
                type="date"
                required
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Resultado</label>
              <textarea
                value={form.resultado}
                onChange={(e) => setForm({ ...form, resultado: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 min-h-[80px] resize-y"
                placeholder="¿Qué pasó en la conversación?"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Próximos pasos</label>
              <textarea
                value={form.proximos_pasos}
                onChange={(e) => setForm({ ...form, proximos_pasos: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 min-h-[60px] resize-y"
                placeholder="Compromisos pendientes..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Próximo contacto (NextTouch) *
              </label>
              <input
                type="date"
                required
                value={form.next_touch}
                onChange={(e) => setForm({ ...form, next_touch: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Sugerencia automática según prioridad {contactoPrioridad} ({dias}d). Editable si el cliente pidió fecha específica.
              </p>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Oportunidad activa (opcional)
              </label>
              <input
                type="text"
                value={form.oportunidad}
                onChange={(e) => setForm({ ...form, oportunidad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2"
                placeholder="Ej. Migración cloud Q3"
              />
              <p className="text-xs text-gray-500 mt-1">
                Negocio en evaluación. Vacío si no hay nada concreto en juego.
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-600 mt-4">
            Quedará registrada como hecha por: <strong className="text-gray-800">{autorNombre}</strong>
          </p>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2 mt-4">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#9C0C54' }}
            >
              {loading ? 'Guardando...' : 'Guardar acción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}