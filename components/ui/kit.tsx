/**
 * Primitivas visuales del Radar Comercial.
 * Traducen el arte de los decks Minsait (Pruno / Fucsia / Cerámica, cabeceras
 * con chaflán, antetítulo + título-afirmación) a componentes de UI.
 * Sin hooks ni estado: se pueden usar desde server y client components.
 */

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/** Marca MBC: bloque octogonal del logotipo. */
export function LogoMBC({
  invertido = false,
  size = 'md',
}: {
  /** true = fondo blanco y letras marino (para usar sobre el azul). */
  invertido?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const escalas = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-[13px]',
    lg: 'px-4 py-2 text-xl',
  };
  return (
    <span
      className={cx(
        'notch-sm inline-flex items-center justify-center font-extrabold tracking-[0.08em]',
        escalas[size],
        invertido ? 'bg-white text-mbc' : 'bg-mbc text-white'
      )}
      aria-label="MBC"
    >
      MBC
    </span>
  );
}

/* ---------- Estructura de página ---------- */

export function PageHeader({
  kicker,
  titulo,
  bajada,
  acciones,
}: {
  kicker: string;
  titulo: string;
  bajada?: string;
  acciones?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="kicker mb-1.5">{kicker}</div>
        <h2 className="display text-2xl md:text-[28px]">{titulo}</h2>
        {bajada && <p className="mt-1.5 text-sm text-tinta/70">{bajada}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cx('card', className)}>{children}</div>;
}

/** Cabecera Pruno con chaflán — el gesto visual firma del arte Holmes. */
export function PanelHeader({
  kicker,
  titulo,
  derecha,
}: {
  kicker?: string;
  titulo: string;
  derecha?: React.ReactNode;
}) {
  return (
    <div className="notch flex items-center justify-between gap-3 bg-mbc px-5 py-3">
      <div className="min-w-0">
        {kicker && (
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-acento-200">
            {kicker}
          </div>
        )}
        <div className="truncate text-sm font-semibold text-white">{titulo}</div>
      </div>
      {derecha && <div className="flex shrink-0 items-center gap-2 text-white">{derecha}</div>}
    </div>
  );
}

export function Panel({
  kicker,
  titulo,
  derecha,
  children,
  className,
}: {
  kicker?: string;
  titulo: string;
  derecha?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  // Cabecera octogonal separada del contenedor blanco, como en las propuestas
  return (
    <div className={cx('space-y-2', className)}>
      <PanelHeader kicker={kicker} titulo={titulo} derecha={derecha} />
      <Card className="p-5">{children}</Card>
    </div>
  );
}

/* ---------- Átomos ---------- */

export function Chip({
  children,
  color = 'neutral',
  solido = false,
}: {
  children: React.ReactNode;
  color?: 'neutral' | 'rezagado' | 'proximo' | 'aldia' | 'pausa' | 'acento' | 'mbc' | 'verde';
  solido?: boolean;
}) {
  const tonos: Record<string, { bg: string; fg: string; solidBg: string }> = {
    neutral: { bg: '#F3F6FA', fg: '#2B3440', solidBg: '#2B3440' },
    rezagado: { bg: '#FBEBEB', fg: '#A62222', solidBg: '#D64545' },
    proximo: { bg: '#FDF0E1', fg: '#9A5400', solidBg: '#E58413' },
    aldia: { bg: '#E7F6EE', fg: '#1E6B3C', solidBg: '#2E9E5B' },
    pausa: { bg: '#E2F4F8', fg: '#0A6C7E', solidBg: '#0D8FA6' },
    acento: { bg: '#EAF2FE', fg: '#A62222', solidBg: '#1F6FEB' },
    mbc: { bg: '#E6EDF6', fg: '#0A3A6B', solidBg: '#0A3A6B' },
    verde: { bg: '#E7F6EE', fg: '#1E6B3C', solidBg: '#2E9E5B' },
  };
  const t = tonos[color] ?? tonos.neutral;
  return (
    <span
      className="chip"
      style={
        solido
          ? { backgroundColor: t.solidBg, color: '#fff' }
          : { backgroundColor: t.bg, color: t.fg }
      }
    >
      {children}
    </span>
  );
}

export function Avatar({
  iniciales,
  nombre,
  size = 32,
  tono = 'mbc',
}: {
  iniciales: string;
  nombre?: string;
  size?: number;
  tono?: 'mbc' | 'acento' | 'petroleo';
}) {
  const fondos = { mbc: '#0A3A6B', acento: '#1F6FEB', petroleo: '#1A3B47' };
  return (
    <span
      title={nombre}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: fondos[tono],
        fontSize: Math.max(9, Math.round(size * 0.36)),
      }}
    >
      {iniciales}
    </span>
  );
}

export function EmptyState({
  titulo,
  detalle,
  accion,
}: {
  titulo: string;
  detalle?: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ceramica">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14548F" strokeWidth="1.6">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </div>
      <p className="text-sm font-medium text-mbc">{titulo}</p>
      {detalle && <p className="max-w-sm text-xs text-tinta/60">{detalle}</p>}
      {accion}
    </div>
  );
}

/* ---------- Indicadores ---------- */

export function KpiCard({
  label,
  valor,
  unidad,
  hint,
  acento = '#0A3A6B',
  serie,
  icono,
}: {
  label: string;
  valor: string | number;
  unidad?: string;
  hint?: string;
  acento?: string;
  serie?: number[];
  icono?: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      {/* filete de color: identifica el KPI sin recargar la tarjeta */}
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: acento }} />
      <div className="flex items-start justify-between gap-2">
        <div className="kicker" style={{ color: acento }}>
          {label}
        </div>
        {icono && <span style={{ color: acento }}>{icono}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="tnum text-[34px] font-semibold leading-none text-mbc">{valor}</span>
        {unidad && <span className="text-lg font-medium text-arena">{unidad}</span>}
      </div>
      {serie && serie.length > 1 && (
        <div className="mt-3">
          <Sparkline valores={serie} color={acento} />
        </div>
      )}
      {hint && <div className="mt-2 text-xs text-tinta/60">{hint}</div>}
    </Card>
  );
}

/** Área + línea en SVG puro: sin dependencias y con color de marca exacto. */
export function Sparkline({
  valores,
  color = '#1F6FEB',
  alto = 34,
}: {
  valores: number[];
  color?: string;
  alto?: number;
}) {
  const ancho = 120;
  const max = Math.max(...valores, 1);
  const paso = valores.length > 1 ? ancho / (valores.length - 1) : ancho;
  const puntos = valores.map((v, i) => [i * paso, alto - (v / max) * (alto - 4) - 2] as const);
  const linea = puntos.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${linea} ${ancho},${alto} 0,${alto}`;
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-[34px] w-full" preserveAspectRatio="none">
      <polygon points={area} fill={color} opacity={0.12} />
      <polyline points={linea} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

/** Dona de una sola magnitud (cumplimiento, cobertura…). */
export function Donut({
  porcentaje,
  color = '#2E9E5B',
  size = 108,
  grosor = 12,
  centro,
  pie,
}: {
  porcentaje: number;
  color?: string;
  size?: number;
  grosor?: number;
  centro?: string;
  pie?: string;
}) {
  const r = (size - grosor) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, porcentaje));
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDF1F6" strokeWidth={grosor} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={`${(c * pct) / 100} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="tnum"
          style={{ fill: '#0A3A6B', fontSize: size * 0.24, fontWeight: 600 }}
        >
          {centro ?? `${Math.round(pct)}%`}
        </text>
      </svg>
      {pie && <div className="text-xs text-tinta/60">{pie}</div>}
    </div>
  );
}

/** Barra 100% apilada: reparto de la cartera en una sola línea legible. */
export function StackedShare({
  segmentos,
}: {
  segmentos: Array<{ label: string; valor: number; color: string }>;
}) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0) || 1;
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-ceramica">
        {segmentos.map((s) => (
          <div
            key={s.label}
            title={`${s.label}: ${s.valor}`}
            style={{ width: `${(s.valor / total) * 100}%`, backgroundColor: s.color }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segmentos.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs text-tinta/70">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
            <span className="tnum font-semibold text-mbc">{s.valor}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Barras verticales con etiqueta: actividad por mes, por tipo, por consultor. */
export function BarChart({
  datos,
  color = '#0A3A6B',
  alto = 180,
  formato,
}: {
  datos: Array<{ label: string; valor: number; color?: string }>;
  color?: string;
  alto?: number;
  formato?: (n: number) => string;
}) {
  const max = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <div className="flex items-end gap-2" style={{ height: alto }}>
      {datos.map((d) => (
        <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className="tnum text-[11px] font-semibold text-mbc">
            {formato ? formato(d.valor) : d.valor}
          </span>
          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: `${Math.max(2, (d.valor / max) * (alto - 42))}px`,
              backgroundColor: d.color ?? color,
            }}
          />
          <span className="w-full truncate text-center text-[10px] uppercase tracking-wide text-tinta/60">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Barra de progreso horizontal para rankings. */
export function Progress({ porcentaje, color = '#2E9E5B' }: { porcentaje: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ceramica">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.max(0, Math.min(100, porcentaje))}%`, backgroundColor: color }}
      />
    </div>
  );
}

/* ---------- Semáforo de cartera ---------- */

/**
 * `color` es para donas, barras y filetes; `fg` para cualquier TEXTO sobre `soft`.
 * Los tonos vivos de marca no llegan a 3:1 sobre su propio tinte, así que el texto
 * usa las versiones oscurecidas (las mismas que ya usaban los chips).
 */
export const ESTADO_META = {
  rezagado: { label: 'Rezagados', color: '#D64545', fg: '#A62222', soft: '#FBEBEB', pie: 'Acción urgente' },
  proximo: { label: 'Próximos', color: '#E58413', fg: '#9A5400', soft: '#FDF0E1', pie: 'Próx. 14 días' },
  aldia: { label: 'Al día', color: '#2E9E5B', fg: '#1E6B3C', soft: '#E7F6EE', pie: 'Sin urgencia' },
  pausa: { label: 'En pausa', color: '#0D8FA6', fg: '#0A6C7E', soft: '#E2F4F8', pie: 'Pausa temporal' },
} as const;

export type EstadoCartera = keyof typeof ESTADO_META;
