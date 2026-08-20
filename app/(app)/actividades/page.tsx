'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useScope } from '@/lib/viewScope';
import { MODO_DEMO } from '@/lib/modoDemo';
import { ACTIVIDADES, CONTACTOS, MANAGERS_LISTA, USUARIO_DEMO } from '@/lib/demoData';

type Actividad = {
  id: string;
  contacto_id: string;
  tipo: string;
  resultado: string | null;
  proximos_pasos: string | null;
  fecha: string;
  autor_id: string;
};

type Contacto = {
  id: string;
  nombre: string;
  empresa: string;
  manager_id: string;
};

type Manager = {
  id: string;
  nombre: string;
  iniciales: string;
};

const TIPOS_ACCION = [
  'Llamada',
  'Reunión presencial',
  'Reunión virtual',
  'Email',
  'WhatsApp',
  'Mensaje LinkedIn',
];

function formatearFechaCorta(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

function diasDesde(fecha: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(fecha);
  return Math.round((hoy.getTime() - f.getTime()) / (1000 * 60 * 60 * 24));
}

function tagRelativo(fecha: string): string {
  const dias = diasDesde(fecha);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;
  if (dias < 30) return `Hace ${Math.floor(dias / 7)} semana${Math.floor(dias / 7) > 1 ? 's' : ''}`;
  if (dias < 365) return `Hace ${Math.floor(dias / 30)} mes${Math.floor(dias / 30) > 1 ? 'es' : ''}`;
  return `Hace ${Math.floor(dias / 365)} año${Math.floor(dias / 365) > 1 ? 's' : ''}`;
}

export default function ActividadesPage() {
  const router = useRouter();
  const supabase = createClient();
  const { scope } = useScope();
  const [managerId, setManagerId] = useState<string | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [contactos, setContactos] = useState<Record<string, Contacto>>({});
  const [autores, setAutores] = useState<Record<string, Manager>>({});
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroAutor, setFiltroAutor] = useState<string>('todos');

  useEffect(() => {
    async function loadData() {
      if (MODO_DEMO) {
        const propios =
          scope === 'propia'
            ? CONTACTOS.filter((c) => c.manager_id === USUARIO_DEMO.id)
            : CONTACTOS;
        setManagerId(USUARIO_DEMO.id);
        setContactos(Object.fromEntries(propios.map((c) => [c.id, c])));
        const ids = new Set(propios.map((c) => c.id));
        setActividades(
          ACTIVIDADES.filter((a) => ids.has(a.contacto_id)).map((a) => ({
            id: a.id,
            contacto_id: a.contacto_id,
            tipo: a.tipo,
            resultado: a.resultado ?? null,
            proximos_pasos: a.proximos_pasos ?? null,
            fecha: a.fecha,
            autor_id: a.autor_id,
          }))
        );
        setAutores(Object.fromEntries(MANAGERS_LISTA.map((m) => [m.id, m])));
        setLoading(false);
        return;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: meData } = await supabase
        .from('managers')
        .select('id')
        .eq('email', authUser.email)
        .single();

      if (!meData) {
        setLoading(false);
        return;
      }
      setManagerId(meData.id);

      // Cargar contactos del usuario logueado
      let queryContactos = supabase
      .from('contactos')
      .select('id, nombre, empresa, manager_id');
    
      if (scope === 'propia') {
        queryContactos = queryContactos.eq('manager_id', meData.id);
      }
    
    const { data: contactosData } = await queryContactos;

      const contactosArr = contactosData || [];
      const mapContactos: Record<string, Contacto> = {};
      contactosArr.forEach(c => { mapContactos[c.id] = c; });
      setContactos(mapContactos);

      if (contactosArr.length === 0) {
        setLoading(false);
        return;
      }

      // Cargar actividades de esos contactos
      const contactoIds = contactosArr.map(c => c.id);
      const { data: actividadesData } = await supabase
        .from('actividades')
        .select('*')
        .in('contacto_id', contactoIds)
        .order('fecha', { ascending: false });

      const actsArr = actividadesData || [];
      setActividades(actsArr);

      // Cargar autores
      if (actsArr.length > 0) {
        const autorIds = [...new Set(actsArr.map(a => a.autor_id))];
        const { data: autoresData } = await supabase
          .from('managers')
          .select('id, nombre, iniciales')
          .in('id', autorIds);

        const mapAutores: Record<string, Manager> = {};
        autoresData?.forEach(a => { mapAutores[a.id] = a; });
        setAutores(mapAutores);
      }

      setLoading(false);
    }
    loadData();
  }, [supabase, scope]);

  if (loading) {
    return <div className="p-6 text-tinta text-sm">Cargando actividades...</div>;
  }

  // Aplicar filtros
  const filtradas = actividades.filter(a => {
    if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) return false;
    if (filtroAutor !== 'todos' && a.autor_id !== filtroAutor) return false;
    return true;
  });

  // Métricas
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay());
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const hoyMs = hoy.getTime();
  const semanaMs = inicioSemana.getTime();
  const mesMs = inicioMes.getTime();

  const actsHoy = actividades.filter(a => new Date(a.fecha).getTime() >= hoyMs).length;
  const actsSemana = actividades.filter(a => new Date(a.fecha).getTime() >= semanaMs).length;
  const actsMes = actividades.filter(a => new Date(a.fecha).getTime() >= mesMs).length;

  // Lista única de autores para el filtro
  const autoresUnicos = Object.values(autores);

  function limpiarFiltros() {
    setFiltroTipo('todos');
    setFiltroAutor('todos');
  }

  const hayFiltros = filtroTipo !== 'todos' || filtroAutor !== 'todos';

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-mbc mb-1">Actividades</h2>
      <p className="text-sm text-tinta mb-6">
        {scope === 'propia' ? 'Tu historial de interacciones' : 'Historial del equipo completo'}
      </p>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-ceramica border border-ceramica-300 rounded-md p-3">
          <div className="text-[10px] font-medium text-tinta uppercase tracking-wide mb-1">Total</div>
          <div className="text-2xl font-medium text-mbc">{actividades.length}</div>
          <div className="text-xs text-arena mt-0.5">histórico</div>
        </div>
        <div className="bg-ceramica border border-ceramica-300 rounded-md p-3">
          <div className="text-[10px] font-medium text-tinta uppercase tracking-wide mb-1">Este mes</div>
          <div className="text-2xl font-medium text-mbc">{actsMes}</div>
          <div className="text-xs text-arena mt-0.5">acciones</div>
        </div>
        <div className="bg-ceramica border border-ceramica-300 rounded-md p-3">
          <div className="text-[10px] font-medium text-tinta uppercase tracking-wide mb-1">Esta semana</div>
          <div className="text-2xl font-medium text-mbc">{actsSemana}</div>
          <div className="text-xs text-arena mt-0.5">acciones</div>
        </div>
        <div className="bg-ceramica border border-ceramica-300 rounded-md p-3">
          <div className="text-[10px] font-medium text-tinta uppercase tracking-wide mb-1">Hoy</div>
          <div className="text-2xl font-medium" style={{ color: '#0A3A6B' }}>{actsHoy}</div>
          <div className="text-xs text-arena mt-0.5">{actsHoy === 1 ? 'acción' : 'acciones'}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-ceramica-300 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-2">
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-3 py-1.5 border border-ceramica-300 rounded-md text-sm text-mbc bg-white cursor-pointer"
        >
          <option value="todos">Todos los tipos</option>
          {TIPOS_ACCION.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {autoresUnicos.length > 1 && (
          <select
            value={filtroAutor}
            onChange={(e) => setFiltroAutor(e.target.value)}
            className="px-3 py-1.5 border border-ceramica-300 rounded-md text-sm text-mbc bg-white cursor-pointer"
          >
            <option value="todos">Todos los autores</option>
            {autoresUnicos.map(a => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        )}

        {hayFiltros && (
          <button
            onClick={limpiarFiltros}
            className="text-xs text-tinta hover:text-mbc underline px-2"
          >
            Limpiar filtros
          </button>
        )}

        <span className="ml-auto text-xs text-arena">
          {filtradas.length} de {actividades.length}
        </span>
      </div>

      {/* Timeline */}
      {filtradas.length === 0 ? (
        <div className="bg-white border border-ceramica-300 rounded-xl p-12 text-center">
          {actividades.length === 0 ? (
            <>
              <p className="text-sm text-tinta">Aún no has registrado ninguna actividad.</p>
              <p className="text-xs text-arena mt-1">Cuando registres una acción desde la ficha de un contacto, aparecerá aquí.</p>
            </>
          ) : (
            <p className="text-sm text-tinta">Ninguna actividad coincide con los filtros.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(a => {
            const c = contactos[a.contacto_id];
            const autor = autores[a.autor_id];
            return (
              <div
                key={a.id}
                onClick={() => c && router.push(`/contactos/${c.id}`)}
                className="bg-white border border-ceramica-300 rounded-xl p-4 cursor-pointer hover:bg-ceramica transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar del autor */}
                  {autor && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                      style={{ backgroundColor: '#0A3A6B' }}
                      title={autor.nombre}
                    >
                      {autor.iniciales}
                    </div>
                  )}

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: '#E2F4F8', color: '#0A6C7E' }}>
                          {a.tipo}
                        </span>
                        {c && (
                          <span className="text-sm">
                            con <span className="font-medium text-mbc">{c.nombre}</span>
                            <span className="text-arena"> · {c.empresa}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-arena">
                        {tagRelativo(a.fecha)} · {formatearFechaCorta(a.fecha)}
                      </div>
                    </div>

                    {a.resultado && (
                      <p className="text-sm text-tinta mt-1.5">{a.resultado}</p>
                    )}

                    {a.proximos_pasos && (
                      <div className="text-xs text-tinta mt-2 pl-3 border-l-2" style={{ borderColor: '#FDF0E1' }}>
                        <span className="text-arena">Próximos pasos:</span> {a.proximos_pasos}
                      </div>
                    )}

                    {autor && (
                      <div className="text-xs text-arena italic mt-2">
                        Registrado por {autor.nombre}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}