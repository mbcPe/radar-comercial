'use client';

/**
 * Vista del Radar (presentacional). No habla con Supabase: recibe los datos ya
 * cargados. Así la misma vista sirve para el dashboard real y para /demo.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Avatar,
  BarChart,
  Card,
  Chip,
  Donut,
  EmptyState,
  ESTADO_META,
  KpiCard,
  PageHeader,
  Panel,
  Progress,
  StackedShare,
  type EstadoCartera,
} from '@/components/ui/kit';

export type Contacto = {
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
  /** Fecha de cumpleaños (columna `cumple`). El año no importa. */
  cumple?: string | null;
};

export type Actividad = {
  id: string;
  fecha: string;
  tipo: string;
  contacto_id: string;
  autor_id: string;
  resultado?: string | null;
  proximos_pasos?: string | null;
};

export type Proyecto = {
  id: string;
  nombre: string;
  monto: number | null;
  fecha_cierre: string;
  estado: string;
  manager_id: string;
};

export type Manager = { id: string; nombre: string; iniciales: string };

export function categoriaContacto(c: Contacto): EstadoCartera {
  if (c.estado === 'pausa') return 'pausa';
  if (!c.next_touch) return 'aldia';
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((new Date(c.next_touch).getTime() - hoy.getTime()) / 86400000);
  if (dias < -7) return 'rezagado';
  if (dias <= 14) return 'proximo';
  return 'aldia';
}

function diasHasta(fecha: string | null): number | null {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(fecha).getTime() - hoy.getTime()) / 86400000);
}

function textoVencimiento(fecha: string | null): string {
  const d = diasHasta(fecha);
  if (d === null) return 'sin fecha';
  if (d < 0) return `vencido hace ${Math.abs(d)} d`;
  if (d === 0) return 'vence hoy';
  if (d === 1) return 'vence mañana';
  return `en ${d} días`;
}

/** Días que faltan para el próximo cumpleaños, ignorando el año de nacimiento. */
function diasHastaCumple(cumple: string | null | undefined): number | null {
  if (!cumple) return null;
  const f = new Date(cumple);
  if (Number.isNaN(f.getTime())) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let prox = new Date(hoy.getFullYear(), f.getMonth(), f.getDate());
  if (prox < hoy) prox = new Date(hoy.getFullYear() + 1, f.getMonth(), f.getDate());
  return Math.round((prox.getTime() - hoy.getTime()) / 86400000);
}

function textoCumple(dias: number): string {
  if (dias === 0) return '¡es hoy!';
  if (dias === 1) return 'mañana';
  return `en ${dias} días`;
}

/** El nombre se tacha una vez registrado el contacto. */
function cxLinea(hecho: boolean): string {
  return hecho
    ? 'block truncate text-sm font-semibold text-tinta/40 line-through hover:text-acento'
    : 'block truncate text-sm font-semibold text-mbc hover:text-acento';
}

/**
 * Qué plantilla proponer para este contacto. La excusa del contacto es lo que
 * más frena al consultor, así que la elegimos por él con lo que ya sabemos.
 */
function situacionSugerida(c: Contacto): string {
  const cumple = diasHastaCumple(c.cumple);
  if (cumple !== null && cumple <= 7) return 'cumpleanos';
  if (c.oportunidad) return 'seguimiento-propuesta';
  if (categoriaContacto(c) === 'rezagado') return 'reactivacion';
  return 'sondeo-oportunidad';
}

/** Medios por los que se puede registrar un contacto (mismos que en Actividades). */
export const MEDIOS = [
  'Llamada',
  'Email',
  'WhatsApp',
  'Reunión virtual',
  'Reunión presencial',
  'Mensaje LinkedIn',
] as const;

function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
}

export default function DashboardView({
  contactos,
  actividades,
  actividadesPeriodo,
  proyectos,
  managers,
  filtros,
  onRegistrarAccion,
  onMarcarContactado,
}: {
  /** Cartera completa ya filtrada por el contenedor. */
  contactos: Contacto[];
  /** Actividades de los últimos 6 meses (para tendencias). */
  actividades: Actividad[];
  /** Actividades del período elegido en el filtro. */
  actividadesPeriodo: Actividad[];
  proyectos: Proyecto[];
  managers: Record<string, Manager>;
  filtros?: React.ReactNode;
  onRegistrarAccion?: (c: Contacto) => void;
  /** Marca el contacto como hecho: registra la actividad y recalcula next_touch. */
  onMarcarContactado?: (c: Contacto, medio: string) => Promise<void>;
}) {
  // Selector de medio abierto y contactos ya marcados en esta sesión
  const [medioAbierto, setMedioAbierto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [hechos, setHechos] = useState<string[]>([]);

  async function confirmarMedio(c: Contacto, medio: string) {
    if (!onMarcarContactado) return;
    setGuardando(c.id);
    try {
      await onMarcarContactado(c, medio);
      setHechos((prev) => [...prev, c.id]);
    } finally {
      setGuardando(null);
      setMedioAbierto(null);
    }
  }

  /* ---- Métricas ---- */
  const counts: Record<EstadoCartera, number> = {
    rezagado: 0,
    proximo: 0,
    aldia: 0,
    pausa: 0,
  };
  contactos.forEach((c) => {
    counts[categoriaContacto(c)]++;
  });

  const activos = contactos.filter((c) => c.estado === 'activo').length;
  const empresas = new Set(contactos.map((c) => c.empresa)).size;
  const cumplimiento = activos > 0 ? Math.round((counts.aldia / activos) * 100) : 0;
  const conOportunidad = contactos.filter((c) => c.oportunidad).length;

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const actividadesMes = actividades.filter((a) => new Date(a.fecha) >= inicioMes).length;

  // Serie real de los últimos 6 meses (nada simulado)
  const meses: Array<{ label: string; valor: number }> = [];
  const hoy = new Date();
  for (let i = 5; i >= 0; i--) {
    const f = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const valor = actividades.filter((a) => {
      const fa = new Date(a.fecha);
      return fa.getFullYear() === f.getFullYear() && fa.getMonth() === f.getMonth();
    }).length;
    meses.push({ label: f.toLocaleDateString('es', { month: 'short' }), valor });
  }
  const serieActividad = meses.map((m) => m.valor);

  // Mix de canales del período
  const porTipo = new Map<string, number>();
  actividadesPeriodo.forEach((a) => porTipo.set(a.tipo, (porTipo.get(a.tipo) ?? 0) + 1));
  const canales = [...porTipo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCanal = Math.max(...canales.map(([, v]) => v), 1);
  const COLORES_CANAL = ['#0A3A6B', '#1F6FEB', '#E58413', '#0D8FA6', '#6B5BD2', '#2E9E5B'];

  // Cobertura por consultor
  const porManager = Object.values(managers)
    .map((m) => {
      const suyos = contactos.filter((c) => c.manager_id === m.id);
      const alDia = suyos.filter((c) => categoriaContacto(c) === 'aldia').length;
      const rezagados = suyos.filter((c) => categoriaContacto(c) === 'rezagado').length;
      const activosM = suyos.filter((c) => c.estado !== 'pausa').length;
      return {
        m,
        total: suyos.length,
        rezagados,
        pct: activosM > 0 ? Math.round((alDia / activosM) * 100) : 0,
      };
    })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.pct - a.pct);

  // Agenda de la semana: todo lo vencido más lo que vence hasta el domingo
  const diasHastaDomingo = 7 - (hoy.getDay() === 0 ? 7 : hoy.getDay());
  const agendaSemana = contactos
    .filter((c) => {
      if (c.estado === 'pausa') return false;
      const d = diasHasta(c.next_touch);
      return d !== null && d <= diasHastaDomingo;
    })
    .sort((a, b) => (diasHasta(a.next_touch) ?? 9999) - (diasHasta(b.next_touch) ?? 9999));

  const pendientesSemana = agendaSemana.filter((c) => !hechos.includes(c.id)).length;

  // Cumpleaños dentro de los próximos 30 días
  const cumpleanieros = contactos
    .map((c) => ({ c, dias: diasHastaCumple(c.cumple) }))
    .filter((x): x is { c: Contacto; dias: number } => x.dias !== null && x.dias <= 30)
    .sort((a, b) => a.dias - b.dias);

  const cerrado = proyectos.reduce((s, p) => s + (p.monto || 0), 0);

  const titular =
    counts.rezagado > 0
      ? `${counts.rezagado} ${counts.rezagado === 1 ? 'contacto está' : 'contactos están'} rezagados y necesitan acción esta semana`
      : counts.proximo > 0
        ? `Cartera sin rezagos: ${counts.proximo} contactos entran en ventana los próximos 14 días`
        : 'Toda la cartera está al día';

  return (
    <div className="mx-auto max-w-[1180px] p-6">
      <PageHeader
        kicker={`Radar comercial · ${hoy.toLocaleDateString('es', { month: 'long', year: 'numeric' })}`}
        titulo={titular}
        bajada={`${contactos.length} contactos en ${empresas} empresas · ${conOportunidad} con oportunidad abierta`}
      />

      {/* ---- KPIs ---- */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Contactos activos"
          valor={activos}
          hint={`${contactos.length - activos} en pausa`}
          acento="#0A3A6B"
        />
        <KpiCard label="Empresas" valor={empresas} hint="cuentas cubiertas" acento="#1A3B47" />
        <KpiCard
          label="Cumplimiento"
          valor={cumplimiento}
          unidad="%"
          hint="contactos al día sobre activos"
          acento={cumplimiento >= 80 ? '#2E9E5B' : cumplimiento >= 60 ? '#E58413' : '#1F6FEB'}
        />
        <KpiCard
          label="Actividades del mes"
          valor={actividadesMes}
          hint="tendencia 6 meses"
          acento="#1F6FEB"
          serie={serieActividad}
        />
      </div>

      {filtros && <div className="mb-4">{filtros}</div>}

      {/* ---- Semáforo de cartera ---- */}
      <Panel
        kicker="Estado de la cartera"
        titulo="Semáforo de contactos"
        derecha={<span className="text-xs text-white/70">{contactos.length} contactos</span>}
        className="mb-4"
      >
        <StackedShare
          segmentos={(Object.keys(ESTADO_META) as EstadoCartera[]).map((k) => ({
            label: ESTADO_META[k].label,
            valor: counts[k],
            color: ESTADO_META[k].color,
          }))}
        />

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {(Object.keys(ESTADO_META) as EstadoCartera[]).map((k) => {
            const meta = ESTADO_META[k];
            const pct = contactos.length ? Math.round((counts[k] / contactos.length) * 100) : 0;
            return (
              <Link
                key={k}
                href={`/contactos?estado=${k}`}
                className="group flex items-center gap-3 rounded-xl p-4 transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: meta.soft }}
              >
                <Donut porcentaje={pct} color={meta.color} size={64} grosor={8} centro={`${pct}%`} />
                <div className="min-w-0">
                  {/* texto en el tono oscuro: el vivo no contrasta sobre su propio tinte */}
                  <div className="tnum text-2xl font-semibold" style={{ color: meta.fg }}>
                    {counts[k]}
                  </div>
                  <div className="text-xs font-semibold" style={{ color: meta.fg }}>
                    {meta.label}
                  </div>
                  <div className="text-[11px] text-tinta/75">{meta.pie}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </Panel>

      {/* ---- Agenda de la semana: marcar contacto hecho ---- */}
      <Panel
        kicker="A quién me toca contactar"
        titulo="Esta semana"
        derecha={
          <span className="text-xs text-white/70">
            {pendientesSemana} pendiente{pendientesSemana === 1 ? '' : 's'}
          </span>
        }
        className="mb-4"
      >
        {agendaSemana.length === 0 ? (
          <EmptyState
            titulo="Semana limpia"
            detalle="Ningún contacto vence esta semana ni quedó rezagado."
          />
        ) : (
          <ul className="divide-y divide-ceramica">
            {agendaSemana.map((c) => {
              const cat = categoriaContacto(c);
              const meta = ESTADO_META[cat];
              const mgr = managers[c.manager_id];
              const hecho = hechos.includes(c.id);
              const abierto = medioAbierto === c.id;
              const diasCumple = diasHastaCumple(c.cumple);

              return (
                <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Check: registra el contacto pidiendo el medio */}
                    <button
                      onClick={() => setMedioAbierto(abierto ? null : c.id)}
                      disabled={hecho || !onMarcarContactado || guardando === c.id}
                      title={hecho ? 'Contacto registrado' : 'Marcar como contactado'}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:cursor-default"
                      style={{
                        borderColor: hecho ? '#2E9E5B' : abierto ? '#1F6FEB' : meta.color,
                        backgroundColor: hecho ? '#2E9E5B' : 'transparent',
                      }}
                    >
                      {(hecho || guardando === c.id) && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                          <path d="M4 12l5 5L20 6" />
                        </svg>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/contactos/${c.id}`}
                        className={cxLinea(hecho)}
                      >
                        {c.nombre}
                        <span className="font-normal text-tinta/60"> · {c.empresa}</span>
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Chip color={hecho ? 'aldia' : cat}>
                          {hecho ? 'contactado hoy' : textoVencimiento(c.next_touch)}
                        </Chip>
                        <Chip color="neutral">{c.prioridad}</Chip>
                        {diasCumple !== null && diasCumple <= 7 && (
                          <Chip color="acento">🎂 cumple {textoCumple(diasCumple)}</Chip>
                        )}
                        {c.oportunidad && <Chip color="verde">{c.oportunidad}</Chip>}
                      </div>
                    </div>

                    {mgr && <Avatar iniciales={mgr.iniciales} nombre={mgr.nombre} size={28} />}
                    {!hecho && (
                      <Link
                        href={`/plantillas?contacto=${c.id}&situacion=${situacionSugerida(c)}`}
                        className="btn-ghost px-3 py-2 text-xs"
                        title="Abrir la plantilla que corresponde a este contacto"
                      >
                        ✍ Redactar
                      </Link>
                    )}
                    {onRegistrarAccion && !hecho && (
                      <button
                        onClick={() => onRegistrarAccion(c)}
                        className="btn-ghost px-3 py-2 text-xs"
                        title="Registrar con resultado y próximos pasos"
                      >
                        Registrar detalle
                      </button>
                    )}
                  </div>

                  {/* Paso 2 del check: por qué medio lo contacté */}
                  {abierto && !hecho && (
                    <div className="mt-3 rounded-xl bg-acento-100 p-3">
                      <div className="kicker mb-2">¿Por qué medio lo contactaste?</div>
                      <div className="flex flex-wrap gap-2">
                        {MEDIOS.map((m) => (
                          <button
                            key={m}
                            onClick={() => confirmarMedio(c, m)}
                            disabled={guardando === c.id}
                            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-mbc transition-colors hover:bg-acento hover:text-white disabled:opacity-50"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] text-tinta/60">
                        Se registra la actividad con fecha de hoy y se recalcula el próximo contacto
                        según la prioridad {c.prioridad}.
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* ---- Cumpleaños ---- */}
      {cumpleanieros.length > 0 && (
        <Panel
          kicker="Excusa perfecta para llamar"
          titulo="Cumpleaños próximos"
          derecha={<span className="text-xs text-white/70">próximos 30 días</span>}
          className="mb-4"
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {cumpleanieros.map(({ c, dias }) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2"
                style={{ backgroundColor: dias <= 7 ? '#EAF2FE' : '#F3F6FA' }}
              >
                <span className="text-lg">🎂</span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/contactos/${c.id}`}
                    className="block truncate text-sm font-semibold text-mbc hover:text-acento"
                  >
                    {c.nombre}
                  </Link>
                  <div className="truncate text-xs text-tinta/60">{c.empresa}</div>
                </div>
                <span
                  className="chip"
                  style={{
                    backgroundColor: dias <= 7 ? '#1F6FEB' : '#fff',
                    color: dias <= 7 ? '#fff' : '#0A3A6B',
                  }}
                >
                  {textoCumple(dias)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ---- Actividad y canales ---- */}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Panel kicker="Ritmo comercial" titulo="Actividades por mes">
          <BarChart
            datos={meses.map((m) => ({ ...m, color: '#0A3A6B' }))}
            alto={190}
          />
          <p className="mt-3 text-xs text-tinta/60">
            Datos reales de la tabla <code>actividades</code>, últimos 6 meses.
          </p>
        </Panel>

        <Panel kicker="Cómo llegamos" titulo="Mix de canales del período">
          {canales.length === 0 ? (
            <EmptyState titulo="Sin actividades en el período" />
          ) : (
            <ul className="space-y-3">
              {canales.map(([tipo, n], i) => (
                <li key={tipo}>
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="font-medium text-mbc">{tipo}</span>
                    <span className="tnum text-tinta/60">{n}</span>
                  </div>
                  <Progress
                    porcentaje={(n / maxCanal) * 100}
                    color={COLORES_CANAL[i % COLORES_CANAL.length]}
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ---- Equipo ---- */}
      {porManager.length > 0 && (
        <Panel kicker="Equipo" titulo="Cumplimiento por consultor" className="mb-4">
          <ul className="space-y-3">
            {porManager.map(({ m, total, rezagados, pct }) => (
              <li key={m.id} className="flex items-center gap-3">
                <Avatar iniciales={m.iniciales} nombre={m.nombre} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-mbc">{m.nombre}</span>
                    <span className="text-xs text-tinta/60">
                      {total} contactos ·{' '}
                      <span style={{ color: rezagados ? '#1F6FEB' : '#2E9E5B' }}>
                        {rezagados} rezagados
                      </span>{' '}
                      · <span className="tnum font-semibold text-mbc">{pct}%</span> al día
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <Progress
                      porcentaje={pct}
                      color={pct >= 80 ? '#2E9E5B' : pct >= 60 ? '#E58413' : '#1F6FEB'}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ---- Cierre del mes ---- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card className="p-4">
          <div className="kicker">Actividades</div>
          <div className="tnum mt-2 text-3xl font-semibold text-mbc">
            {actividadesPeriodo.length}
          </div>
          <div className="mt-1 text-xs text-tinta/60">en el período filtrado</div>
        </Card>
        <Card className="p-4">
          <div className="kicker">Proyectos ganados</div>
          <div className="tnum mt-2 text-3xl font-semibold text-mbc">{proyectos.length}</div>
          <div className="mt-1 text-xs text-tinta/60">cerrados este mes</div>
        </Card>
        <Card className="col-span-2 p-4 md:col-span-1">
          <div className="kicker">Monto cerrado</div>
          <div className="tnum mt-2 text-3xl font-semibold" style={{ color: '#2E9E5B' }}>
            {money(cerrado)}
          </div>
          <div className="mt-1 text-xs text-tinta/60">revenue del mes</div>
        </Card>
      </div>

      {/* Banda de cierre: el "so what" de la lámina */}
      <div className="notch mt-4 bg-mbc px-6 py-4 text-center text-sm text-white">
        {cumplimiento}% de la cartera activa está al día ·{' '}
        <span className="font-semibold text-acento-200">
          {counts.rezagado} contactos exigen acción inmediata
        </span>
      </div>
    </div>
  );
}
