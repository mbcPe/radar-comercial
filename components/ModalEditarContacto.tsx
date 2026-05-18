'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

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

  const [form, setForm] = useState({
    nombre: '',
    empresa: '',
    area: '',
    cargo: '',
    email: '',
    telefono: '',
    pais: '',
    prioridad: 'P2',
    oportunidad: '',
    notas: '',
  });

  // Cargar datos completos del contacto cuando se abre el modal
  useEffect(() => {
    async function cargarContacto() {
      if (!isOpen || !contacto?.id) return;
      
      setCargando(true);
      
      const { data, error } = await supabase
        .from('contactos')
        .select('nombre, empresa, area, cargo, email, telefono, pais, prioridad, oportunidad, notas')
        .eq('id', contacto.id)
        .single();

      if (data && !error) {
        setForm({
          nombre: data.nombre || '',
          empresa: data.empresa || '',
          area: data.area || '',
          cargo: data.cargo || '',
          email: data.email || '',
          telefono: data.telefono || '',
          pais: data.pais || '',
          prioridad: data.prioridad || 'P2',
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
          pais: form.pais || null,
          prioridad: form.prioridad,
          oportunidad: form.oportunidad || null,
          notas: form.notas || null,
        })
        .eq('id', contacto.id);

      if (error) throw error;

      alert('Contacto actualizado correctamente');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error al actualizar contacto:', error);
      alert('Error al actualizar el contacto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Editar contacto</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {cargando ? (
          <div className="p-6 text-center text-gray-700">Cargando datos...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Fila 1: Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo *
              </label>
              <input
                type="text"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-[#9C0C54] focus:border-transparent"
              />
            </div>

            {/* Fila 2: Empresa y País */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa *
                </label>
                <input
                  type="text"
                  required
                  value={form.empresa}
                  onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-[#9C0C54] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  País
                </label>
                <select
                  value={form.pais}
                  onChange={(e) => setForm({ ...form, pais: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-[#9C0C54] focus:border-transparent"
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área
                </label>
                <input
                  type="text"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-[#9C0C54] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-[#9C0C54] focus:border-transparent"
                />
              </div>
            </div>

            {/* Fila 4: Email y Teléfono */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-[#9C0C54] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-[#9C0C54] focus:border-transparent"
                />
              </div>
            </div>

            {/* Fila 5: Prioridad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad *
              </label>
              <select
                required
                value={form.prioridad}
                onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-[#9C0C54] focus:border-transparent"
              >
                <option value="P1">P1 · Contacto cada 30 días</option>
                <option value="P2">P2 · Contacto cada 60 días</option>
                <option value="P3">P3 · Contacto cada 75 días</option>
              </select>
            </div>

            {/* Fila 6: Oportunidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Oportunidad en evaluación
              </label>
              <input
                type="text"
                value={form.oportunidad}
                onChange={(e) => setForm({ ...form, oportunidad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-[#9C0C54] focus:border-transparent"
              />
            </div>

            {/* Fila 7: Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas personales
              </label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-[#9C0C54] focus:border-transparent resize-none"
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-[#9C0C54] rounded-md hover:bg-[#7A0942] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}