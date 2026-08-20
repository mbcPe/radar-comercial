'use client';

/**
 * Portada de la herramienta: lo accionable de la semana, agrupado por cliente.
 *
 * No es un informe. Responde tres cosas en un vistazo: a quién toca contactar,
 * de qué cuenta es y con qué excusa (la temática), y deja registrar el contacto
 * sin salir de la pantalla.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Contacto, Manager } from '@/components/dashboard/DashboardView';
import { Avatar, Card, EmptyState, PageHeader, Progress, cx } from '@/components/ui/kit';

const MEDIOS = [
  'Llamada',
  'Email',
  'WhatsApp',
  'Reunión virtual',
  'Reunión presencial',
  'Mensaje LinkedIn',
] as const;

/* ---------- Temáticas: la excusa concreta para escribir ---------- */

type Tematica = {
  id: string;
  etiqueta: string;
  icono: string;
  color: string;
  soft: string;
  /** Situación de la plantilla que corresponde en /plantillas */
  plantilla: string;
};

const TEMATICAS: Record<string, Tematica> = {
  cumple: { id: 'cumple', etiqueta: 'Cumpleaños', icono: '🎂', color: '#D64545', soft: '#FBEBEB', plantilla: 'cumpleanios' },
  propuesta: { id: 'propuesta', etiqueta: 'Propuesta en juego', icono: '📄', color: '#1F6FEB', soft: '#EAF2FE', plantilla: 'seguimiento-propuesta' },
  reactivar: { id: 'reactivar', etiqueta: 'Relación enfriada', icono: '🧊', color: '#E58413', soft: '#FDF0E1', plantilla: 'reactivacion' },
  sondeo: { id: 'sondeo', etiqueta: 'Sondear oportunidad', icono: '🔎', color: '#0D8FA6', soft: '#E2F4F8', plantilla: 'sondeo-oportunidad' },
  mantener: { id: 'mantener', etiqueta: 'Mantener contacto', icono: '🤝', color: '#0A3A6B', soft: '#E6EDF6', plantilla: 'aporte-valor' },
};

function diasHasta(fecha: string | null): number | null {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(fecha).getTime() - hoy.getTime()) / 86400000);
}

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

/** Por qué toca escribirle a esta persona, en orden de prioridad. */
function tematicaDe(c: Contacto): Tematica {
  const cumple = diasHastaCumple(c.cumple);
  if (cumple !== null && cumple <= 7) return TEMATICAS.cumple;
  if (c.oportunidad) return TEMATICAS.propuesta;
  const d = diasHasta(c.next_touch);
  if (d !== null && d < -30) return TEMATICAS.reactivar;
  if (c.prioridad === 'P1') return TEMATICAS.sondeo;
  return TEMATICAS.mantener;
}

function textoPlazo(dias: number | null): string {
  if (dias === null) return 'sin fecha';
  if (dias < 0) return `vencido hace ${Math.abs(dias)} d`;
  if (dias === 0) return 'vence hoy';
  if (dias === 1) return 'vence mañana';
  return `en ${dias} días`;
}

export default function AgendaView({
  contactos,
  managers,
  onMarcarContactado,
  onRegistrarAccion,
  onPosponer,
}: {
  contactos: Contacto[];
  managers: Record<string, Manager>;
  onMarcarContactado?: (c: Contacto, medio: string) => Promise<void>;
  onRegistrarAccion?: (c: Contacto) => void;
  /** Mueve el próximo contacto N días sin registrar actividad. */
  onPosponer?: (c: Contacto, dias: number) => Promise<void>;
}) {
  const [medioAbierto, setMedioAbierto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [hechos, setHechos] = useState<string[]>([]);
  const [filtroTema, setFiltroTema] = useState<string>('todas');
  /** 'lista' = todo a la vista; 'enfoque' = una tarjeta a la vez. */
  const [modo, setModo] = useState<'lista' | 'enfoque'>('lista');
  const [saltados, setSaltados] = useState<string[]>([]);

  async function confirmar(c: Contacto, medio: string) {
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

  /* ---- Qué entra en la semana: lo vencido más lo que vence hasta el domingo ---- */
  const cuentas = useMemo(() => {
    const hoy = new Date();
    const hastaDomingo = 7 - (hoy.getDay() === 0 ? 7 : hoy.getDay());

    const pendientes = contactos
      .filter((c) => {
        if (c.estado === 'pausa') return false;
        const d = diasHasta(c.next_touch);
        return d !== null && d <= hastaDomingo;
      })
      .map((c) => ({ c, tema: tematicaDe(c), dias: diasHasta(c.next_touch) ?? 0 }))
      .filter((x) => filtroTema === 'todas' || x.tema.id === filtroTema);

    const porEmpresa = new Map<string, typeof pendientes>();
    pendientes.forEach((p) => {
      const lista = porEmpresa.get(p.c.empresa) ?? [];
      lista.push(p);
      porEmpresa.set(p.c.empresa, lista);
    });

    return [...porEmpresa.entries()]
      .map(([empresa, lista]) => ({
        empresa,
        lista: [...lista].sort((a, b) => a.dias - b.dias),
        urgencia: Math.min(...lista.map((x) => x.dias)),
        duenos: [...new Set(lista.map((x) => x.c.manager_id))],
      }))
      .sort((a, b) => a.urgencia - b.urgencia);
  }, [contactos, filtroTema]);

  const total = cuentas.reduce((s, g) => s + g.lista.length, 0);
  const restantes = cuentas.reduce(
    (s, g) => s + g.lista.filter((x) => !hechos.includes(x.c.id)).length,
    0
  );
  const vencidos = cuentas.reduce((s, g) => s + g.lista.filter((x) => x.dias < 0).length, 0);
  const avance = total > 0 ? Math.round(((total - restantes) / total) * 100) : 100;

  // Conteo por temática, para los filtros
  const conteoTema = useMemo(() => {
    const hoy = new Date();
    const hastaDomingo = 7 - (hoy.getDay() === 0 ? 7 : hoy.getDay());
    const m: Record<string, number> = {};
    contactos.forEach((c) => {
      if (c.estado === 'pausa') return;
      const d = diasHasta(c.next_touch);
      if (d === null || d > hastaDomingo) return;
      const t = tematicaDe(c);
      m[t.id] = (m[t.id] ?? 0) + 1;
    });
    return m;
  }, [contactos]);

  /* ---- Modo enfoque: una tarjeta a la vez, sin nada alrededor ---- */
  if (modo === 'enfoque') {
    const cola = cuentas
      .flatMap((g) => g.lista)
      .filter((x) => !hechos.includes(x.c.id) && !saltados.includes(x.c.id));
    const actual = cola[0];
    const hechosCuenta = total - cola.length;

    if (!actual) {
      return (
        <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center p-6 text-center">
          <span className="notch mb-4 bg-verde px-6 py-4 text-2xl">✓</span>
          <h2 className="display text-2xl">
            {hechos.length === 0
              ? 'Nada pendiente'
              : hechos.length === 1
                ? '1 contacto tocado'
                : `${hechos.length} contactos tocados`}
          </h2>
          <p className="mt-2 text-sm text-tinta/70">
            {saltados.length > 0
              ? `${saltados.length === 1 ? 'Uno quedó' : `${saltados.length} quedaron`} para después.`
              : 'Tu semana está cerrada.'}
          </p>
          <button onClick={() => setModo('lista')} className="btn-ghost mt-5 px-4 py-2 text-sm">
            Volver a la lista
          </button>
        </div>
      );
    }

    const { c, tema, dias } = actual;
    const mgr = managers[c.manager_id];
    const abierto = medioAbierto === c.id;

    return (
      <div className="mx-auto max-w-lg p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="kicker">
            {hechosCuenta + 1} de {total}
          </span>
          <button
            onClick={() => setModo('lista')}
            className="text-xs font-semibold text-tinta/70 hover:text-mbc"
          >
            Salir del enfoque ✕
          </button>
        </div>
        <div className="mb-4">
          <Progress porcentaje={(hechosCuenta / Math.max(1, total)) * 100} color="#1F6FEB" />
        </div>

        <Card className="p-6 text-center">
          <span
            className="notch mx-auto mb-4 flex h-16 w-16 items-center justify-center text-3xl"
            style={{ backgroundColor: tema.soft }}
          >
            {tema.icono}
          </span>
          <div className="kicker" style={{ color: tema.color }}>
            {tema.etiqueta}
          </div>
          <h2 className="display mt-2 text-[26px]">{c.nombre}</h2>
          <p className="mt-1 text-sm text-tinta/70">
            {c.cargo} · <span className="font-semibold text-mbc">{c.empresa}</span>
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <span
              className="chip"
              style={{
                backgroundColor: dias < 0 ? '#FBEBEB' : '#F3F6FA',
                color: dias < 0 ? '#A62222' : '#7C8899',
              }}
            >
              {textoPlazo(dias)}
            </span>
            <span className="chip bg-ceramica text-tinta">{c.prioridad}</span>
            {mgr && <Avatar iniciales={mgr.iniciales} nombre={mgr.nombre} size={22} />}
          </div>

          {c.oportunidad && (
            <p className="mt-4 rounded-xl bg-acento-100 p-3 text-sm text-mbc">
              <span className="font-semibold">En juego:</span> {c.oportunidad}
            </p>
          )}

          {abierto ? (
            <div className="mt-5">
              <div className="kicker mb-2">¿Por qué medio lo contactaste?</div>
              <div className="flex flex-wrap justify-center gap-2">
                {MEDIOS.map((m) => (
                  <button
                    key={m}
                    onClick={() => confirmar(c, m)}
                    disabled={guardando === c.id}
                    className="rounded-full bg-ceramica px-4 py-2 text-sm font-semibold text-mbc transition-colors hover:bg-acento hover:text-white disabled:opacity-50"
                  >
                    {m}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMedioAbierto(null)}
                className="mt-3 text-xs text-tinta/60 hover:underline"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-2">
              <button
                onClick={() => setMedioAbierto(c.id)}
                className="btn-primary w-full py-3.5 text-sm"
              >
                Contactado
              </button>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (onPosponer) await onPosponer(c, 7);
                    setSaltados((p) => [...p, c.id]);
                  }}
                  disabled={!onPosponer}
                  className="btn-ghost flex-1 py-3 text-sm"
                >
                  Posponer 7 días
                </button>
                <button
                  onClick={() => setSaltados((p) => [...p, c.id])}
                  className="btn-ghost flex-1 py-3 text-sm"
                >
                  Saltar
                </button>
              </div>
              <Link
                href={`/plantillas?situacion=${tema.plantilla}&contacto=${c.id}`}
                className="block pt-2 text-xs font-semibold text-acento hover:underline"
              >
                ✍ Ver qué decirle
              </Link>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] p-6">
      <PageHeader
        kicker={`Semana del ${new Date().toLocaleDateString('es', { day: '2-digit', month: 'long' })}`}
        titulo={
          restantes === 0
            ? '¡Semana cerrada! No queda nadie por contactar'
            : `Te toca contactar a ${restantes} ${restantes === 1 ? 'persona' : 'personas'} en ${cuentas.length} ${cuentas.length === 1 ? 'cuenta' : 'cuentas'}`
        }
        bajada={
          vencidos > 0
            ? `${vencidos} ya venció su cadencia · empieza por arriba, están ordenadas por urgencia`
            : 'Ninguno está vencido todavía: vas al día'
        }
        acciones={
          <>
            {restantes > 0 && (
              <button
                onClick={() => {
                  setSaltados([]);
                  setModo('enfoque');
                }}
                className="btn-primary px-4 py-2 text-xs"
              >
                ▶ Modo enfoque
              </button>
            )}
            <Link href="/dashboard" className="btn-ghost px-3 py-2 text-xs">
              Ver el dashboard →
            </Link>
          </>
        }
      />

      {/* Avance de la semana */}
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="kicker">Avance de la semana</span>
          <span className="tnum text-sm font-semibold text-mbc">
            {total - restantes} de {total} contactados · {avance}%
          </span>
        </div>
        <div className="mt-2">
          <Progress porcentaje={avance} color={avance === 100 ? '#2E9E5B' : '#1F6FEB'} />
        </div>
      </Card>

      {/* Filtro por temática */}
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroTema('todas')}
          className="chip"
          style={{
            backgroundColor: filtroTema === 'todas' ? '#0A3A6B' : '#fff',
            color: filtroTema === 'todas' ? '#fff' : '#2B3440',
          }}
        >
          Todas · {Object.values(conteoTema).reduce((a, b) => a + b, 0)}
        </button>
        {Object.values(TEMATICAS).map((t) => {
          const n = conteoTema[t.id] ?? 0;
          if (n === 0) return null;
          const activa = filtroTema === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setFiltroTema(activa ? 'todas' : t.id)}
              className="chip"
              style={{
                backgroundColor: activa ? t.color : t.soft,
                color: activa ? '#fff' : t.color,
              }}
            >
              {t.icono} {t.etiqueta} · {n}
            </button>
          );
        })}
      </div>

      {cuentas.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Nada pendiente esta semana"
            detalle="Ningún contacto vence antes del domingo ni quedó rezagado."
            accion={
              <Link href="/contactos" className="btn-ghost mt-2 px-3 py-2 text-xs">
                Ver toda la cartera
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cuentas.map((g) => {
            const pendientesCuenta = g.lista.filter((x) => !hechos.includes(x.c.id)).length;
            const cerrada = pendientesCuenta === 0;
            return (
              // min-w-0: sin esto el hijo del grid no baja de su ancho de contenido
              <div key={g.empresa} className="min-w-0 space-y-2">
                {/* Cabecera de la cuenta */}
                <div
                  className="notch flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                  style={{ backgroundColor: cerrada ? '#2E9E5B' : '#0A3A6B' }}
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
                      Cuenta
                    </div>
                    <div className="truncate text-sm font-semibold text-white">{g.empresa}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {g.duenos.map((id) =>
                        managers[id] ? (
                          <span key={id} className="rounded-full ring-2 ring-white/20">
                            <Avatar
                              iniciales={managers[id].iniciales}
                              nombre={managers[id].nombre}
                              size={24}
                              tono="acento"
                            />
                          </span>
                        ) : null
                      )}
                    </div>
                    <span className="chip bg-white/15 text-white">
                      {cerrada ? '✓ al día' : `${pendientesCuenta} por contactar`}
                    </span>
                  </div>
                </div>

                {/* Personas de la cuenta */}
                <Card className="divide-y divide-ceramica p-0">
                  {g.lista.map(({ c, tema, dias }) => {
                    const hecho = hechos.includes(c.id);
                    const abierto = medioAbierto === c.id;
                    const mgr = managers[c.manager_id];
                    return (
                      <div key={c.id} className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Temática como marca visual de la fila */}
                          <span
                            className="notch-sm flex h-11 w-11 shrink-0 items-center justify-center text-lg"
                            style={{ backgroundColor: hecho ? '#E7F6EE' : tema.soft }}
                            title={tema.etiqueta}
                          >
                            {hecho ? '✓' : tema.icono}
                          </span>

                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/contactos/${c.id}`}
                              className={cx(
                                'block truncate text-sm font-semibold hover:text-acento',
                                hecho ? 'text-tinta/40 line-through' : 'text-mbc'
                              )}
                            >
                              {c.nombre}
                            </Link>
                            <div className="truncate text-xs text-tinta/70">{c.cargo}</div>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className="chip"
                                style={{ backgroundColor: tema.soft, color: tema.color }}
                              >
                                {tema.etiqueta}
                              </span>
                              <span
                                className="chip"
                                style={{
                                  backgroundColor: dias < 0 ? '#FBEBEB' : '#F3F6FA',
                                  color: dias < 0 ? '#A62222' : '#7C8899',
                                }}
                              >
                                {hecho ? 'contactado hoy' : textoPlazo(dias)}
                              </span>
                              <span className="chip bg-ceramica text-tinta">{c.prioridad}</span>
                              {mgr && <Avatar iniciales={mgr.iniciales} nombre={mgr.nombre} size={22} />}
                            </div>

                            {c.oportunidad && (
                              <div className="mt-2 truncate text-xs text-tinta/70">
                                <span className="font-semibold text-mbc">En juego:</span>{' '}
                                {c.oportunidad}
                              </div>
                            )}
                          </div>

                          {!hecho && (
                            <button
                              onClick={() => setMedioAbierto(abierto ? null : c.id)}
                              disabled={!onMarcarContactado || guardando === c.id}
                              className="btn-primary shrink-0 px-3 py-2 text-xs"
                            >
                              {guardando === c.id ? '…' : 'Contactado'}
                            </button>
                          )}
                        </div>

                        {/* Paso 2: por qué medio */}
                        {abierto && !hecho && (
                          <div className="mt-3 rounded-xl bg-acento-100 p-3">
                            <div className="kicker mb-2">¿Por qué medio lo contactaste?</div>
                            <div className="flex flex-wrap gap-2">
                              {MEDIOS.map((m) => (
                                <button
                                  key={m}
                                  onClick={() => confirmar(c, m)}
                                  disabled={guardando === c.id}
                                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-mbc transition-colors hover:bg-acento hover:text-white disabled:opacity-50"
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              <Link
                                href={`/plantillas?situacion=${tema.plantilla}&contacto=${c.id}`}
                                className="text-[11px] font-semibold text-acento hover:underline"
                              >
                                ✍ Ver qué decirle ({tema.etiqueta.toLowerCase()})
                              </Link>
                              {onRegistrarAccion && (
                                <button
                                  onClick={() => onRegistrarAccion(c)}
                                  className="text-[11px] font-semibold text-tinta/70 hover:underline"
                                >
                                  Registrar con detalle
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
