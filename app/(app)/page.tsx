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
  cargo: string;
  prioridad: string;
  next_touch: string | null;
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
  const diffDias = Math.round((next.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias < -7) return 'rezagado';
  if (diffDias <= 14) return 'proximo';
  return 'aldia';
}

const CATEGORIAS = {
  rezagado: { label: 'Rezagado', bg: '#FCEBEB', text: '#791F1F', dot: '#E24B4A' },
  proximo: { label: 'Próximo', bg: '#FAEEDA', text: '#633806', dot: '#EF9F27' },
  aldia: { label: 'Al día', bg: '#EAF3DE', text: '#27500A', dot: '#639922' },
  pausa: { label: 'En pausa', bg: '#E6F1FB', text: '#0C447C', dot: '#378ADD' },
};

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  const { scope } = useScope();
  const [managerId, setManagerId] = useState<string | null>(null);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Categoria | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  async function loadContactos(mgrId: string) {
    let query = supabase
      .from('contactos')
      .select('id, nombre, empresa, cargo, prioridad, next_touch, estado, pausa_hasta, oportunidad');
  
    // Si es vista propia, filtrar por manager_id
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

  function handleCardClick(cat: Categoria) {
    setFiltro(filtro === cat ? null : cat);
  }

  if (loading) {
    return <div className="p-6 text-gray-700 text-sm">Cargando contactos...</div>;
  }

  const conteos = {
    rezagado: contactos.filter(c => categoriaContacto(c) === 'rezagado').length,
    proximo: contactos.filter(c => categoriaContacto(c) === 'proximo').length,
    aldia: contactos.filter(c => categoriaContacto(c) === 'aldia').length,
    pausa: contactos.filter(c => categoriaContacto(c) === 'pausa').length,
  };

  const contactosVisibles = filtro
    ? contactos.filter(c => categoriaContacto(c) === filtro)
    : contactos;

  const tituloLista = filtro ? CATEGORIAS[filtro].label : 'Todos los contactos';

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-1">Radar Comercial</h2>
      <p className="text-sm text-gray-700 mb-6">
        {scope === 'propia' ? 'Tu cartera de contactos' : 'Cartera del equipo completo'}
      </p>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {(Object.keys(CATEGORIAS) as Categoria[]).map(cat => {
          const c = CATEGORIAS[cat];
          const activa = filtro === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCardClick(cat)}
              className="text-left p-4 rounded-xl transition-all hover:-translate-y-0.5 relative"
              style={{
                backgroundColor: c.bg,
                border: activa ? '2px solid #1f2937' : '2px solid transparent',
              }}
            >
              {activa && (
                <span className="absolute top-2 right-3 text-xs font-bold" style={{ color: c.text }}>✓</span>
              )}
              <div className="text-xs font-medium flex items-center gap-2" style={{ color: c.text }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c.dot }}></span>
                {c.label}
              </div>
              <div className="text-2xl font-medium mt-1" style={{ color: c.text }}>
                {conteos[cat]}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">
            {tituloLista} <span className="text-gray-600 font-normal">· {contactosVisibles.length}</span>
          </span>
          <button
            onClick={() => setModalAbierto(true)}
            className="text-xs px-3 py-1.5 text-white rounded-md font-medium hover:opacity-90"
            style={{ backgroundColor: '#9C0C54' }}
          >
            + Nuevo contacto
          </button>
        </div>

        {contactosVisibles.length === 0 ? (
          <div className="text-center py-12 text-gray-700 text-sm">
            <p>No hay contactos en esta categoría.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Empresa</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Cargo</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Prioridad</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Oportunidad</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Próximo</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody>
              {contactosVisibles.map(c => {
                const cat = categoriaContacto(c);
                const colors = CATEGORIAS[cat];
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/contactos/${c.id}`)}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                    <td className="px-4 py-3 text-gray-800">{c.empresa}</td>
                    <td className="px-4 py-3 text-gray-700">{c.cargo}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded font-medium bg-gray-100 text-gray-800">{c.prioridad}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.oportunidad ? (
                        <span className="px-2 py-1 rounded font-medium" style={{ backgroundColor: '#E1F5EE', color: '#085041' }}>
                          {c.oportunidad.length > 22 ? c.oportunidad.slice(0, 22) + '…' : c.oportunidad}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      {c.estado === 'pausa' ? (c.pausa_hasta || '—') : (c.next_touch || '—')}
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