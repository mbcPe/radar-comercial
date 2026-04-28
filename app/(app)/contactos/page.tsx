'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import ModalNuevoContacto from '@/components/ModalNuevoContacto';
import { useScope } from '@/lib/viewScope';

type Contacto = {
  id: string;
  nombre: string;
  empresa: string;
  area: string | null;
  cargo: string | null;
  prioridad: string;
  next_touch: string | null;
  last_touch: string | null;
  estado: string;
  pausa_hasta: string | null;
  oportunidad: string | null;
};

type Categoria = 'rezagado' | 'proximo' | 'aldia' | 'pausa';

function categoriaContacto(c: Contacto): Categoria {
  if (c.estado === 'pausa') return 'pausa';
  if (!c.next_touch) return 'aldia';
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const next = new Date(c.next_touch);
  const dias = Math.round((next.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (dias < -7) return 'rezagado';
  if (dias <= 14) return 'proximo';
  return 'aldia';
}

const ESTADOS = {
  rezagado: { label: 'Rezagado', bg: '#FCEBEB', text: '#791F1F' },
  proximo: { label: 'Próximo', bg: '#FAEEDA', text: '#633806' },
  aldia: { label: 'Al día', bg: '#EAF3DE', text: '#27500A' },
  pausa: { label: 'En pausa', bg: '#E6F1FB', text: '#0C447C' },
};

function formatearCorto(fecha: string | null): string {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es', { day: '2-digit', month: 'short' });
}

export default function ContactosPage() {
  const router = useRouter();
  const supabase = createClient();
  const { scope } = useScope();
  const [managerId, setManagerId] = useState<string | null>(null);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroOportunidad, setFiltroOportunidad] = useState<string>('todos');

  async function loadContactos(mgrId: string) {
    let query = supabase
      .from('contactos')
      .select('id, nombre, empresa, area, cargo, prioridad, next_touch, last_touch, estado, pausa_hasta, oportunidad')
      .order('nombre');
  
    if (scope === 'propia') {
      query = query.eq('manager_id', mgrId);
    }
  
    const { data } = await query;
    setContactos(data || []);
  }

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
  
      const { data: managerData } = await supabase
        .from('managers')
        .select('id')
        .eq('email', authUser.email)
        .single();
  
      if (managerData) {
        setManagerId(managerData.id);
        await loadContactos(managerData.id);
      }
      setLoading(false);
    }
    loadData();
  }, [supabase, scope]);

  if (loading) {
    return <div className="p-6 text-gray-700 text-sm">Cargando contactos...</div>;
  }

  // Aplicar filtros
  const filtrados = contactos.filter(c => {
    // Búsqueda por nombre o empresa
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!c.nombre.toLowerCase().includes(q) && !c.empresa.toLowerCase().includes(q)) {
        return false;
      }
    }

    // Filtro de prioridad
    if (filtroPrioridad !== 'todos' && c.prioridad !== filtroPrioridad) return false;

    // Filtro de estado
    if (filtroEstado !== 'todos' && categoriaContacto(c) !== filtroEstado) return false;

    // Filtro de oportunidad
    if (filtroOportunidad === 'con' && !c.oportunidad) return false;
    if (filtroOportunidad === 'sin' && c.oportunidad) return false;

    return true;
  });

  function limpiarFiltros() {
    setBusqueda('');
    setFiltroPrioridad('todos');
    setFiltroEstado('todos');
    setFiltroOportunidad('todos');
  }

  const hayFiltrosActivos =
    busqueda !== '' ||
    filtroPrioridad !== 'todos' ||
    filtroEstado !== 'todos' ||
    filtroOportunidad !== 'todos';

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-1">Contactos</h2>
      <p className="text-sm text-gray-700 mb-6">
        {scope === 'propia' ? 'Tu cartera completa' : 'Cartera del equipo'}
      </p>

      {/* Toolbar de filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o empresa..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 min-w-[240px] px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2"
        />

        <select
          value={filtroPrioridad}
          onChange={(e) => setFiltroPrioridad(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white cursor-pointer"
        >
          <option value="todos">Todas las prioridades</option>
          <option value="P1">P1 · 30 días</option>
          <option value="P2">P2 · 60 días</option>
          <option value="P3">P3 · 75 días</option>
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white cursor-pointer"
        >
          <option value="todos">Todos los estados</option>
          <option value="rezagado">Rezagados</option>
          <option value="proximo">Próximos</option>
          <option value="aldia">Al día</option>
          <option value="pausa">En pausa</option>
        </select>

        <select
          value={filtroOportunidad}
          onChange={(e) => setFiltroOportunidad(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white cursor-pointer"
        >
          <option value="todos">Todas las oportunidades</option>
          <option value="con">Con oportunidad</option>
          <option value="sin">Sin oportunidad</option>
        </select>

        {hayFiltrosActivos && (
          <button
            onClick={limpiarFiltros}
            className="text-xs text-gray-700 hover:text-gray-900 underline px-2"
          >
            Limpiar filtros
          </button>
        )}

        <button
          onClick={() => setModalAbierto(true)}
          className="ml-auto text-xs px-3 py-1.5 text-white rounded-md font-medium hover:opacity-90"
          style={{ backgroundColor: '#9C0C54' }}
        >
          + Nuevo contacto
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 text-sm font-medium text-gray-900">
          Resultados <span className="text-gray-600 font-normal">· {filtrados.length} de {contactos.length}</span>
        </div>

        {filtrados.length === 0 ? (
          <div className="text-center py-12 text-gray-700 text-sm">
            {hayFiltrosActivos ? (
              <>
                <p>Ningún contacto coincide con los filtros.</p>
                <button
                  onClick={limpiarFiltros}
                  className="text-xs underline mt-2"
                  style={{ color: '#9C0C54' }}
                >
                  Limpiar filtros
                </button>
              </>
            ) : (
              <p>No tienes contactos registrados todavía.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Nombre</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Empresa</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Cargo</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Área</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Prio</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Oportunidad</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Último</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Próximo</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => {
                  const cat = categoriaContacto(c);
                  const colors = ESTADOS[cat];
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/contactos/${c.id}`)}
                      className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                      <td className="px-4 py-3 text-gray-800">{c.empresa}</td>
                      <td className="px-4 py-3 text-gray-700">{c.cargo || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{c.area || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded font-medium bg-gray-100 text-gray-800">{c.prioridad}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {c.oportunidad ? (
                          <span className="px-2 py-1 rounded font-medium" style={{ backgroundColor: '#E1F5EE', color: '#085041' }}>
                            {c.oportunidad.length > 20 ? c.oportunidad.slice(0, 20) + '…' : c.oportunidad}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{formatearCorto(c.last_touch)}</td>
                      <td className="px-4 py-3 text-gray-800 text-xs">
                        {c.estado === 'pausa' ? formatearCorto(c.pausa_hasta) : formatearCorto(c.next_touch)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded font-medium" style={{ backgroundColor: colors.bg, color: colors.text }}>
                          {colors.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbierto && managerId && (
        <ModalNuevoContacto
          managerId={managerId}
          onClose={() => setModalAbierto(false)}
          onSaved={() => loadContactos(managerId)}
        />
      )}
    </div>
  );
}