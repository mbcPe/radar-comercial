'use client';

/**
 * Línea de tiempo compartida de interacciones.
 * Agrupa por contacto o por cliente y hace visible algo que hoy nadie ve:
 * cuándo varios consultores están tocando a la misma persona o cuenta.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Actividad, Contacto, Manager } from '@/components/dashboard/DashboardView';
import { Avatar, Card, Chip, EmptyState, PageHeader, cx } from '@/components/ui/kit';

/* ---------- Tipos de interacción: ícono y color ---------- */

const ICONOS: Record<string, React.ReactNode> = {
  llamada: (
    <path d="M4 4h3l1.5 4L7 9.5a11 11 0 005.5 5.5L14 13l4 1.5V18a2 2 0 01-2.2 2A15.5 15.5 0 014 6.2 2 2 0 016 4" />
  ),
  email: <path d="M3 6h18v12H3zM3 6l9 7 9-7" />,
  whatsapp: <path d="M4 20l1.4-4A8 8 0 1112 20a8 8 0 01-4-1L4 20z" />,
  virtual: <path d="M3 7h11v10H3zM14 11l7-4v10l-7-4" />,
  presencial: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
      <path d="M16 8.5a2.5 2.5 0 100-5" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 014 0v4" />
    </>
  ),
  otro: <circle cx="12" cy="12" r="7" />,
};

/** Traduce el texto libre del campo `tipo` a un ícono y un color de la paleta Holmes. */
function metaTipo(tipo: string): { color: string; icono: React.ReactNode } {
  const t = (tipo || '').toLowerCase();
  if (t.includes('llamada')) return { color: '#0D8FA6', icono: ICONOS.llamada };
  if (t.includes('mail') || t.includes('correo')) return { color: '#0A3A6B', icono: ICONOS.email };
  if (t.includes('whats')) return { color: '#2E9E5B', icono: ICONOS.whatsapp };
  if (t.includes('virtual')) return { color: '#6B5BD2', icono: ICONOS.virtual };
  // La presencial va en rojo para que destaque: es la interacción de más valor
  if (t.includes('presencial')) return { color: '#D64545', icono: ICONOS.presencial };
  if (t.includes('linkedin')) return { color: '#1A3B47', icono: ICONOS.linkedin };
  return { color: '#7C8899', icono: ICONOS.otro };
}

function IconoTipo({ tipo, size = 34 }: { tipo: string; size?: number }) {
  const { color, icono } = metaTipo(tipo);
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: color }}
      title={tipo}
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icono}
      </svg>
    </span>
  );
}

/* ---------- Utilidades ---------- */

function fechaCorta(f: string) {
  return new Date(f).toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' });
}

function hace(f: string): string {
  const d = Math.round((Date.now() - new Date(f).getTime()) / 86400000);
  if (d < 0) return `en ${Math.abs(d)} d`;
  if (d === 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d} d`;
  if (d < 365) return `hace ${Math.floor(d / 30)} m`;
  return `hace ${Math.floor(d / 365)} a`;
}

/**
 * Coloca los hitos a escala temporal: la distancia horizontal es el tiempo real
 * transcurrido, no el número de interacciones. Así un silencio de cinco meses
 * se ve como un vacío y no como "un paso más".
 *
 * Las actividades llegan de la más reciente a la más antigua, así que el eje
 * corre de izquierda (hoy) a derecha (pasado).
 */
function calcularEje(actividades: Actividad[]) {
  const MARGEN = 48;
  const SEPARACION_MINIMA = 34; // para que dos íconos contiguos no se pisen
  const PX_POR_DIA = 5;

  const tiempos = actividades.map((a) => new Date(a.fecha).getTime());
  const maxT = Math.max(...tiempos);
  const minT = Math.min(...tiempos);
  const dias = Math.max(1, (maxT - minT) / 86400000);
  const util = Math.min(3600, Math.max(360, dias * PX_POR_DIA));
  const ancho = util + MARGEN * 2;

  // Posición proporcional; luego se separa lo justo para que no se solapen
  const puntos = actividades.map((a, i) => ({
    a,
    x: MARGEN + ((maxT - tiempos[i]) / (maxT - minT || 1)) * util,
  }));
  for (let i = 1; i < puntos.length; i++) {
    puntos[i].x = Math.max(puntos[i].x, puntos[i - 1].x + SEPARACION_MINIMA);
  }
  const anchoFinal = Math.max(ancho, (puntos.at(-1)?.x ?? 0) + MARGEN);

  // Huecos largos entre un contacto y el anterior
  const huecos: Array<{ clave: string; x: number; dias: number }> = [];
  for (let i = 0; i < puntos.length - 1; i++) {
    const d = Math.round((tiempos[i] - tiempos[i + 1]) / 86400000);
    if (d >= 21) {
      huecos.push({
        clave: `${puntos[i].a.id}-${puntos[i + 1].a.id}`,
        x: (puntos[i].x + puntos[i + 1].x) / 2,
        dias: d,
      });
    }
  }

  // Marcas de mes a lo largo del eje
  const meses: Array<{ clave: string; x: number; label: string }> = [];
  const cursor = new Date(maxT);
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() >= minT) {
    const x = MARGEN + ((maxT - cursor.getTime()) / (maxT - minT || 1)) * util;
    meses.push({
      clave: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      x,
      label: cursor.toLocaleDateString('es', { month: 'short', year: '2-digit' }),
    });
    cursor.setMonth(cursor.getMonth() - 1);
  }

  return { ancho: anchoFinal, puntos, huecos, meses };
}

type Grupo = {
  clave: string;
  titulo: string;
  subtitulo: string;
  href?: string;
  actividades: Actividad[];
  autores: string[];
  ultima: number;
  /** Varios consultores tocaron al grupo en los últimos 60 días. */
  colision: boolean;
};

export default function TimelineView({
  actividades,
  contactos,
  managers,
  titulo = 'Línea de tiempo de relaciones',
}: {
  actividades: Actividad[];
  contactos: Contacto[];
  managers: Record<string, Manager>;
  titulo?: string;
}) {
  // Por defecto se entra por cliente: es la vista que responde "¿qué está pasando en esta cuenta?"
  const [agrupacion, setAgrupacion] = useState<'empresa' | 'contacto'>('empresa');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [soloCompartidos, setSoloCompartidos] = useState(false);
  /** Hito sobre el que está el cursor: solo entonces se muestra el detalle. */
  const [hito, setHito] = useState<Actividad | null>(null);

  const mapaContactos = useMemo(() => {
    const m: Record<string, Contacto> = {};
    contactos.forEach((c) => {
      m[c.id] = c;
    });
    return m;
  }, [contactos]);

  const tipos = useMemo(
    () => [...new Set(actividades.map((a) => a.tipo).filter(Boolean))].sort(),
    [actividades]
  );

  const grupos: Grupo[] = useMemo(() => {
    const acc = new Map<string, Grupo>();
    const hace60 = Date.now() - 60 * 86400000;

    actividades
      .filter((a) => filtroTipo === 'todos' || a.tipo === filtroTipo)
      .forEach((a) => {
        const c = mapaContactos[a.contacto_id];
        if (!c) return;
        const clave = agrupacion === 'contacto' ? c.id : c.empresa;
        if (!acc.has(clave)) {
          acc.set(clave, {
            clave,
            titulo: agrupacion === 'contacto' ? c.nombre : c.empresa,
            subtitulo:
              agrupacion === 'contacto'
                ? [c.cargo, c.empresa].filter(Boolean).join(' · ')
                : (() => {
                    const n = contactos.filter((x) => x.empresa === c.empresa).length;
                    return `${n} ${n === 1 ? 'contacto' : 'contactos'} en la cuenta`;
                  })(),
            href: agrupacion === 'contacto' ? `/contactos/${c.id}` : undefined,
            actividades: [],
            autores: [],
            ultima: 0,
            colision: false,
          });
        }
        const g = acc.get(clave)!;
        g.actividades.push(a);
        if (!g.autores.includes(a.autor_id)) g.autores.push(a.autor_id);
        g.ultima = Math.max(g.ultima, new Date(a.fecha).getTime());
      });

    return [...acc.values()]
      .map((g) => {
        g.actividades.sort((x, y) => new Date(y.fecha).getTime() - new Date(x.fecha).getTime());
        const autoresRecientes = new Set(
          g.actividades.filter((a) => new Date(a.fecha).getTime() >= hace60).map((a) => a.autor_id)
        );
        g.colision = autoresRecientes.size > 1;
        return g;
      })
      .filter((g) => {
        if (soloCompartidos && g.autores.length < 2) return false;
        if (!busqueda) return true;
        const q = busqueda.toLowerCase();
        return g.titulo.toLowerCase().includes(q) || g.subtitulo.toLowerCase().includes(q);
      })
      .sort((a, b) => b.ultima - a.ultima);
  }, [actividades, mapaContactos, agrupacion, busqueda, filtroTipo, soloCompartidos, contactos]);

  const compartidos = grupos.filter((g) => g.autores.length > 1).length;

  return (
    <div className="mx-auto max-w-[1180px] p-6">
      <PageHeader
        kicker="Historia de la relación"
        titulo={titulo}
        bajada={`${grupos.length} ${agrupacion === 'contacto' ? 'contactos' : 'cuentas'} con actividad · ${compartidos} con más de un consultor involucrado`}
      />

      {/* Controles */}
      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="inline-flex rounded-lg bg-ceramica p-0.5">
          {(['empresa', 'contacto'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setAgrupacion(g)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: agrupacion === g ? '#0A3A6B' : 'transparent',
                color: agrupacion === g ? '#fff' : '#2B3440',
              }}
            >
              {g === 'contacto' ? 'Por contacto' : 'Por cliente'}
            </button>
          ))}
        </div>

        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar persona o empresa…"
          className="field w-auto min-w-[220px] flex-1 py-1.5 text-xs"
        />

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="field w-auto cursor-pointer py-1.5 text-xs"
        >
          <option value="todos">Todos los medios</option>
          {tipos.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <button
          onClick={() => setSoloCompartidos(!soloCompartidos)}
          className="chip transition-colors"
          style={{
            backgroundColor: soloCompartidos ? '#1F6FEB' : '#F3F6FA',
            color: soloCompartidos ? '#fff' : '#2B3440',
          }}
        >
          Solo compartidos
        </button>
      </Card>

      {/* Leyenda de medios */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {['Llamada', 'Email', 'WhatsApp', 'Reunión virtual', 'Reunión presencial', 'Mensaje LinkedIn'].map(
          (t) => (
            <span key={t} className="flex items-center gap-1.5 text-[11px] text-tinta/70">
              <IconoTipo tipo={t} size={20} />
              {t}
            </span>
          )
        )}
      </div>

      {grupos.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Sin interacciones que mostrar"
            detalle="Prueba a quitar filtros o a cambiar la agrupación."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => {
            return (
              <div key={g.clave} className="space-y-2">
                {/* Cabecera octogonal del grupo */}
                <div className="notch flex flex-wrap items-center justify-between gap-3 bg-mbc px-7 py-4">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-acento-200">
                      {agrupacion === 'contacto' ? 'Contacto' : 'Cuenta'}
                    </div>
                    {g.href ? (
                      <Link
                        href={g.href}
                        className="block truncate text-sm font-semibold text-white hover:text-acento-200"
                      >
                        {g.titulo}
                      </Link>
                    ) : (
                      <span className="block truncate text-sm font-semibold text-white">{g.titulo}</span>
                    )}
                    <div className="truncate text-xs text-white/60">{g.subtitulo}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Quiénes han tocado a esta persona o cuenta */}
                    <div className="flex -space-x-2">
                      {g.autores.map((id) =>
                        managers[id] ? (
                          <span key={id} className="rounded-full ring-2 ring-mbc">
                            <Avatar
                              iniciales={managers[id].iniciales}
                              nombre={managers[id].nombre}
                              size={26}
                              tono="acento"
                            />
                          </span>
                        ) : null
                      )}
                    </div>
                    <span className="chip bg-white/10 text-white">
                      {g.actividades.length} interacciones
                    </span>
                    <span className="chip bg-white/10 text-white">
                      último {hace(g.actividades[0].fecha)}
                    </span>
                    {g.autores.length > 1 && (
                      <span
                        className="chip"
                        style={{ backgroundColor: g.colision ? '#D64545' : '#E58413', color: '#fff' }}
                        title={
                          g.colision
                            ? 'Dos o más consultores han contactado en los últimos 60 días'
                            : 'Relación con historia compartida entre consultores'
                        }
                      >
                        {g.colision ? '⚠ Contacto simultáneo' : 'Compartido'} · {g.autores.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Línea de tiempo horizontal: lo más reciente a la izquierda */}
                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between px-5 pt-3 text-[10px] uppercase tracking-[0.12em] text-arena">
                    <span>← más reciente</span>
                    <span>más antiguo →</span>
                  </div>

                  {/* Eje a escala real: la distancia entre íconos es el tiempo transcurrido */}
                  <div className="overflow-x-auto">
                    {(() => {
                      const eje = calcularEje(g.actividades);
                      return (
                        <div
                          className="relative"
                          style={{ width: eje.ancho, height: 104 }}
                          onMouseLeave={() => setHito(null)}
                        >
                          {/* Riel */}
                          <span
                            className="absolute h-px"
                            style={{ left: 0, right: 0, top: 56, backgroundColor: '#D6DEE8' }}
                            aria-hidden
                          />

                          {/* Marcas de mes */}
                          {eje.meses.map((m) => (
                            <div key={m.clave} className="absolute" style={{ left: m.x, top: 8 }}>
                              <span
                                className="absolute w-px"
                                style={{ top: 18, height: 30, backgroundColor: '#E4EAF2' }}
                                aria-hidden
                              />
                              <span className="block -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.1em] text-arena">
                                {m.label}
                              </span>
                            </div>
                          ))}

                          {/* Silencios: cuánto tiempo pasó sin tocar al contacto */}
                          {eje.huecos.map((h) => (
                            <span
                              key={h.clave}
                              className="absolute -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{
                                left: h.x,
                                top: 74,
                                backgroundColor: h.dias >= 90 ? '#FBEBEB' : '#F3F6FA',
                                color: h.dias >= 90 ? '#A62222' : '#7C8899',
                              }}
                              title={`${h.dias} días sin contacto`}
                            >
                              {h.dias >= 60 ? `⚠ ${h.dias} d sin contacto` : `${h.dias} d`}
                            </span>
                          ))}

                          {/* Hitos */}
                          {eje.puntos.map(({ a, x }) => {
                            const activo = hito?.id === a.id;
                            return (
                              <button
                                key={a.id}
                                onMouseEnter={() => setHito(a)}
                                onFocus={() => setHito(a)}
                                className="absolute -translate-x-1/2 outline-none"
                                style={{ left: x, top: 40 }}
                                title={`${a.tipo} · ${fechaCorta(a.fecha)}`}
                              >
                                <span
                                  className="block transition-transform"
                                  style={{ transform: activo ? 'scale(1.2)' : 'scale(1)' }}
                                >
                                  <IconoTipo tipo={a.tipo} size={30} />
                                </span>
                                {activo && (
                                  <span className="tnum absolute left-1/2 top-[34px] -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-mbc">
                                    {fechaCorta(a.fecha)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Detalle del hito señalado */}
                  <div
                    className="min-h-[74px] border-t px-5 py-3"
                    style={{ borderColor: '#D6DEE8' }}
                  >
                    {(() => {
                      const a = hito && g.actividades.some((x) => x.id === hito.id) ? hito : null;
                      if (!a) {
                        return (
                          <p className="text-xs text-arena">
                            Pasa el cursor por un hito para ver el detalle.
                          </p>
                        );
                      }
                      const autor = managers[a.autor_id];
                      const c = mapaContactos[a.contacto_id];
                      return (
                        <div className="flex flex-wrap items-start gap-3">
                          <IconoTipo tipo={a.tipo} size={28} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <span className="text-sm font-semibold text-mbc">{a.tipo}</span>
                              {c && <span className="text-xs text-tinta/70">con {c.nombre}</span>}
                              <span className="text-xs text-arena">
                                {fechaCorta(a.fecha)} · {hace(a.fecha)}
                              </span>
                              {autor && (
                                <Chip color="mbc">
                                  {autor.iniciales} · {autor.nombre.split(' ')[0]}
                                </Chip>
                              )}
                            </div>
                            {a.resultado && (
                              <p className="mt-1 text-sm text-tinta/80">{a.resultado}</p>
                            )}
                            {a.proximos_pasos && (
                              <p className="mt-1 border-l-2 border-acento-200 pl-2 text-xs text-tinta/70">
                                Próximos pasos: {a.proximos_pasos}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
