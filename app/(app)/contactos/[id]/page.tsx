'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import ModalPausar from '@/components/ModalPausar';
import ModalRegistrarAccion from '@/components/ModalRegistrarAccion';
import ModalProyecto from '@/components/ModalProyecto';
import { MODO_DEMO } from '@/lib/modoDemo';
import { ACTIVIDADES, CONTACTOS, MANAGERS, MANAGERS_LISTA, PROYECTOS } from '@/lib/demoData';
import { USUARIO_DEMO } from '@/lib/demoData';

type Contacto = {
  id: string;
  nombre: string;
  empresa: string;
  area: string | null;
  cargo: string | null;
  email: string | null;
  telefono: string | null;
  cumple: string | null;
  prioridad: string;
  last_touch: string | null;
  next_touch: string | null;
  estado: string;
  pausa_hasta: string | null;
  pausa_motivo: string | null;
  oportunidad: string | null;
  notas: string | null;
  manager_id: string;
};

type Manager = {
  id: string;
  nombre: string;
  iniciales: string;
};

type Actividad = {
  id: string;
  tipo: string;
  resultado: string | null;
  proximos_pasos: string | null;
  fecha: string;
  autor_id: string;
};

type Proyecto = {
  id: string;
  nombre: string;
  monto: number | null;
  fecha_cierre: string;
};

// Calcular salud del contacto
function calcularSalud(c: Contacto) {
  if (c.estado === 'pausa') {
    return {
      titulo: `En pausa hasta ${formatearFecha(c.pausa_hasta)}`,
      bg: '#E2F4F8',
      border: '#9BDDE3',
      text: '#0A6C7E',
    };
  }
  if (!c.next_touch) {
    return { titulo: 'Sin fecha de próximo contacto', bg: '#F3F6FA', border: '#D6DEE8', text: '#2B3440' };
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const next = new Date(c.next_touch);
  const dias = Math.round((next.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (dias < -7) {
    return { titulo: `Rezagado hace ${Math.abs(dias)} días`, bg: '#EAF2FE', border: '#FF8CB0', text: '#A62222' };
  }
  if (dias <= 14) {
    return { titulo: `Próximo contacto en ${dias} días`, bg: '#FDF0E1', border: '#FAC775', text: '#9A5400' };
  }
  return { titulo: 'Al día', bg: '#E7F6EE', border: '#9BDCA6', text: '#1E6B3C' };
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatearMonto(n: number | null): string {
  if (!n) return '—';
  return '$' + (n / 1000).toFixed(0) + 'K';
}

export default function FichaContactoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [contacto, setContacto] = useState<Contacto | null>(null);
  const [owner, setOwner] = useState<Manager | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [autores, setAutores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [modalPausarAbierto, setModalPausarAbierto] = useState(false);
  const [modalAccionAbierto, setModalAccionAbierto] = useState(false);
  const [modalProyectoAbierto, setModalProyectoAbierto] = useState(false);
const [usuarioActual, setUsuarioActual] = useState<{ id: string; nombre: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      if (MODO_DEMO) {
        const c = CONTACTOS.find((x) => x.id === id);
        if (!c) {
          router.push('/contactos');
          return;
        }
        setUsuarioActual({ id: USUARIO_DEMO.id, nombre: USUARIO_DEMO.nombre });
        setContacto({ ...c, pausa_motivo: null } as unknown as Contacto);
        setOwner(MANAGERS[c.manager_id] ?? null);
        setActividades(
          ACTIVIDADES.filter((a) => a.contacto_id === id).map((a) => ({
            id: a.id,
            tipo: a.tipo,
            resultado: a.resultado ?? null,
            proximos_pasos: a.proximos_pasos ?? null,
            fecha: a.fecha,
            autor_id: a.autor_id,
          }))
        );
        setAutores(Object.fromEntries(MANAGERS_LISTA.map((m) => [m.id, m.nombre])));
        setProyectos(
          PROYECTOS.filter((p) => p.contacto_id === id).map((p) => ({
            id: p.id,
            nombre: p.nombre,
            monto: p.monto,
            fecha_cierre: p.fecha_cierre,
          }))
        );
        setLoading(false);
        return;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }
      const { data: usuarioData } = await supabase
        .from('managers')
        .select('id, nombre')
        .eq('email', authUser.email)
        .single();
      if (usuarioData) setUsuarioActual(usuarioData);
      // Cargar contacto
      const { data: contactoData, error } = await supabase
        .from('contactos')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !contactoData) {
        alert('Contacto no encontrado');
        router.push('/');
        return;
      }
      setContacto(contactoData);

      // Cargar el manager owner del contacto
      const { data: ownerData } = await supabase
        .from('managers')
        .select('id, nombre, iniciales')
        .eq('id', contactoData.manager_id)
        .single();
      setOwner(ownerData);

      // Cargar actividades
      const { data: actividadesData } = await supabase
        .from('actividades')
        .select('*')
        .eq('contacto_id', id)
        .order('fecha', { ascending: false });
      setActividades(actividadesData || []);

      // Cargar nombres de los autores de actividades
      if (actividadesData && actividadesData.length > 0) {
        const autorIds = [...new Set(actividadesData.map(a => a.autor_id))];
        const { data: autoresData } = await supabase
          .from('managers')
          .select('id, nombre')
          .in('id', autorIds);
        const mapAutores: Record<string, string> = {};
        autoresData?.forEach(a => { mapAutores[a.id] = a.nombre; });
        setAutores(mapAutores);
      }

      // Cargar proyectos
      const { data: proyectosData } = await supabase
        .from('proyectos')
        .select('id, nombre, monto, fecha_cierre')
        .eq('contacto_id', id)
        .order('fecha_cierre', { ascending: false });
      setProyectos(proyectosData || []);

      setLoading(false);
    }

    loadData();
  }, [id, router, supabase]);

    async function recargarContacto() {
      if (!contacto) return;
      const { data } = await supabase.from('contactos').select('*').eq('id', contacto.id).single();
      if (data) setContacto(data);
    
      // Recargar actividades
      const { data: actividadesData } = await supabase
        .from('actividades')
        .select('*')
        .eq('contacto_id', contacto.id)
        .order('fecha', { ascending: false });
      setActividades(actividadesData || []);
    
      // Recargar autores si hay actividades nuevas
      if (actividadesData && actividadesData.length > 0) {
        const autorIds = [...new Set(actividadesData.map(a => a.autor_id))];
        const { data: autoresData } = await supabase
          .from('managers')
          .select('id, nombre')
          .in('id', autorIds);
        const mapAutores: Record<string, string> = {};
        autoresData?.forEach(a => { mapAutores[a.id] = a.nombre; });
        setAutores(mapAutores);
      }
      // Recargar proyectos
      const { data: proyectosData } = await supabase
      .from('proyectos')
      .select('id, nombre, monto, fecha_cierre')
      .eq('contacto_id', contacto.id)
      .order('fecha_cierre', { ascending: false });
      setProyectos(proyectosData || []);
    }

  async function reactivarContacto() {
    if (!contacto) return;
    if (!confirm('¿Reactivar este contacto?')) return;

    const { error } = await supabase
      .from('contactos')
      .update({ estado: 'activo', pausa_hasta: null, pausa_motivo: null })
      .eq('id', contacto.id);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    await recargarContacto();
  }

  function copiarAlPortapapeles(texto: string, tipo: string) {
    navigator.clipboard.writeText(texto);
    setCopiado(tipo);
    setTimeout(() => setCopiado(null), 2000);
  }

  if (loading || !contacto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ceramica">
        <div className="text-tinta text-sm">Cargando...</div>
      </div>
    );
  }

  const salud = calcularSalud(contacto);
  const totalGanado = proyectos.reduce((sum, p) => sum + (p.monto || 0), 0);
  const esContactoOro = proyectos.length >= 2;

  return (
    <div className="min-h-screen bg-ceramica">
      {/* Topbar */}
      <header className="bg-white border-b border-ceramica-300 px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-medium" style={{ color: '#0A3A6B' }}>
          MINSAIT BUSINESS CONSULTING
        </h1>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        {/* Botón volver */}
        <button
          onClick={() => router.push('/')}
          className="text-xs text-tinta hover:text-mbc mb-4 flex items-center gap-1"
        >
          ← Volver al Radar
        </button>

        {/* Título */}
        <div className="mb-2 flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-medium text-mbc">{contacto.nombre}</h2>
          {esContactoOro && (
            <span className="text-xs px-2 py-1 rounded font-medium" style={{ backgroundColor: '#FDF0E1', color: '#9A5400' }}>
              ⭐ Contacto de oro
            </span>
          )}
        </div>
        <p className="text-sm text-tinta mb-6">
          {contacto.cargo && <>{contacto.cargo} · </>}
          {contacto.empresa}
        </p>

        {/* Banner de oportunidad */}
        {contacto.oportunidad && (
          <div className="rounded-md p-3 mb-6 text-sm" style={{ backgroundColor: '#E7F6EE', border: '1px solid #2E9E5B', color: '#1E6B3C' }}>
            <strong>Oportunidad activa:</strong> {contacto.oportunidad}
          </div>
        )}

        {/* Grid de 2 columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Columna izquierda */}
          <div className="space-y-4">
            {/* Card: Información */}
            <div className="bg-white border border-ceramica-300 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-mbc">Información del contacto</h3>
                <span className="text-xs px-2 py-1 rounded font-medium bg-ceramica text-tinta">
                  {contacto.prioridad}
                </span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-tinta">Empresa</span><span className="font-medium text-mbc">{contacto.empresa}</span></div>
                {contacto.area && <div className="flex justify-between"><span className="text-tinta">Área</span><span className="font-medium text-mbc">{contacto.area}</span></div>}
                {contacto.cargo && <div className="flex justify-between"><span className="text-tinta">Cargo</span><span className="font-medium text-mbc">{contacto.cargo}</span></div>}
                {contacto.cumple && <div className="flex justify-between"><span className="text-tinta">Cumpleaños</span><span className="font-medium text-mbc">{formatearFecha(contacto.cumple)}</span></div>}
                {owner && <div className="flex justify-between"><span className="text-tinta">Manager owner</span><span className="font-medium text-mbc">{owner.nombre}</span></div>}
                {proyectos.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-tinta">Proyectos cerrados</span>
                    <span className="font-medium text-mbc">{proyectos.length} · {formatearMonto(totalGanado)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card: Comunicación */}
            {(contacto.email || contacto.telefono) && (
              <div className="bg-white border border-ceramica-300 rounded-xl p-4">
                <h3 className="text-sm font-medium text-mbc mb-3">Comunicación directa</h3>
                {contacto.email && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-ceramica border border-ceramica-300 rounded-md mb-2 text-sm">
                    <span className="text-tinta">✉</span>
                    <span className="flex-1 text-mbc font-medium">{contacto.email}</span>
                    <button
                      onClick={() => copiarAlPortapapeles(contacto.email!, 'email')}
                      className="text-xs px-3 py-1 rounded font-medium transition-all"
                      style={{
                        backgroundColor: copiado === 'email' ? '#1E6B3C' : '#0A3A6B',
                        color: 'white',
                        minWidth: '80px',
                      }}
                    >
                      {copiado === 'email' ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                )}
                {contacto.telefono && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-ceramica border border-ceramica-300 rounded-md text-sm">
                    <span className="text-tinta">☎</span>
                    <span className="flex-1 text-mbc font-medium">{contacto.telefono}</span>
                    <button
                      onClick={() => copiarAlPortapapeles(contacto.telefono!, 'telefono')}
                      className="text-xs px-3 py-1 rounded font-medium transition-all"
                      style={{
                        backgroundColor: copiado === 'telefono' ? '#1E6B3C' : '#0A3A6B',
                        color: 'white',
                        minWidth: '80px',
                      }}
                    >
                      {copiado === 'telefono' ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Card: Notas */}
            {contacto.notas && (
              <div className="bg-white border border-ceramica-300 rounded-xl p-4">
                <h3 className="text-sm font-medium text-mbc mb-2">Notas personales</h3>
                <p className="text-sm text-tinta leading-relaxed">{contacto.notas}</p>
              </div>
            )}

            {/* Card: Salud */}
            <div className="rounded-md p-3" style={{ backgroundColor: salud.bg, border: `1px solid ${salud.border}` }}>
              <div className="text-sm font-medium mb-1" style={{ color: salud.text }}>{salud.titulo}</div>
              <div className="text-xs" style={{ color: salud.text }}>
                Último contacto: {formatearFecha(contacto.last_touch)}<br />
                Próximo: {formatearFecha(contacto.next_touch)}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 flex-wrap">
            <button
                onClick={() => setModalAccionAbierto(true)}
                className="flex-1 px-3 py-2 text-sm font-medium text-white rounded-md hover:opacity-90"
                style={{ backgroundColor: '#0A3A6B' }}
              >
                + Registrar acción
              </button>
              <button
                onClick={() => setModalProyectoAbierto(true)}
                className="px-3 py-2 text-sm font-medium text-white rounded-md hover:opacity-90"
                style={{ backgroundColor: '#2E9E5B' }}
              >
                + Proyecto ganado
              </button>
              {contacto.estado === 'pausa' ? (
                <button
                  onClick={reactivarContacto}
                  className="px-3 py-2 text-sm font-medium text-white rounded-md hover:opacity-90"
                  style={{ backgroundColor: '#2E9E5B' }}
                >
                  Reactivar
                </button>
              ) : (
                <button
                  onClick={() => setModalPausarAbierto(true)}
                  className="px-3 py-2 text-sm font-medium text-tinta border border-ceramica-300 rounded-md hover:bg-ceramica"
                >
                  Pausar
                </button>
              )}
            </div>
          </div>

          {/* Columna derecha */}
          <div className="space-y-4">
            {/* Card: Proyectos */}
            {proyectos.length > 0 && (
              <div className="bg-white border border-ceramica-300 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-mbc">Proyectos ganados</h3>
                  <span className="text-xs text-arena">{formatearMonto(totalGanado)}</span>
                </div>
                <div className="space-y-2">
                  {proyectos.map(p => (
                    <div key={p.id} className="border border-ceramica-300 rounded-md p-3">
                      <div className="flex justify-between items-start">
                        <div className="font-medium text-sm text-mbc">{p.nombre}</div>
                        <div className="font-medium text-sm" style={{ color: '#2E9E5B' }}>{formatearMonto(p.monto)}</div>
                      </div>
                      <div className="text-xs text-arena mt-1">Cerrado {formatearFecha(p.fecha_cierre)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card: Historial */}
            <div className="bg-white border border-ceramica-300 rounded-xl p-4">
              <h3 className="text-sm font-medium text-mbc mb-3">
                Historial de actividades <span className="text-arena font-normal">· {actividades.length}</span>
              </h3>
              {actividades.length === 0 ? (
                <p className="text-sm text-tinta py-4">Sin actividades registradas</p>
              ) : (
                <div className="space-y-2">
                  {actividades.map(a => (
                    <div key={a.id} className="border border-ceramica-300 rounded-md p-3 grid grid-cols-1 md:grid-cols-[80px_1fr_140px] gap-3 text-sm">
                      <div className="text-xs text-arena">{formatearFecha(a.fecha)}</div>
                      <div>
                        <div className="mb-1">
                          <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: '#E2F4F8', color: '#0A6C7E' }}>{a.tipo}</span>
                        </div>
                        <div className="text-xs text-tinta">{a.resultado}</div>
                        <div className="text-xs text-arena italic mt-1">— {autores[a.autor_id] || 'Sin autor'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-arena">Próximos pasos</div>
                        <div className="text-xs text-tinta">{a.proximos_pasos || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {modalPausarAbierto && contacto && (
        <ModalPausar
          contactoId={contacto.id}
          contactoNombre={contacto.nombre}
          onClose={() => setModalPausarAbierto(false)}
          onSaved={recargarContacto}
        />
      )}
      {modalAccionAbierto && contacto && usuarioActual && (
      <ModalRegistrarAccion
        contactoId={contacto.id}
        contactoNombre={contacto.nombre}
        contactoCargo={contacto.cargo}
        contactoEmpresa={contacto.empresa}
        contactoPrioridad={contacto.prioridad}
        contactoOportunidad={contacto.oportunidad}
        autorId={usuarioActual.id}
        autorNombre={usuarioActual.nombre}
        onClose={() => setModalAccionAbierto(false)}
        onSaved={recargarContacto}
      />
      )}
      {modalProyectoAbierto && contacto && usuarioActual && (
      <ModalProyecto
        contactoId={contacto.id}
        contactoNombre={contacto.nombre}
        contactoEmpresa={contacto.empresa}
        contactoOportunidad={contacto.oportunidad}
        managerId={usuarioActual.id}
        onClose={() => setModalProyectoAbierto(false)}
        onSaved={recargarContacto}
      />
    )}
    </div>
  );
}