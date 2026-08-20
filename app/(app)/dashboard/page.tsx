'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import ModalRegistrarAccion from '@/components/ModalRegistrarAccion';
import DashboardView, {
  type Actividad,
  type Contacto,
  type Manager,
  type Proyecto,
} from '@/components/dashboard/DashboardView';
import { MODO_DEMO } from '@/lib/modoDemo';
import { ACTIVIDADES, CONTACTOS, MANAGERS, PROYECTOS, USUARIO_DEMO } from '@/lib/demoData';

/** Cadencia de contacto por prioridad, igual que en ModalRegistrarAccion. */
const DIAS_POR_PRIORIDAD: Record<string, number> = { P1: 30, P2: 60, P3: 75 };

function getFechaInicio(per: string): string {
  const hoy = new Date();
  switch (per) {
    case '7dias':
      return new Date(hoy.getTime() - 7 * 86400000).toISOString();
    case 'mes':
      return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
    case 'mesanterior':
      return new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString();
    case '15dias':
    default:
      return new Date(hoy.getTime() - 15 * 86400000).toISOString();
  }
}

export default function DashboardPage() {
  const supabase = createClient();

  const [managerId, setManagerId] = useState<string | null>(null);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [actividadesPeriodo, setActividadesPeriodo] = useState<Actividad[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [managers, setManagers] = useState<Record<string, Manager>>({});
  const [loading, setLoading] = useState(true);

  const [periodo, setPeriodo] = useState('15dias');
  const [paisFiltro, setPaisFiltro] = useState('todos');
  const [ownerFiltro, setOwnerFiltro] = useState('todos');

  const [contactoSeleccionado, setContactoSeleccionado] = useState<Contacto | null>(null);

  async function loadData() {
    if (MODO_DEMO) {
      const desde = new Date(getFechaInicio(periodo)).getTime();
      const inicioMesDemo = new Date();
      inicioMesDemo.setDate(1);
      inicioMesDemo.setHours(0, 0, 0, 0);
      setContactos(CONTACTOS);
      setActividades(ACTIVIDADES);
      setActividadesPeriodo(ACTIVIDADES.filter((a) => new Date(a.fecha).getTime() >= desde));
      setProyectos(PROYECTOS.filter((p) => new Date(p.fecha_cierre) >= inicioMesDemo));
      return;
    }

    // El dashboard siempre mira la cartera completa del equipo
    const { data: contactosData } = await supabase
      .from('contactos')
      .select(
        'id, nombre, empresa, cargo, prioridad, next_touch, estado, pausa_hasta, oportunidad, manager_id, pais, cumple'
      );
    setContactos(contactosData || []);

    const { data: periodoData } = await supabase
      .from('actividades')
      .select('id, fecha, tipo, contacto_id, autor_id')
      .gte('fecha', getFechaInicio(periodo));
    setActividadesPeriodo(periodoData || []);

    const hace6Meses = new Date();
    hace6Meses.setMonth(hace6Meses.getMonth() - 6);
    const { data: historicoData } = await supabase
      .from('actividades')
      .select('id, fecha, tipo, contacto_id, autor_id')
      .gte('fecha', hace6Meses.toISOString());
    setActividades(historicoData || []);

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const { data: proyectosData } = await supabase
      .from('proyectos')
      .select('id, nombre, monto, fecha_cierre, estado, manager_id')
      .eq('estado', 'ganado')
      .gte('fecha_cierre', inicioMes.toISOString());
    setProyectos(proyectosData || []);
  }

  useEffect(() => {
    async function init() {
      if (MODO_DEMO) {
        setManagerId(USUARIO_DEMO.id);
        setManagers(MANAGERS);
        await loadData();
        setLoading(false);
        return;
      }

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: managerData } = await supabase
        .from('managers')
        .select('id')
        .eq('email', authUser.email)
        .single();

      if (managerData) {
        setManagerId(managerData.id);
        await loadData();

        const { data } = await supabase
          .from('managers')
          .select('id, nombre, iniciales')
          .eq('activo', true);
        const mapa: Record<string, Manager> = {};
        data?.forEach((m) => {
          mapa[m.id] = m;
        });
        setManagers(mapa);
      }
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    if (managerId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, managerId]);

  /**
   * Check de la agenda semanal: deja registrada la actividad con el medio elegido
   * y mueve la fecha del próximo contacto según la cadencia de la prioridad.
   */
  async function marcarContactado(c: Contacto, medio: string) {
    if (!managerId) return;


    const hoyISO = new Date().toISOString().slice(0, 10);
    const dias = DIAS_POR_PRIORIDAD[c.prioridad] ?? 60;
    const proximo = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);

    const { error: errAct } = await supabase.from('actividades').insert({
      contacto_id: c.id,
      autor_id: managerId,
      tipo: medio,
      fecha: hoyISO,
      resultado: `Contacto registrado desde el radar (${medio})`,
    });
    if (errAct) {
      alert('No se pudo registrar la actividad: ' + errAct.message);
      throw errAct;
    }

    const { error: errCon } = await supabase
      .from('contactos')
      .update({ last_touch: hoyISO, next_touch: proximo })
      .eq('id', c.id);
    if (errCon) {
      alert('La actividad quedó registrada, pero no se pudo mover el próximo contacto: ' + errCon.message);
      throw errCon;
    }

    await loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-mbc/70">
        <span className="h-2 w-2 animate-pulse rounded-full bg-acento" />
        Cargando radar…
      </div>
    );
  }

  const contactosFiltrados = contactos.filter((c) => {
    if (paisFiltro !== 'todos' && c.pais !== paisFiltro) return false;
    if (ownerFiltro !== 'todos' && c.manager_id !== ownerFiltro) return false;
    return true;
  });

  const idsVisibles = new Set(contactosFiltrados.map((c) => c.id));
  const filtrarActs = (arr: Actividad[]) => arr.filter((a) => idsVisibles.has(a.contacto_id));

  const paisesUnicos = [...new Set(contactos.map((c) => c.pais).filter(Boolean))] as string[];
  const hayFiltros = periodo !== '15dias' || paisFiltro !== 'todos' || ownerFiltro !== 'todos';

  const filtros = (
    <div className="card flex flex-wrap items-center gap-2 p-3">
      <span className="kicker mr-1">Filtros</span>
      <select
        value={periodo}
        onChange={(e) => setPeriodo(e.target.value)}
        className="field w-auto cursor-pointer py-1.5 text-xs"
      >
        <option value="7dias">Últimos 7 días</option>
        <option value="15dias">Últimos 15 días</option>
        <option value="mes">Este mes</option>
        <option value="mesanterior">Mes pasado</option>
      </select>

      <select
        value={paisFiltro}
        onChange={(e) => setPaisFiltro(e.target.value)}
        className="field w-auto cursor-pointer py-1.5 text-xs"
      >
        <option value="todos">Todos los países</option>
        {paisesUnicos.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <select
        value={ownerFiltro}
        onChange={(e) => setOwnerFiltro(e.target.value)}
        className="field w-auto cursor-pointer py-1.5 text-xs"
      >
        <option value="todos">Todo el equipo</option>
        {Object.values(managers).map((m) => (
          <option key={m.id} value={m.id}>
            {m.nombre}
          </option>
        ))}
      </select>

      {hayFiltros && (
        <button
          onClick={() => {
            setPeriodo('15dias');
            setPaisFiltro('todos');
            setOwnerFiltro('todos');
          }}
          className="text-xs font-medium text-acento hover:underline"
        >
          Limpiar
        </button>
      )}
    </div>
  );

  return (
    <>
      <DashboardView
        contactos={contactosFiltrados}
        actividades={filtrarActs(actividades)}
        actividadesPeriodo={filtrarActs(actividadesPeriodo)}
        proyectos={proyectos}
        managers={managers}
        filtros={filtros}
        onRegistrarAccion={setContactoSeleccionado}
        onMarcarContactado={marcarContactado}
      />

      {contactoSeleccionado && managerId && (
        <ModalRegistrarAccion
          contactoId={contactoSeleccionado.id}
          contactoNombre={contactoSeleccionado.nombre}
          contactoCargo={contactoSeleccionado.cargo || ''}
          contactoEmpresa={contactoSeleccionado.empresa}
          contactoPrioridad={contactoSeleccionado.prioridad}
          contactoOportunidad={contactoSeleccionado.oportunidad || ''}
          autorId={managerId}
          autorNombre=""
          onClose={() => setContactoSeleccionado(null)}
          onSaved={() => loadData()}
        />
      )}
    </>
  );
}
