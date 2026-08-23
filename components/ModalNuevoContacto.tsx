'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

type Props = {
  managerId: string;
  onClose: () => void;
  onSaved: () => void;
};

const PRIORIDADES = [
  { value: 'P1', label: 'P1 · 30 días', dias: 30 },
  { value: 'P2', label: 'P2 · 60 días', dias: 60 },
  { value: 'P3', label: 'P3 · 75 días', dias: 75 },
];

export default function ModalNuevoContacto({ managerId, onClose, onSaved }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calcular fecha sugerida para next_touch (60 días por defecto = P2)
  const hoy = new Date();
  const fechaSugerida = new Date(hoy.getTime() + 60 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  const [form, setForm] = useState({
    nombre: '',
    empresa: '',
    cargo: '',
    area: '',
    email: '',
    telefono: '',
    cumple: '',
    pais: '',
    prioridad: 'P2',
    next_touch: fechaSugerida,
    oportunidad: '',
    notas: '',
  });

  // Cuando cambia la prioridad, recalcular fecha sugerida
  function handlePrioridadChange(nuevaPrio: string) {
    const dias = PRIORIDADES.find(p => p.value === nuevaPrio)?.dias || 60;
    const nuevaFecha = new Date(hoy.getTime() + dias * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);
    setForm({ ...form, prioridad: nuevaPrio, next_touch: nuevaFecha });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: insertError } = await supabase.from('contactos').insert({
      nombre: form.nombre,
      empresa: form.empresa,
      cargo: form.cargo || null,
      area: form.area || null,
      email: form.email || null,
      telefono: form.telefono || null,
      cumple: form.cumple || null,
      pais: form.pais || null,
      prioridad: form.prioridad,
      next_touch: form.next_touch,
      oportunidad: form.oportunidad || null,
      notas: form.notas || null,
      estado: 'activo',
      manager_id: managerId,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-ceramica-300 flex items-center justify-between">
          <h2 className="text-base font-medium text-mbc">Registrar nuevo contacto</h2>
          <button
            onClick={onClose}
            className="text-arena hover:text-mbc text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-tinta mb-1">
                Nombre completo *
              </label>
              <input
                type="text"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-sm text-mbc focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#0A3A6B' } as React.CSSProperties}
                placeholder="Ej. María Torres"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-tinta mb-1">
                Empresa *
              </label>
              <input
                type="text"
                required
                value={form.empresa}
                onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-sm text-mbc focus:outline-none focus:ring-2"
                placeholder="Ej. Interbank"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-tinta mb-1">Cargo</label>
              <input
                type="text"
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-sm text-mbc focus:outline-none focus:ring-2"
                placeholder="Ej. Head de Riesgos"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-tinta mb-1">Área</label>
              <input
                type="text"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-sm text-mbc focus:outline-none focus:ring-2"
                placeholder="Ej. Riesgos"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-tinta mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-sm text-mbc focus:outline-none focus:ring-2"
                placeholder="contacto@empresa.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-tinta mb-1">Teléfono</label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-sm text-mbc focus:outline-none focus:ring-2"
                placeholder="+51 999 999 999"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-tinta mb-2">Prioridad</label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORIDADES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handlePrioridadChange(p.value)}
                    className="py-2 text-sm rounded-md border font-medium transition-colors"
                    style={{
                      backgroundColor: form.prioridad === p.value ? '#0A3A6B' : '#fff',
                      color: form.prioridad === p.value ? '#fff' : '#374151',
                      borderColor: form.prioridad === p.value ? '#0A3A6B' : '#D1D5DB',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-arena mt-1">
                Determina cada cuántos días debes contactar a esta persona.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-tinta mb-1">Cumpleaños</label>
              <input
                type="date"
                value={form.cumple}
                onChange={(e) => setForm({ ...form, cumple: e.target.value })}
                className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-sm text-mbc focus:outline-none focus:ring-2"
              />
            </div>
           
            <div>
            <label className="block text-sm font-medium text-tinta mb-1">
              País
            </label>
            <select
              value={form.pais}
              onChange={(e) => setForm({ ...form, pais: e.target.value })}
              className="w-full px-3 py-2 border border-ceramica-300 rounded-md focus:ring-2 focus:ring-[#0A3A6B] focus:border-transparent"
            >
              <option value="">Seleccionar país</option>
              <option value="Argentina">Argentina</option>
              <option value="Bolivia">Bolivia</option>
              <option value="Brasil">Brasil</option>
              <option value="Chile">Chile</option>
              <option value="Colombia">Colombia</option>
              <option value="Costa Rica">Costa Rica</option>
              <option value="Ecuador">Ecuador</option>
              <option value="El Salvador">El Salvador</option>
              <option value="España">España</option>
              <option value="Estados Unidos">Estados Unidos</option>
              <option value="Guatemala">Guatemala</option>
              <option value="Honduras">Honduras</option>
              <option value="México">México</option>
              <option value="Nicaragua">Nicaragua</option>
              <option value="Panamá">Panamá</option>
              <option value="Paraguay">Paraguay</option>
              <option value="Perú">Perú</option>
              <option value="Portugal">Portugal</option>
              <option value="Puerto Rico">Puerto Rico</option>
              <option value="República Dominicana">República Dominicana</option>
              <option value="Uruguay">Uruguay</option>
              <option value="Venezuela">Venezuela</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
            <div>
              <label className="block text-xs font-medium text-tinta mb-1">
                Próximo contacto *
              </label>
              <input
                type="date"
                required
                value={form.next_touch}
                onChange={(e) => setForm({ ...form, next_touch: e.target.value })}
                className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-sm text-mbc focus:outline-none focus:ring-2"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-tinta mb-1">
                Oportunidad activa (opcional)
              </label>
              <input
                type="text"
                value={form.oportunidad}
                onChange={(e) => setForm({ ...form, oportunidad: e.target.value })}
                className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-sm text-mbc focus:outline-none focus:ring-2"
                placeholder="Ej. Migración cloud Q3"
              />
              <p className="text-xs text-arena mt-1">
                Negocio en evaluación. Vacío si no hay nada concreto en juego.
              </p>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-tinta mb-1">
                Notas personales
              </label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-sm text-mbc focus:outline-none focus:ring-2 min-h-[80px] resize-y"
                placeholder="Datos blandos: intereses, hijos, contexto..."
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2 mt-4">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-ceramica-300">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-tinta bg-white border border-ceramica-300 rounded-md hover:bg-ceramica"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#0A3A6B' }}
            >
              {loading ? 'Guardando...' : 'Guardar contacto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}