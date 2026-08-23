'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import RespaldoDatos from '@/components/RespaldoDatos';
import { MODO_DEMO } from '@/lib/modoDemo';
import { CONTACTOS, MANAGERS_LISTA, PROYECTOS, USUARIO_DEMO } from '@/lib/demoData';


type Manager = {
  id: string;
  nombre: string;
  iniciales: string;
  rol: string;
  email: string;
};

type Contacto = {
  id: string;
  manager_id: string;
  estado: string;
  next_touch: string | null;
  oportunidad: string | null;
};

type Proyecto = {
  id: string;
  manager_id: string;
  monto: number | null;
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

function formatearMonto(n: number): string {
  if (n === 0) return '$0';
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  return '$' + (n / 1000).toFixed(0) + 'K';
}

type StatsManager = {
  manager: Manager;
  contactos: Contacto[];
  rezagados: number;
  proximos: number;
  alDia: number;
  pausa: number;
  activos: number;
  cumplimiento: number;
  oportunidades: number;
  proyectos: Proyecto[];
  montoCerrado: number;
};

export default function EquipoPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<StatsManager[]>([]);
  const [usuarioActualId, setUsuarioActualId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Totales globales
  const [totalContactos, setTotalContactos] = useState(0);
  const [totalRezagados, setTotalRezagados] = useState(0);
  const [totalOportunidades, setTotalOportunidades] = useState(0);
  const [totalCerrado, setTotalCerrado] = useState(0);
  const [totalProyectos, setTotalProyectos] = useState(0);

  useEffect(() => {
    async function loadData() {
      if (MODO_DEMO) {
        setUsuarioActualId(USUARIO_DEMO.id);
        const statsDemo: StatsManager[] = MANAGERS_LISTA.map((m) => {
          const cs = CONTACTOS.filter((c) => c.manager_id === m.id);
          const pausa = cs.filter((c) => categoriaContacto(c) === 'pausa').length;
          const alDia = cs.filter((c) => categoriaContacto(c) === 'aldia').length;
          const activos = cs.length - pausa;
          const provs = PROYECTOS.filter((p) => p.manager_id === m.id);
          return {
            manager: m,
            contactos: cs,
            rezagados: cs.filter((c) => categoriaContacto(c) === 'rezagado').length,
            proximos: cs.filter((c) => categoriaContacto(c) === 'proximo').length,
            alDia,
            pausa,
            activos,
            cumplimiento: activos > 0 ? (alDia / activos) * 100 : 100,
            oportunidades: cs.filter((c) => c.oportunidad).length,
            proyectos: provs,
            montoCerrado: provs.reduce((s, p) => s + (p.monto || 0), 0),
          };
        }).sort((a, b) => b.cumplimiento - a.cumplimiento);

        setStats(statsDemo);
        setTotalContactos(CONTACTOS.length);
        setTotalRezagados(CONTACTOS.filter((c) => categoriaContacto(c) === 'rezagado').length);
        setTotalOportunidades(CONTACTOS.filter((c) => c.oportunidad).length);
        setTotalCerrado(PROYECTOS.reduce((s, p) => s + (p.monto || 0), 0));
        setTotalProyectos(PROYECTOS.length);
        setLoading(false);
        return;
      }

      // Identificar al usuario logueado
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: meData } = await supabase
          .from('managers')
          .select('id')
          .eq('email', authUser.email)
          .single();
        if (meData) setUsuarioActualId(meData.id);
      }

      // Cargar todos los managers
      const { data: managersData } = await supabase
        .from('managers')
        .select('id, nombre, iniciales, rol, email')
        .eq('activo', true)
        .order('nombre');

      // Cargar todos los contactos
      const { data: contactosData } = await supabase
        .from('contactos')
        .select('id, manager_id, estado, next_touch, oportunidad');

      // Cargar todos los proyectos
      const { data: proyectosData } = await supabase
        .from('proyectos')
        .select('id, manager_id, monto');

      const managers = managersData || [];
      const contactos = contactosData || [];
      const proyectos = proyectosData || [];

      // Calcular stats por manager
      const statsArray: StatsManager[] = managers.map(m => {
        const cs = contactos.filter(c => c.manager_id === m.id);
        const rezagados = cs.filter(c => categoriaContacto(c) === 'rezagado').length;
        const proximos = cs.filter(c => categoriaContacto(c) === 'proximo').length;
        const alDia = cs.filter(c => categoriaContacto(c) === 'aldia').length;
        const pausa = cs.filter(c => categoriaContacto(c) === 'pausa').length;
        const activos = cs.length - pausa;
        const cumplimiento = activos > 0 ? (alDia / activos) * 100 : 100;
        const oportunidades = cs.filter(c => c.oportunidad).length;
        const provs = proyectos.filter(p => p.manager_id === m.id);
        const montoCerrado = provs.reduce((sum, p) => sum + (p.monto || 0), 0);

        return {
          manager: m,
          contactos: cs,
          rezagados,
          proximos,
          alDia,
          pausa,
          activos,
          cumplimiento,
          oportunidades,
          proyectos: provs,
          montoCerrado,
        };
      });

      // Ordenar por cumplimiento descendente
      statsArray.sort((a, b) => b.cumplimiento - a.cumplimiento);
      setStats(statsArray);

      // Totales globales
      setTotalContactos(contactos.length);
      setTotalRezagados(contactos.filter(c => categoriaContacto(c) === 'rezagado').length);
      setTotalOportunidades(contactos.filter(c => c.oportunidad).length);
      setTotalCerrado(proyectos.reduce((sum, p) => sum + (p.monto || 0), 0));
      setTotalProyectos(proyectos.length);

      setLoading(false);
    }

    loadData();
  }, [supabase]);

  if (loading) {
    return <div className="p-6 text-tinta text-sm">Cargando equipo...</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-mbc mb-1">Equipo</h2>
      <p className="text-sm text-tinta mb-6">Performance del equipo comercial</p>

      <div className="mb-6">
        <RespaldoDatos />
      </div>

      {/* Métricas globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-ceramica border border-ceramica-300 rounded-md p-3">
          <div className="text-[10px] font-medium text-tinta uppercase tracking-wide mb-1">Contactos</div>
          <div className="text-2xl font-medium text-mbc">{totalContactos}</div>
          <div className="text-xs text-arena mt-0.5">en el equipo</div>
        </div>
        <div className="bg-ceramica border border-ceramica-300 rounded-md p-3">
          <div className="text-[10px] font-medium text-tinta uppercase tracking-wide mb-1">Rezagados</div>
          <div className="text-2xl font-medium" style={{ color: '#A62222' }}>{totalRezagados}</div>
          <div className="text-xs text-arena mt-0.5">
            {totalContactos > 0 ? `${((totalRezagados / totalContactos) * 100).toFixed(0)}% del total` : '—'}
          </div>
        </div>
        <div className="bg-ceramica border border-ceramica-300 rounded-md p-3">
          <div className="text-[10px] font-medium text-tinta uppercase tracking-wide mb-1">Oportunidades</div>
          <div className="text-2xl font-medium text-mbc">{totalOportunidades}</div>
          <div className="text-xs text-arena mt-0.5">activas</div>
        </div>
        <div className="bg-ceramica border border-ceramica-300 rounded-md p-3">
          <div className="text-[10px] font-medium text-tinta uppercase tracking-wide mb-1">Cerrado histórico</div>
          <div className="text-2xl font-medium" style={{ color: '#2E9E5B' }}>{formatearMonto(totalCerrado)}</div>
          <div className="text-xs text-arena mt-0.5">{totalProyectos} proyectos</div>
        </div>
      </div>

      {/* Ranking por consultor */}
      <div className="bg-white border border-ceramica-300 rounded-xl p-4">
        <h3 className="text-sm font-medium text-mbc mb-3">Performance por consultor</h3>

        {stats.length === 0 ? (
          <p className="text-sm text-tinta py-4">No hay managers registrados.</p>
        ) : (
          <div className="space-y-1">
            {stats.map((s, idx) => {
              const esYo = s.manager.id === usuarioActualId;
              const colorBarra = s.cumplimiento > 80 ? '#2E9E5B' : s.cumplimiento > 60 ? '#E58413' : '#1F6FEB';

              return (
                <div
                  key={s.manager.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-md"
                  style={{ backgroundColor: esYo ? '#E2F4F8' : 'transparent' }}
                >
                  {/* Posición */}
                  <div className="w-6 h-6 rounded-full bg-ceramica flex items-center justify-center text-xs font-medium text-tinta flex-shrink-0">
                    {idx + 1}
                  </div>

                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: '#0A3A6B' }}
                  >
                    {s.manager.iniciales}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <div className="text-sm">
                        <span className="font-medium text-mbc">{s.manager.nombre}</span>
                        {esYo && (
                          <span className="text-xs ml-1.5" style={{ color: '#0A6C7E' }}>· tú</span>
                        )}
                        <span className="text-xs text-arena ml-1.5">· {s.manager.rol}</span>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span>
                          <span className="text-arena">Cumplimiento</span>{' '}
                          <span className="font-medium text-mbc">{s.cumplimiento.toFixed(0)}%</span>
                        </span>
                        <span>
                          <span className="text-arena">Cerrado</span>{' '}
                          <span className="font-medium" style={{ color: '#2E9E5B' }}>{formatearMonto(s.montoCerrado)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-arena mt-1">
                      {s.contactos.length} contactos
                      {s.activos !== s.contactos.length && ` (${s.activos} activos)`}
                      <span> · </span>
                      <span style={{ color: '#A62222' }}>{s.rezagados} rezagados</span>
                      <span> · </span>
                      <span style={{ color: '#1E6B3C' }}>{s.oportunidades} oportunidades</span>
                      <span> · </span>
                      <span style={{ color: '#2E9E5B' }}>{s.proyectos.length} proyectos</span>
                    </div>

                    {/* Barra de progreso */}
                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${s.cumplimiento}%`, backgroundColor: colorBarra }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}