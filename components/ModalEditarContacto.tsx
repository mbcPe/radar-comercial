'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { explicarError } from '@/lib/lenguaje';
import Ventana from '@/components/ui/Ventana';
import CampoCumple, { cumpleIncompleto, cumpleParaGuardar } from '@/components/ui/CampoCumple';
import { cadencia, esFechaLejana, leerFecha, PRIORIDADES, sugerirProximo } from '@/lib/cartera';

interface ModalEditarContactoProps {
  isOpen: boolean;
  onClose: () => void;
  contacto: { id: string };  // Solo necesitamos el ID
  onSuccess: () => void;
}

export default function ModalEditarContacto({
  isOpen,
  onClose,
  contacto,
  onSuccess,
}: ModalEditarContactoProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);
  /** Si no se pudo leer el contacto, se bloquea guardar: escribir el formulario
   *  vacío encima del registro real borraría los datos originales. */
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre: '',
    empresa: '',
    area: '',
    cargo: '',
    email: '',
    telefono: '',
    cumple: '',
    pais: '',
    prioridad: 'P2',
    next_touch: '',
    oportunidad: '',
    notas: '',
  });
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

  // Cargar datos completos del contacto cuando se abre el modal
  useEffect(() => {
    async function cargarContacto() {
      if (!isOpen || !contacto?.id) return;
      
      setCargando(true);
      setErrorCarga(null);
      
      const { data, error } = await supabase
        .from('contactos')
        .select('nombre, empresa, area, cargo, email, telefono, cumple, pais, prioridad, next_touch, oportunidad, notas')
        .eq('id', contacto.id)
        .single();

      if (error || !data) {
        const legible = explicarError(error, 'cargar el contacto');
        setErrorCarga(`${legible.titulo} ${legible.sugerencia}`);
        setCargando(false);
        return;
      }

      {
        setForm({
          nombre: data.nombre || '',
          empresa: data.empresa || '',
          area: data.area || '',
          cargo: data.cargo || '',
          email: data.email || '',
          telefono: data.telefono || '',
          cumple: data.cumple || '',
          pais: data.pais || '',
          prioridad: data.prioridad || 'P2',
          // Una fecha no válida (p. ej. texto mal importado) se muestra vacía para obligar a corregirla
          next_touch: leerFecha(data.next_touch) ? String(data.next_touch).slice(0, 10) : '',
          oportunidad: data.oportunidad || '',
          notas: data.notas || '',
        });
      }
      
      setCargando(false);
    }

    cargarContacto();
  }, [isOpen, contacto?.id, supabase]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cumpleIncompleto(form.cumple)) {
      setErrorGuardar('El cumpleaños necesita día y mes (el año es opcional).');
      return;
    }
    setErrorGuardar(null);
    setLoading(true);

    try {
      const { error } = await supabase
        .from('contactos')
        .update({
          nombre: form.nombre,
          empresa: form.empresa,
          area: form.area || null,
          cargo: form.cargo || null,
          email: form.email || null,
          telefono: form.telefono || null,
          cumple: cumpleParaGuardar(form.cumple),
          pais: form.pais || null,
          prioridad: form.prioridad,
          next_touch: form.next_touch,
          oportunidad: form.oportunidad || null,
          notas: form.notas || null,
        })
        .eq('id', contacto.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      const legible = explicarError(error as { message?: string }, 'actualizar el contacto');
      setErrorGuardar(`${legible.titulo} ${legible.sugerencia}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Ventana titulo="Editar contacto" onClose={onClose}>
        {cargando ? (
          <div className="p-6 text-center text-tinta">Cargando datos...</div>
        ) : errorCarga ? (
          <div className="p-6 text-sm" style={{ color: '#A62222' }} role="alert">{errorCarga}</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            {/* Fila 1: Nombre */}
            <div>
              <label className="block text-sm font-medium text-tinta mb-1">
                Nombre completo *
              </label>
              <input
                type="text"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-mbc focus:ring-2 focus:ring-[#0A3A6B] focus:border-transparent"
              />
            </div>

            {/* Fila 2: Empresa y País */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-tinta mb-1">
                  Empresa *
                </label>
                <input
                  type="text"
                  required
                  value={form.empresa}
                  onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                  className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-mbc focus:ring-2 focus:ring-[#0A3A6B] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tinta mb-1">
                  País
                </label>
                <select
                  value={form.pais}
                  onChange={(e) => setForm({ ...form, pais: e.target.value })}
                  className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-mbc focus:ring-2 focus:ring-[#0A3A6B] focus:border-transparent"
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
            </div>

            {/* Fila 3: Área y Cargo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-tinta mb-1">
                  Área
                </label>
                <input
                  type="text"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-mbc focus:ring-2 focus:ring-[#0A3A6B] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tinta mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-mbc focus:ring-2 focus:ring-[#0A3A6B] focus:border-transparent"
                />
              </div>
            </div>

            {/* Fila 4: Email y Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-tinta mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-mbc focus:ring-2 focus:ring-[#0A3A6B] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tinta mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-mbc focus:ring-2 focus:ring-[#0A3A6B] focus:border-transparent"
                />
              </div>
            </div>

            {/* Cumpleaños: alimenta el recordatorio del radar */}
            <div>
              <label className="block text-sm font-medium text-tinta mb-1">
                Cumpleaños
              </label>
              <CampoCumple valor={form.cumple} onChange={(v) => setForm({ ...form, cumple: v })} />
              <p className="mt-1 text-xs text-arena">
                El año es opcional. Aparece en el radar cuando falten 30 días o menos.
              </p>
            </div>

            {/* Fila 5: Prioridad */}
            <div>
              <label className="block text-sm font-medium text-tinta mb-1">
                Prioridad *
              </label>
              <select
                required
                value={form.prioridad}
                onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-mbc focus:ring-2 focus:ring-[#0A3A6B] focus:border-transparent"
              >
                {PRIORIDADES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Próximo contacto: obligatorio, todo contacto debe tener fecha válida */}
            <div>
              <label className="block text-sm font-medium text-tinta mb-1">
                Próximo contacto *
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={form.next_touch}
                  onChange={(e) => setForm({ ...form, next_touch: e.target.value })}
                  className="min-w-0 flex-1 px-3 py-2 border border-ceramica-300 rounded-md text-mbc focus:ring-2 focus:ring-[#0A3A6B] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, next_touch: sugerirProximo(form.prioridad) })}
                  className="shrink-0 px-3 py-2 text-xs font-medium text-tinta border border-ceramica-300 rounded-md hover:bg-ceramica"
                >
                  Según {form.prioridad} ({cadencia(form.prioridad)} d)
                </button>
              </div>
              {esFechaLejana(form.next_touch, form.prioridad) && (
                <p className="text-xs mt-1" style={{ color: '#9A5400' }}>
                  ⚠ Queda a más del doble de la cadencia de {form.prioridad}. Revisa que sea la fecha correcta.
                </p>
              )}
            </div>

            {/* Fila 6: Oportunidad */}
            <div>
              <label className="block text-sm font-medium text-tinta mb-1">
                Oportunidad en evaluación
              </label>
              <input
                type="text"
                value={form.oportunidad}
                onChange={(e) => setForm({ ...form, oportunidad: e.target.value })}
                className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-mbc focus:ring-2 focus:ring-[#0A3A6B] focus:border-transparent"
              />
            </div>

            {/* Fila 7: Notas */}
            <div>
              <label className="block text-sm font-medium text-tinta mb-1">
                Notas personales
              </label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-mbc focus:ring-2 focus:ring-[#0A3A6B] focus:border-transparent resize-none"
              />
            </div>

            {errorGuardar && (
              <div className="rounded-md p-3 text-sm" style={{ backgroundColor: '#FBEBEB', color: '#A62222' }} role="alert">
                {errorGuardar}
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-ceramica-300">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-tinta bg-white border border-ceramica-300 rounded-md hover:bg-ceramica"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-[#0A3A6B] rounded-md hover:bg-[#7A0942] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
    </Ventana>
  );
}