'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

type Props = {
  contactoId: string;
  contactoNombre: string;
  contactoEmpresa: string;
  contactoOportunidad: string | null;
  managerId: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function ModalProyecto({
  contactoId,
  contactoNombre,
  contactoEmpresa,
  contactoOportunidad,
  managerId,
  onClose,
  onSaved,
}: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hoy = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    nombre: contactoOportunidad || '',
    monto: '',
    fecha_cierre: hoy,
    notas: '',
  });

  const [limpiarOportunidad, setLimpiarOportunidad] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Insertar el proyecto
    const { error: insertError } = await supabase.from('proyectos').insert({
      nombre: form.nombre,
      contacto_id: contactoId,
      monto: form.monto ? parseFloat(form.monto) : null,
      fecha_cierre: form.fecha_cierre,
      manager_id: managerId,
      notas: form.notas || null,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // 2. Si está marcado, limpiar la oportunidad del contacto
    if (limpiarOportunidad && contactoOportunidad) {
      await supabase
        .from('contactos')
        .update({ oportunidad: null })
        .eq('id', contactoId);
    }

    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-medium text-gray-900">🎉 Registrar proyecto ganado</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Card de contexto */}
          <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm mb-4">
            <span className="font-medium text-gray-900">{contactoNombre}</span>
            <span className="text-gray-700"> · {contactoEmpresa}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del proyecto *</label>
              <input
                type="text"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2"
                placeholder="Ej. Migración de Datalake fase 1"
              />
              {contactoOportunidad && (
                <p className="text-xs text-gray-500 mt-1">
                  Tomado de la oportunidad activa. Editable.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Monto cerrado (USD)</label>
              <input
                type="number"
                step="1000"
                min="0"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2"
                placeholder="250000"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de cierre *</label>
              <input
                type="date"
                required
                value={form.fecha_cierre}
                onChange={(e) => setForm({ ...form, fecha_cierre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 min-h-[60px] resize-y"
                placeholder="Contexto, equipo asignado, observaciones..."
              />
            </div>
          </div>

          {contactoOportunidad && (
            <div className="mt-4 flex items-start gap-2">
              <input
                type="checkbox"
                id="limpiar-oportunidad"
                checked={limpiarOportunidad}
                onChange={(e) => setLimpiarOportunidad(e.target.checked)}
                className="mt-0.5"
              />
              <label htmlFor="limpiar-oportunidad" className="text-xs text-gray-700 cursor-pointer">
                Quitar la oportunidad activa del contacto (ya se cerró)
              </label>
            </div>
          )}

          <div className="text-xs p-3 rounded-md mt-4" style={{ backgroundColor: '#E1F5EE', color: '#085041' }}>
            Este proyecto sumará a las métricas del manager y al ranking de contactos de oro.
          </div>

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
              style={{ backgroundColor: '#3B6D11' }}
            >
              {loading ? 'Guardando...' : 'Registrar proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}