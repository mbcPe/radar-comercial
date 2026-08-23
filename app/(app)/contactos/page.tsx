'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useScope } from '@/lib/viewScope';
import ModalNuevoContacto from '@/components/ModalNuevoContacto';
import ModalRegistrarAccion from '@/components/ModalRegistrarAccion';
import ModalEditarContacto from '@/components/ModalEditarContacto';
import ModalImportarContactos from '@/components/ModalImportarContactos';
import { MODO_DEMO } from '@/lib/modoDemo';
import { CONTACTOS, MANAGERS, USUARIO_DEMO } from '@/lib/demoData';

type Contacto = {
  id: string;
  nombre: string;
  empresa: string;
  pais: string | null;
  cargo: string | null;
  prioridad: string;
  last_touch: string | null;
  next_touch: string | null;
  estado: string;
  pausa_hasta: string | null;
  oportunidad: string | null;
  manager_id: string;
  cumple: string | null;
};

/** Días hasta el próximo cumpleaños, ignorando el año de nacimiento. */
function diasHastaCumple(cumple: string | null): number | null {
  if (!cumple) return null;
  const f = new Date(cumple);
  if (Number.isNaN(f.getTime())) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let prox = new Date(hoy.getFullYear(), f.getMonth(), f.getDate());
  if (prox < hoy) prox = new Date(hoy.getFullYear() + 1, f.getMonth(), f.getDate());
  return Math.round((prox.getTime() - hoy.getTime()) / 86400000);
}

type Manager = {
  id: string;
  nombre: string;
  iniciales: string;
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
  rezagado: { label: 'Rezagado', bg: '#EAF2FE', text: '#A62222' },
  proximo: { label: 'Próximo', bg: '#FDF0E1', text: '#9A5400' },
  aldia: { label: 'Al día', bg: '#E7F6EE', text: '#1E6B3C' },
  pausa: { label: 'En pausa', bg: '#E2F4F8', text: '#0A6C7E' },
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
  const [managers, setManagers] = useState<Record<string, Manager>>({});
  const [loading, setLoading] = useState(true);
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [modalAccionAbierto, setModalAccionAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalImportarAbierto, setModalImportarAbierto] = useState(false);
  const [contactoSeleccionado, setContactoSeleccionado] = useState<Contacto | null>(null);

  // Filtros del toolbar
  const [busqueda, setBusqueda] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todos');
  const [filtroPais, setFiltroPais] = useState<string>('todos');
  const [filtroManager, setFiltroManager] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  // El semáforo del radar enlaza aquí con ?estado=rezagado|proximo|aldia|pausa
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('estado');
    if (p && ['rezagado', 'proximo', 'aldia', 'pausa'].includes(p)) setFiltroEstado(p);
  }, []);

  async function loadContactos(mgrId: string, currentScope: string) {
    if (MODO_DEMO) {
      setContactos(
        currentScope === 'propia' ? CONTACTOS.filter((c) => c.manager_id === mgrId) : CONTACTOS
      );
      return;
    }

    let query = supabase
      .from('contactos')
      .select('id, nombre, empresa, pais, cargo, prioridad, last_touch, next_touch, estado, pausa_hasta, oportunidad, manager_id, cumple');
    
    if (currentScope === 'propia') {
      query = query.eq('manager_id', mgrId);
    }
    
    const { data } = await query;
    setContactos(data || []);
  }

  async function loadManagers() {
    const { data } = await supabase
      .from('managers')
      .select('id, nombre, iniciales')
      .eq('activo', true);
    
    const mapManagers: Record<string, Manager> = {};
    data?.forEach(m => { mapManagers[m.id] = m; });
    setManagers(mapManagers);
  }

  useEffect(() => {
    async function loadData() {
      if (MODO_DEMO) {
        setManagerId(USUARIO_DEMO.id);
        setManagers(MANAGERS);
        await loadContactos(USUARIO_DEMO.id, scope);
        setLoading(false);
        return;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: managerData } = await supabase
        .from('managers')
        .select('id')
        .eq('email', authUser.email)
        .single();

      if (managerData) {
        setManagerId(managerData.id);
        await loadContactos(managerData.id, scope);
        await loadManagers();
      }
      setLoading(false);
    }
    loadData();
  }, [supabase]);

  useEffect(() => {
    if (managerId) {
      loadContactos(managerId, scope);
    }
  }, [scope, managerId]);

  if (loading) {
    return <div className="p-6 text-tinta text-sm">Cargando contactos...</div>;
  }

  let filtrados = contactos;

  if (busqueda) {
    const q = busqueda.toLowerCase();
    filtrados = filtrados.filter(c => 
      c.nombre.toLowerCase().includes(q) || 
      c.empresa.toLowerCase().includes(q)
    );
  }

  if (filtroPrioridad !== 'todos') {
    filtrados = filtrados.filter(c => c.prioridad === filtroPrioridad);
  }

  if (filtroPais !== 'todos') {
    filtrados = filtrados.filter(c => c.pais === filtroPais);
  }

  if (filtroManager !== 'todos') {
    filtrados = filtrados.filter(c => c.manager_id === filtroManager);
  }

  if (filtroEstado !== 'todos') {
    filtrados = filtrados.filter(c => categoriaContacto(c) === filtroEstado);
  }

  const ordenados = filtrados.sort((a, b) => {
    const catA = categoriaContacto(a);
    const catB = categoriaContacto(b);
    
    const orden = { rezagado: 1, proximo: 2, aldia: 3, pausa: 4 };
    if (orden[catA] !== orden[catB]) {
      return orden[catA] - orden[catB];
    }

    if (!a.next_touch && !b.next_touch) return 0;
    if (!a.next_touch) return 1;
    if (!b.next_touch) return -1;
    return new Date(a.next_touch).getTime() - new Date(b.next_touch).getTime();
  });

  function limpiarFiltros() {
    setBusqueda('');
    setFiltroPrioridad('todos');
    setFiltroPais('todos');
    setFiltroManager('todos');
    setFiltroEstado('todos');
  }

  const hayFiltrosActivos = 
    busqueda !== '' ||
    filtroPrioridad !== 'todos' ||
    filtroPais !== 'todos' ||
    filtroManager !== 'todos' ||
    filtroEstado !== 'todos';

  const paisesUnicos = [...new Set(contactos.map(c => c.pais).filter(Boolean))];

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-mbc mb-1">Contactos</h2>
      <p className="text-sm text-tinta mb-6">Tu cartera completa</p>

      {/* Toolbar de filtros */}
      <div className="bg-white border border-ceramica-300 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o empresa..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 min-w-[220px] px-3 py-1.5 border border-ceramica-300 rounded-md text-sm text-mbc focus:outline-none focus:ring-2"
        />

        <select
          value={filtroPrioridad}
          onChange={(e) => setFiltroPrioridad(e.target.value)}
          className="px-3 py-1.5 border border-ceramica-300 rounded-md text-sm text-mbc bg-white cursor-pointer"
        >
          <option value="todos">Todas las prioridades</option>
          <option value="P1">P1 · 30 días</option>
          <option value="P2">P2 · 60 días</option>
          <option value="P3">P3 · 75 días</option>
        </select>

        <select
          value={filtroPais}
          onChange={(e) => setFiltroPais(e.target.value)}
          className="px-3 py-1.5 border border-ceramica-300 rounded-md text-sm text-mbc bg-white cursor-pointer"
        >
          <option value="todos">Todos los países</option>
          {paisesUnicos.map(p => (
            <option key={p} value={p!}>{p}</option>
          ))}
        </select>

        <select
          value={filtroManager}
          onChange={(e) => setFiltroManager(e.target.value)}
          className="px-3 py-1.5 border border-ceramica-300 rounded-md text-sm text-mbc bg-white cursor-pointer"
        >
          <option value="todos">Todos los managers</option>
          {Object.values(managers).map(m => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>

        {/* Semáforo como filtro rápido (lo enlaza el radar) */}
        <div className="flex flex-wrap items-center gap-1">
          {([
            ['todos', 'Todos', '#0A3A6B'],
            ['rezagado', 'Rezagados', '#1F6FEB'],
            ['proximo', 'Próximos', '#E58413'],
            ['aldia', 'Al día', '#2E9E5B'],
            ['pausa', 'En pausa', '#0D8FA6'],
          ] as const).map(([valor, label, color]) => {
            const activo = filtroEstado === valor;
            return (
              <button
                key={valor}
                onClick={() => setFiltroEstado(valor)}
                className="chip transition-colors"
                style={{
                  backgroundColor: activo ? color : '#F3F6FA',
                  color: activo ? '#fff' : '#2B3440',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {hayFiltrosActivos && (
          <button
            onClick={limpiarFiltros}
            className="text-xs text-tinta hover:text-mbc underline px-2"
          >
            Limpiar filtros
          </button>
        )}

        <button
          onClick={() => setModalNuevoAbierto(true)}
          className="ml-auto text-xs px-3 py-1.5 text-white rounded-md font-medium hover:opacity-90"
          style={{ backgroundColor: '#0A3A6B' }}
        >
          + Nuevo contacto
        </button>

        <button
          onClick={() => setModalImportarAbierto(true)}
          className="text-xs px-3 py-1.5 border border-ceramica-300 rounded-md font-medium hover:bg-ceramica text-tinta"
        >
          📥 Importar
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-ceramica-300 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-ceramica-300 text-sm font-medium text-mbc">
          Contactos comerciales <span className="text-arena font-normal">· {ordenados.length} resultados</span>
        </div>

        {ordenados.length === 0 ? (
          <div className="text-center py-12 text-tinta text-sm">
            {hayFiltrosActivos ? (
              <>
                <p>Ningún contacto coincide con los filtros.</p>
                <button
                  onClick={limpiarFiltros}
                  className="text-xs underline mt-2"
                  style={{ color: '#0A3A6B' }}
                >
                  Limpiar filtros
                </button>
              </>
            ) : (
              <p>No tienes contactos registrados todavía.</p>
            )}
          </div>
        ) : (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-ceramica">
                <tr className="text-left">
                  <th className="px-3 py-2 text-xs font-medium text-tinta uppercase tracking-wide">Nombre</th>
                  <th className="px-3 py-2 text-xs font-medium text-tinta uppercase tracking-wide">Empresa</th>
                  <th className="px-3 py-2 text-xs font-medium text-tinta uppercase tracking-wide">País</th>
                  <th className="px-3 py-2 text-xs font-medium text-tinta uppercase tracking-wide text-center">Manager</th>
                  <th className="px-3 py-2 text-xs font-medium text-tinta uppercase tracking-wide">Cargo</th>
                  <th className="px-3 py-2 text-xs font-medium text-tinta uppercase tracking-wide">Prio</th>
                  <th className="px-3 py-2 text-xs font-medium text-tinta uppercase tracking-wide">Oportunidad</th>
                  <th className="px-3 py-2 text-xs font-medium text-tinta uppercase tracking-wide">Último</th>
                  <th className="px-3 py-2 text-xs font-medium text-tinta uppercase tracking-wide">Próximo</th>
                  <th className="px-3 py-2 text-xs font-medium text-tinta uppercase tracking-wide">Estado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {ordenados.map(c => {
                  const cat = categoriaContacto(c);
                  const colors = ESTADOS[cat];
                  const mgr = managers[c.manager_id];
                  
                  return (
                    <tr
                      key={c.id}
                      className="border-t border-gray-100 hover:bg-ceramica"
                    >
                      <td
                        className="px-3 py-3 font-medium text-mbc cursor-pointer"
                        onClick={() => router.push(`/contactos/${c.id}`)}
                      >
                        <span className="flex items-center gap-1.5">
                          {c.nombre}
                          {(() => {
                            const d = diasHastaCumple(c.cumple);
                            if (d === null || d > 30) return null;
                            return (
                              <span
                                title={`Cumpleaños ${d === 0 ? 'hoy' : `en ${d} días`}`}
                                className="chip"
                                style={{
                                  backgroundColor: d <= 7 ? '#1F6FEB' : '#EAF2FE',
                                  color: d <= 7 ? '#fff' : '#A62222',
                                }}
                              >
                                🎂 {d === 0 ? 'hoy' : `${d}d`}
                              </span>
                            );
                          })()}
                        </span>
                      </td>
                      <td 
                        className="px-3 py-3 text-tinta cursor-pointer"
                        onClick={() => router.push(`/contactos/${c.id}`)}
                      >
                        {c.empresa}
                      </td>
                      <td 
                        className="px-3 py-3 text-tinta cursor-pointer"
                        onClick={() => router.push(`/contactos/${c.id}`)}
                      >
                        {c.pais || '—'}
                      </td>
                      <td 
                        className="px-3 py-3 cursor-pointer text-center"
                        onClick={() => router.push(`/contactos/${c.id}`)}
                      >
                        {mgr && (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white mx-auto"
                            style={{ backgroundColor: '#0A3A6B' }}
                            title={mgr.nombre}
                          >
                            {mgr.iniciales}
                          </div>
                        )}
                      </td>
                      <td 
                        className="px-3 py-3 text-tinta cursor-pointer"
                        onClick={() => router.push(`/contactos/${c.id}`)}
                      >
                        {c.cargo || '—'}
                      </td>
                      <td 
                        className="px-3 py-3 cursor-pointer"
                        onClick={() => router.push(`/contactos/${c.id}`)}
                      >
                        <span className="text-xs px-2 py-1 rounded font-medium bg-ceramica text-tinta">
                          {c.prioridad}
                        </span>
                      </td>
                      <td 
                        className="px-3 py-3 text-xs cursor-pointer"
                        onClick={() => router.push(`/contactos/${c.id}`)}
                      >
                        {c.oportunidad ? (
                          <span className="px-2 py-1 rounded font-medium" style={{ backgroundColor: '#E7F6EE', color: '#1E6B3C' }}>
                            {c.oportunidad.length > 18 ? c.oportunidad.slice(0, 18) + '…' : c.oportunidad}
                          </span>
                        ) : (
                          <span className="text-arena">—</span>
                        )}
                      </td>
                      <td
                        className="px-3 py-3 text-tinta text-xs cursor-pointer"
                        onClick={() => router.push(`/contactos/${c.id}`)}
                      >
                        {formatearCorto(c.last_touch)}
                      </td>
                      <td
                        className="px-3 py-3 text-tinta text-xs cursor-pointer"
                        onClick={() => router.push(`/contactos/${c.id}`)}
                      >
                        {c.estado === 'pausa' ? formatearCorto(c.pausa_hasta) : formatearCorto(c.next_touch)}
                      </td>
                      <td 
                        className="px-3 py-3 cursor-pointer"
                        onClick={() => router.push(`/contactos/${c.id}`)}
                      >
                        <span className="text-xs px-2 py-1 rounded font-medium" style={{ backgroundColor: colors.bg, color: colors.text }}>
                          {colors.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setContactoSeleccionado(c);
                              setModalAccionAbierto(true);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded border hover:bg-[#EAF2FE]"
                            style={{ borderColor: '#0A3A6B', color: '#0A3A6B' }}
                            title="Registrar acción"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 5v14M5 12h14"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setContactoSeleccionado(c);
                              setModalEditarAbierto(true);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded border hover:bg-[#EAF2FE]"
                            style={{ borderColor: '#0A3A6B', color: '#0A3A6B' }}
                            title="Editar contacto"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* En móvil la tabla de 11 columnas es ilegible: se muestra como tarjetas */}
        {ordenados.length > 0 && (
          <div className="divide-y divide-ceramica md:hidden">
            {ordenados.map((c) => {
              const cat = categoriaContacto(c);
              const colors = ESTADOS[cat];
              const mgr = managers[c.manager_id];
              const dCumple = diasHastaCumple(c.cumple);

              return (
                <div key={c.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => router.push(`/contactos/${c.id}`)}
                        className="block w-full truncate text-left text-sm font-semibold text-mbc"
                      >
                        {c.nombre}
                        {dCumple !== null && dCumple <= 30 && (
                          <span className="ml-1.5 text-xs">🎂</span>
                        )}
                      </button>
                      <div className="truncate text-xs text-tinta/70">
                        {c.empresa}
                        {c.cargo ? ` · ${c.cargo}` : ''}
                      </div>
                    </div>
                    {mgr && (
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{ backgroundColor: '#0A3A6B' }}
                        title={mgr.nombre}
                      >
                        {mgr.iniciales}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className="rounded-full px-2 py-1 text-[11px] font-semibold"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {colors.label}
                    </span>
                    <span className="rounded-full bg-ceramica px-2 py-1 text-[11px] font-semibold text-tinta">
                      {c.prioridad}
                    </span>
                    <span className="rounded-full bg-ceramica px-2 py-1 text-[11px] text-tinta">
                      Próx. {c.estado === 'pausa' ? formatearCorto(c.pausa_hasta) : formatearCorto(c.next_touch)}
                    </span>
                  </div>

                  {c.oportunidad && (
                    <div className="mt-2 truncate text-xs text-tinta/70">
                      <span className="font-semibold text-mbc">En juego:</span> {c.oportunidad}
                    </div>
                  )}

                  {/* Objetivos táctiles de 40px, no de 28 como en la tabla */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        setContactoSeleccionado(c);
                        setModalAccionAbierto(true);
                      }}
                      className="btn-primary flex-1 py-2.5 text-xs"
                    >
                      Registrar acción
                    </button>
                    <button
                      onClick={() => {
                        setContactoSeleccionado(c);
                        setModalEditarAbierto(true);
                      }}
                      className="btn-ghost px-4 py-2.5 text-xs"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modales */}
      {modalNuevoAbierto && managerId && (
        <ModalNuevoContacto
          managerId={managerId}
          onClose={() => setModalNuevoAbierto(false)}
          onSaved={() => loadContactos(managerId, scope)}
        />
      )}

      {modalAccionAbierto && contactoSeleccionado && managerId && (
        <ModalRegistrarAccion
          contactoId={contactoSeleccionado.id}
          contactoNombre={contactoSeleccionado.nombre}
          contactoCargo={contactoSeleccionado.cargo || ''}
          contactoEmpresa={contactoSeleccionado.empresa}
          contactoPrioridad={contactoSeleccionado.prioridad}
          contactoOportunidad={contactoSeleccionado.oportunidad || ''}
          autorId={managerId}
          autorNombre=""
          onClose={() => {
            setModalAccionAbierto(false);
            setContactoSeleccionado(null);
          }}
          onSaved={() => loadContactos(managerId, scope)}
        />
      )}

      {modalEditarAbierto && contactoSeleccionado && (
        <ModalEditarContacto
          isOpen={modalEditarAbierto}
          onClose={() => {
            setModalEditarAbierto(false);
            setContactoSeleccionado(null);
          }}
          contacto={{ id: contactoSeleccionado.id }}
          onSuccess={() => {
            if (managerId) loadContactos(managerId, scope);
          }}
        />
      )}

      {modalImportarAbierto && (
        <ModalImportarContactos
          onClose={() => setModalImportarAbierto(false)}
          onSuccess={() => {
            if (managerId) loadContactos(managerId, scope);
          }}
        />
      )}
    </div>
  );
}