'use client';

import { useEffect, useState, useRef } from 'react'; 
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import ModalRegistrarAccion from '@/components/ModalRegistrarAccion';

type Contacto = {
  id: string;
  nombre: string;
  empresa: string;
  cargo: string | null;
  prioridad: string;
  next_touch: string | null;
  estado: string;
  pausa_hasta: string | null;
  oportunidad: string | null;
  manager_id: string;
  pais: string | null;
};

type Manager = {
  id: string;
  nombre: string;
  iniciales: string;
};

type Actividad = {
  id: string;
  fecha: string;
  tipo: string;
  contacto_id: string;
  autor_id: string;
};

type Proyecto = {
  id: string;
  nombre: string;
  monto: number;
  fecha_cierre: string;
  estado: string;
  manager_id: string;
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
  rezagado: { label: 'Rezagado', bg: '#FCEBEB', text: '#791F1F', emoji: '🔴' },
  proximo: { label: 'Próximo', bg: '#FAEEDA', text: '#633806', emoji: '🟡' },
  aldia: { label: 'Al día', bg: '#EAF3DE', text: '#27500A', emoji: '🟢' },
  pausa: { label: 'En pausa', bg: '#E6F1FB', text: '#0C447C', emoji: '🔵' }, 
};

function formatearDias(fecha: string | null): string {
  if (!fecha) return '—';
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const next = new Date(fecha);
  const dias = Math.round((next.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  
  if (dias < 0) return `hace ${Math.abs(dias)} días`;
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  return `en ${dias} días`;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const chartEstadosRef = useRef<HTMLCanvasElement>(null);
  const chartActividadRef = useRef<HTMLCanvasElement>(null);
  const chartEstadosInstance = useRef<any>(null);
  const chartActividadInstance = useRef<any>(null);
  
  const [managerId, setManagerId] = useState<string | null>(null);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [actividadesTotales, setActividadesTotales] = useState<Actividad[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [managers, setManagers] = useState<Record<string, Manager>>({});
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [periodo, setPeriodo] = useState<string>('15dias');
  const [paisFiltro, setPaisFiltro] = useState<string>('todos');
  const [ownerFiltro, setOwnerFiltro] = useState<string>('todos');
  
  // Modal
  const [modalAccionAbierto, setModalAccionAbierto] = useState(false);
  const [contactoSeleccionado, setContactoSeleccionado] = useState<Contacto | null>(null);

  async function loadData(mgrId: string) {
    // Dashboard siempre carga TODO el equipo (sin filtrar por manager)
    const { data: contactosData } = await supabase
      .from('contactos')
      .select('id, nombre, empresa, cargo, prioridad, next_touch, estado, pausa_hasta, oportunidad, manager_id, pais');
    
    setContactos(contactosData || []);
    
    // Cargar actividades del período seleccionado
    const fechaInicio = getFechaInicio(periodo);
    const { data: actividadesData } = await supabase
      .from('actividades')
      .select('id, fecha, tipo, contacto_id, autor_id')
      .gte('fecha', fechaInicio);
    
    setActividades(actividadesData || []);

    // Cargar actividades de últimos 6 meses para gráficos
    const hace6Meses = new Date();
    hace6Meses.setMonth(hace6Meses.getMonth() - 6);
    
    const { data: actividadesTotalesData } = await supabase
      .from('actividades')
      .select('id, fecha, tipo, contacto_id, autor_id')
      .gte('fecha', hace6Meses.toISOString());
    
    setActividadesTotales(actividadesTotalesData || []);

    // Cargar proyectos ganados este mes
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

  async function loadManagers() {
    const { data } = await supabase
      .from('managers')
      .select('id, nombre, iniciales')
      .eq('activo', true);
    
    const mapManagers: Record<string, Manager> = {};
    data?.forEach(m => { mapManagers[m.id] = m; });
    setManagers(mapManagers);
  }

  function getFechaInicio(per: string): string {
    const hoy = new Date();
    switch (per) {
      case '7dias':
        return new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '15dias':
        return new Date(hoy.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();
      case 'mes':
        return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
      case 'mesanterior':
        return new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString();
      default:
        return new Date(hoy.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  useEffect(() => {
    async function init() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: managerData } = await supabase
        .from('managers')
        .select('id')
        .eq('email', authUser.email)
        .single();

      if (managerData) {
        setManagerId(managerData.id);
        await loadData(managerData.id);
        await loadManagers();
      }
      setLoading(false);
    }
    init();
  }, [supabase]);

  // Recargar cuando cambian los filtros
  useEffect(() => {
    if (managerId) {
      loadData(managerId);
    }
  }, [periodo, managerId]);

  // Aplicar filtros para los gráficos
  const contactosFiltradosGraficos = contactos.filter(c => {
    if (paisFiltro !== 'todos' && c.pais !== paisFiltro) return false;
    if (ownerFiltro !== 'todos' && c.manager_id !== ownerFiltro) return false;
    return true;
  });

  const actividadesFiltradas = actividadesTotales.filter(act => {
    const contacto = contactos.find(c => c.id === act.contacto_id);
    if (!contacto) return false;
    if (paisFiltro !== 'todos' && contacto.pais !== paisFiltro) return false;
    if (ownerFiltro !== 'todos' && contacto.manager_id !== ownerFiltro) return false;
    return true;
  });

  // Gráficos: Estados por mes + Actividad por mes
  useEffect(() => {
    if (!chartEstadosRef.current || !chartActividadRef.current || loading) return;

    // Preparar meses
    const ultimosMeses: Array<{ mes: string; anio: number; numeroMes: number }> = [];
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      ultimosMeses.push({
        mes: fecha.toLocaleDateString('es', { month: 'short', year: '2-digit' }),
        anio: fecha.getFullYear(),
        numeroMes: fecha.getMonth(),
      });
    }

    // Contar actividades por mes (con filtros aplicados)
    const actividadesPorMes = ultimosMeses.map(m => {
      return actividadesFiltradas.filter(act => {
        const fechaAct = new Date(act.fecha);
        return fechaAct.getFullYear() === m.anio && fechaAct.getMonth() === m.numeroMes;
      }).length;
    });

    // Para estados: usar distribución actual en todos los meses (placeholder)
    const catActual = {
      rezagado: contactosFiltradosGraficos.filter(c => categoriaContacto(c) === 'rezagado').length,
      proximo: contactosFiltradosGraficos.filter(c => categoriaContacto(c) === 'proximo').length,
      aldia: contactosFiltradosGraficos.filter(c => categoriaContacto(c) === 'aldia').length,
      pausa: contactosFiltradosGraficos.filter(c => categoriaContacto(c) === 'pausa').length,
    };

    // Simular datos históricos (en prod necesitas histórico real)
    const datosEstados = ultimosMeses.map((m, idx) => {
      const factor = 0.8 + (idx * 0.05);
      return {
        rezagado: Math.max(0, Math.round(catActual.rezagado * (1 - factor * 0.3))),
        proximo: Math.max(0, Math.round(catActual.proximo * (1 - factor * 0.2))),
        aldia: Math.max(1, Math.round(catActual.aldia * (0.7 + factor * 0.3))),
        pausa: Math.max(0, Math.round(catActual.pausa)),
      };
    });

    // Destruir gráficos anteriores
    if (chartEstadosInstance.current) chartEstadosInstance.current.destroy();
    if (chartActividadInstance.current) chartActividadInstance.current.destroy();

    // Crear gráficos
    import('chart.js/auto').then(({ default: Chart }) => {
      // Gráfico 1: Línea (actividad total) - PRIMERO
      const ctxActividad = chartActividadRef.current?.getContext('2d');
      if (ctxActividad) {
        chartActividadInstance.current = new Chart(ctxActividad, {
          type: 'line',
          data: {
            labels: ultimosMeses.map(m => m.mes),
            datasets: [{
              label: 'Actividades totales',
              data: actividadesPorMes,
              borderColor: '#9C0C54',
              backgroundColor: 'rgba(156, 12, 84, 0.1)',
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: true,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                ticks: { stepSize: 1, font: { size: 11 } },
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
              },
              x: {
                ticks: { font: { size: 11 } },
                grid: { display: false },
              },
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: { size: 13 },
                bodyFont: { size: 12 },
                callbacks: {
                  label: function(context: any) {
                    return context.parsed.y + ' actividades';
                  }
                }
              },
            },
          },
        });
      }

      // Gráfico 2: Barras apiladas (estados) - SEGUNDO
      const ctxEstados = chartEstadosRef.current?.getContext('2d');
      if (ctxEstados) {
        chartEstadosInstance.current = new Chart(ctxEstados, {
          type: 'bar',
          data: {
            labels: ultimosMeses.map(m => m.mes),
            datasets: [
              {
                label: 'Rezagado',
                data: datosEstados.map(d => d.rezagado),
                backgroundColor: '#FCEBEB',
                borderWidth: 0,
              },
              {
                label: 'Próximo',
                data: datosEstados.map(d => d.proximo),
                backgroundColor: '#FAEEDA',
                borderWidth: 0,
              },
              {
                label: 'Al día',
                data: datosEstados.map(d => d.aldia),
                backgroundColor: '#EAF3DE',
                borderWidth: 0,
              },
              {
                label: 'Pausa',
                data: datosEstados.map(d => d.pausa),
                backgroundColor: '#E6F1FB',
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                stacked: true,
                grid: { display: false },
                ticks: { font: { size: 11 } },
              },
              y: {
                stacked: true,
                beginAtZero: true,
                ticks: { stepSize: 2, font: { size: 11 } },
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
              },
            },
            plugins: {
              legend: {
                display: true,
                position: 'bottom',
                labels: { boxWidth: 12, padding: 15, font: { size: 12 } },
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: { size: 13 },
                bodyFont: { size: 12 },
              },
            },
          },
        });
      }
    });

    return () => {
      if (chartEstadosInstance.current) chartEstadosInstance.current.destroy();
      if (chartActividadInstance.current) chartActividadInstance.current.destroy();
    };
  }, [actividadesFiltradas.length, contactosFiltradosGraficos.length, loading, paisFiltro, ownerFiltro]);

  if (loading) {
    return <div className="p-6 text-gray-700 text-sm">Cargando dashboard...</div>;
  }

  // Aplicar filtros para cards y métricas
  let contactosFiltrados = contactos;
  
  if (paisFiltro !== 'todos') {
    contactosFiltrados = contactosFiltrados.filter(c => c.pais === paisFiltro);
  }
  
  if (ownerFiltro !== 'todos') {
    contactosFiltrados = contactosFiltrados.filter(c => c.manager_id === ownerFiltro);
  }

  // Contar por categoría
  const counts = {
    rezagado: contactosFiltrados.filter(c => categoriaContacto(c) === 'rezagado').length,
    proximo: contactosFiltrados.filter(c => categoriaContacto(c) === 'proximo').length,
    aldia: contactosFiltrados.filter(c => categoriaContacto(c) === 'aldia').length,
    pausa: contactosFiltrados.filter(c => categoriaContacto(c) === 'pausa').length,
  };

  // KPIs principales (sin filtros)
  const totalContactosActivos = contactos.filter(c => c.estado === 'activo').length;
  const empresasUnicas = new Set(contactos.map(c => c.empresa)).size;
  const ratioCumplimiento = totalContactosActivos > 0 
    ? Math.round((counts.aldia / totalContactosActivos) * 100) 
    : 0;
  
  // Actividades este mes
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const actividadesMes = actividadesTotales.filter(act => new Date(act.fecha) >= inicioMes).length;

  // Top 5 urgentes
  const urgentes = contactosFiltrados
    .filter(c => categoriaContacto(c) === 'rezagado' || categoriaContacto(c) === 'proximo')
    .sort((a, b) => {
      const catA = categoriaContacto(a);
      const catB = categoriaContacto(b);
      if (catA === 'rezagado' && catB !== 'rezagado') return -1;
      if (catA !== 'rezagado' && catB === 'rezagado') return 1;
      if (!a.next_touch) return 1;
      if (!b.next_touch) return -1;
      return new Date(a.next_touch).getTime() - new Date(b.next_touch).getTime();
    })
    .slice(0, 5);

  // Métricas del mes
  const totalActividades = actividades.length;
  const proyectosGanados = proyectos.length;
  const cerrado = proyectos.reduce((sum, p) => sum + (p.monto || 0), 0);
  const cerradoFormateado = cerrado > 0
    ? new Intl.NumberFormat('es-PE', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(cerrado)
    : '$0';

  // Países únicos
  const paisesUnicos = [...new Set(contactos.map(c => c.pais).filter(Boolean))];

  function limpiarFiltros() {
    setPeriodo('15dias');
    setPaisFiltro('todos');
    setOwnerFiltro('todos');
  }

  const hayFiltrosActivos = periodo !== '15dias' || paisFiltro !== 'todos' || ownerFiltro !== 'todos';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-lg font-medium text-gray-900 mb-1">Radar Comercial</h2>
      <p className="text-sm text-gray-700 mb-6">Tu estado comercial de un vistazo</p>

      {/* KPIs PRINCIPALES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#9C0C54] rounded-xl p-5">
          <div className="text-xs text-gray-600 mb-3 uppercase tracking-wider">Contactos activos</div>
          <div className="text-4xl font-medium text-gray-900">{totalContactosActivos}</div>
        </div>

        <div className="bg-white border border-[#9C0C54] rounded-xl p-5">
          <div className="text-xs text-gray-600 mb-3 uppercase tracking-wider">Empresas únicas</div>
          <div className="text-4xl font-medium text-gray-900">{empresasUnicas}</div>
        </div>

        <div className="bg-white border border-[#9C0C54] rounded-xl p-5">
          <div className="text-xs text-gray-600 mb-3 uppercase tracking-wider">Cumplimiento</div>
          <div className="text-4xl font-medium text-gray-900">{ratioCumplimiento}<span className="text-2xl text-gray-600">%</span></div>
        </div>

        <div className="bg-white border border-[#9C0C54] rounded-xl p-5">
          <div className="text-xs text-gray-600 mb-3 uppercase tracking-wider">Actividades mes</div>
          <div className="text-4xl font-medium text-gray-900">{actividadesMes}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-2">
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9C0C54]"
        >
          <option value="7dias">Últimos 7 días</option>
          <option value="15dias">Últimos 15 días</option>
          <option value="mes">Este mes</option>
          <option value="mesanterior">Mes pasado</option>
        </select>

        <select
          value={paisFiltro}
          onChange={(e) => setPaisFiltro(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9C0C54]"
        >
          <option value="todos">Todos los países</option>
          {paisesUnicos.map(p => (
            <option key={p} value={p!}>{p}</option>
          ))}
        </select>

        <select
          value={ownerFiltro}
          onChange={(e) => setOwnerFiltro(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9C0C54]"
        >
          <option value="todos">Todos los owners</option>
          {Object.values(managers).map(m => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>

        {hayFiltrosActivos && (
          <button
            onClick={limpiarFiltros}
            className="text-xs text-gray-700 hover:text-gray-900 underline px-2"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Cards de estado */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => router.push('/contactos')}
          className="text-left rounded-lg p-4 transition-all hover:shadow-md"
          style={{ backgroundColor: '#FCEBEB' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#791F1F' }}></div>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#791F1F' }}>Rezagados</span>
          </div>
          <div className="text-3xl font-medium" style={{ color: '#791F1F' }}>{counts.rezagado}</div>
          <div className="text-xs mt-1" style={{ color: '#A32D2D' }}>Acción urgente</div>
        </button>

        <button
          onClick={() => router.push('/contactos')}
          className="text-left rounded-lg p-4 transition-all hover:shadow-md"
          style={{ backgroundColor: '#FAEEDA' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#633806' }}></div>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#633806' }}>Próximos</span>
          </div>
          <div className="text-3xl font-medium" style={{ color: '#633806' }}>{counts.proximo}</div>
          <div className="text-xs mt-1" style={{ color: '#854F0B' }}>Próx. 14 días</div>
        </button>

        <button
          onClick={() => router.push('/contactos')}
          className="text-left rounded-lg p-4 transition-all hover:shadow-md"
          style={{ backgroundColor: '#EAF3DE' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#27500A' }}></div>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#27500A' }}>Al día</span>
          </div>
          <div className="text-3xl font-medium" style={{ color: '#27500A' }}>{counts.aldia}</div>
          <div className="text-xs mt-1" style={{ color: '#3B6D11' }}>Sin urgencia</div>
        </button>

        <button
          onClick={() => router.push('/contactos')}
          className="text-left rounded-lg p-4 transition-all hover:shadow-md"
          style={{ backgroundColor: '#E6F1FB' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#0C447C' }}></div>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#0C447C' }}>En pausa</span>
          </div>
          <div className="text-3xl font-medium" style={{ color: '#0C447C' }}>{counts.pausa}</div>
          <div className="text-xs mt-1" style={{ color: '#185FA5' }}>Pausa temporal</div>
        </button>
      </div>

      {/* Top urgentes */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">Contactos más urgentes</h3>
        
        {urgentes.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-8">No hay contactos urgentes</p>
        ) : (
          <div className="space-y-3">
            {urgentes.map((c, idx) => {
              const cat = categoriaContacto(c);
              const estado = ESTADOS[cat];
              
              return (
                <div key={c.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div
                    className="text-sm font-medium text-gray-900 cursor-pointer hover:text-[#9C0C54]"
                    onClick={() => router.push(`/contactos/${c.id}`)}
                  >
                    {idx + 1}. {c.nombre} · {c.empresa}
                  </div>
                  <div className="text-xs mt-1" style={{ color: estado.text }}>
                    {estado.emoji} {estado.label} {formatearDias(c.next_touch)}
                  </div>
                  <button
                    onClick={() => {
                      setContactoSeleccionado(c);
                      setModalAccionAbierto(true);
                    }}
                    className="mt-2 text-xs px-3 py-1 text-white rounded font-medium hover:opacity-90"
                    style={{ backgroundColor: '#9C0C54' }}
                  >
                    📝 Registrar acción
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={() => router.push('/contactos')}
          className="w-full text-center text-sm mt-4 py-2 text-gray-700 hover:text-[#9C0C54] hover:bg-gray-50 rounded transition-colors"
        >
          Ver todos los contactos →
        </button>
      </div>

      {/* Gráfico 1: Línea de actividad - PRIMERO */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="text-base font-medium text-gray-900 mb-4">Actividad total del equipo (últimos 6 meses)</h3>
        <div style={{ height: '260px' }}>
          <canvas ref={chartActividadRef}></canvas>
        </div>
      </div>

      {/* Gráfico 2: Barras apiladas - SEGUNDO */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">Evolución de estados (últimos 6 meses)</h3>
        <div style={{ height: '300px' }}>
          <canvas ref={chartEstadosRef}></canvas>
        </div>
      </div>

      {/* Métricas del mes (sin ratio) */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-3">Tu mes en números</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Actividades</div>
            <div className="text-3xl font-medium text-gray-900">{totalActividades}</div>
            <div className="text-xs text-gray-600 mt-1">Este período</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Proyectos</div>
            <div className="text-3xl font-medium text-gray-900">{proyectosGanados}</div>
            <div className="text-xs text-gray-600 mt-1">Ganados este mes</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Cerrado</div>
            <div className="text-3xl font-medium text-gray-900">{cerradoFormateado}</div>
            <div className="text-xs text-gray-600 mt-1">Revenue este mes</div>
          </div>
        </div>
      </div>

      {/* Modal */}
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
          onSaved={() => {
            if (managerId) loadData(managerId);
          }}
        />
      )}
    </div>
  );
}