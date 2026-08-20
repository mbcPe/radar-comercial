'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useScope } from '@/lib/viewScope';
import { cx, LogoMBC } from '@/components/ui/kit';
import { MODO_DEMO } from '@/lib/modoDemo';
import { CONTACTOS, USUARIO_DEMO } from '@/lib/demoData';

type Manager = {
  id: string;
  email: string;
  nombre: string;
  iniciales: string;
  rol: string;
  es_admin: boolean;
};

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: 'agenda',
    label: 'Esta semana',
    href: '/',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="12" height="11" rx="1.5" />
        <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3M5.8 10l1.6 1.6 3-3" />
      </svg>
    ),
  },
  {
    id: 'contactos',
    label: 'Contactos',
    href: '/contactos',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="6" r="2.5" />
        <path d="M3 14c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
      </svg>
    ),
  },
  {
    id: 'actividades',
    label: 'Actividades',
    href: '/actividades',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 4h12M2 8h12M2 12h8" />
      </svg>
    ),
  },
  {
    id: 'linea-tiempo',
    label: 'Línea de tiempo',
    href: '/linea-tiempo',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 2v12" />
        <circle cx="7" cy="4.5" r="1.6" /><circle cx="10" cy="8" r="1.6" /><circle cx="7" cy="11.5" r="1.6" />
        <path d="M3 4.5h2.4M3 8h5M3 11.5h2.4" />
      </svg>
    ),
  },
  {
    id: 'proyectos',
    label: 'Proyectos',
    href: '/proyectos',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 5l6-3 6 3v6l-6 3-6-3z" />
        <path d="M2 5l6 3 6-3M8 8v6" />
      </svg>
    ),
  },
  {
    id: 'plantillas',
    label: 'Buenas prácticas',
    href: '/plantillas',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 2h7l3 3v9H3z" />
        <path d="M5.5 7h5M5.5 10h3" />
      </svg>
    ),
  },
  {
    id: 'equipo',
    label: 'Equipo',
    href: '/equipo',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="5" cy="6" r="2" /><circle cx="11" cy="6" r="2" />
        <path d="M1 14c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5M7 14c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" />
      </svg>
    ),
  },
  // El dashboard va al final: informa, pero no es por donde se empieza el día
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 14h12" />
        <rect x="3" y="8" width="2.6" height="5" /><rect x="6.7" y="5" width="2.6" height="8" />
        <rect x="10.4" y="2.5" width="2.6" height="10.5" />
      </svg>
    ),
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { scope, setScope } = useScope();
  const [user, setUser] = useState<Manager | null>(null);
  // En móvil el menú arranca cerrado: 208px de sidebar dejan la pantalla inservible
  const [sidebarColapsada, setSidebarColapsada] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  const [loading, setLoading] = useState(true);
  /** Contactos propios vencidos o que vencen esta semana. */
  const [pendientes, setPendientes] = useState(0);
  const [avisoVisible, setAvisoVisible] = useState(true);

  useEffect(() => {
    async function loadUser() {
      // Modo demo: sin login, con la cartera ficticia
      if (MODO_DEMO) {
        setUser({ ...USUARIO_DEMO });
        const finSemana = new Date();
        finSemana.setDate(
          finSemana.getDate() + (7 - (finSemana.getDay() === 0 ? 7 : finSemana.getDay()))
        );
        setPendientes(
          CONTACTOS.filter(
            (c) =>
              c.manager_id === USUARIO_DEMO.id &&
              c.estado !== 'pausa' &&
              c.next_touch !== null &&
              new Date(c.next_touch) <= finSemana
          ).length
        );
        setLoading(false);
        return;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }

      const { data: managerData } = await supabase
        .from('managers')
        .select('*')
        .eq('email', authUser.email)
        .single();

      if (!managerData) {
        alert('Tu email no está registrado como manager. Contacta al admin.');
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      setUser(managerData);

      // Alerta de cadencia: lo vencido más lo que vence hasta el domingo
      const hoy = new Date();
      const finSemana = new Date(hoy);
      finSemana.setDate(hoy.getDate() + (7 - (hoy.getDay() === 0 ? 7 : hoy.getDay())));
      const { count } = await supabase
        .from('contactos')
        .select('id', { count: 'exact', head: true })
        .eq('manager_id', managerData.id)
        .neq('estado', 'pausa')
        .lte('next_touch', finSemana.toISOString().slice(0, 10));
      setPendientes(count ?? 0);

      setLoading(false);
    }
    loadUser();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  // ¿Qué item del nav está activo?
  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ceramica">
        <div className="flex items-center gap-2 text-sm text-mbc/70">
          <span className="h-2 w-2 animate-pulse rounded-full bg-acento" />
          Cargando…
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-ceramica">
      {/* Topbar Pruno: la barra de marca de los decks */}
      <header className="bg-mbc px-4 py-2.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarColapsada(!sidebarColapsada)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            title="Mostrar/ocultar menú"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <LogoMBC invertido />
            <span className="text-sm font-semibold tracking-tight text-white truncate">
              Radar Comercial
            </span>
            <span className="hidden md:inline text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
              Minsait Business Consulting
            </span>
            {MODO_DEMO && (
              <span className="notch-sm bg-naranja px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Demo
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {/* Alcance de la vista: mi cartera vs. la del equipo */}
          <div className="inline-flex rounded-lg bg-white/10 p-0.5">
            {(['propia', 'total'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className="rounded-md px-3 py-1 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: scope === s ? '#1F6FEB' : 'transparent',
                  color: scope === s ? '#fff' : 'rgba(255,255,255,.7)',
                }}
              >
                {s === 'propia' ? 'Mi cartera' : 'Equipo'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-acento text-xs font-semibold text-white">
              {user?.iniciales}
            </span>
            <span className="hidden sm:inline text-xs font-medium text-white">{user?.nombre}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-white/60 hover:text-white transition-colors"
            title="Cerrar sesión"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Aviso de cadencia al entrar */}
      {pendientes > 0 && avisoVisible && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-acento px-4 py-2 text-center text-xs text-white">
          <span>
            Tienes <span className="font-bold">{pendientes}</span>{' '}
            {pendientes === 1 ? 'contacto que tocar' : 'contactos que tocar'} esta semana
          </span>
          <button
            onClick={() => router.push('/')}
            className="rounded-full bg-white/20 px-3 py-1 font-semibold hover:bg-white/30"
          >
            Ver la agenda
          </button>
          <button
            onClick={() => setAvisoVisible(false)}
            className="text-white/70 hover:text-white"
            aria-label="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {/* Layout: sidebar + contenido */}
      <div className="relative flex flex-1 md:overflow-hidden">
        {/* Velo para cerrar el menú en móvil */}
        {!sidebarColapsada && (
          <button
            onClick={() => setSidebarColapsada(true)}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-label="Cerrar menú"
          />
        )}
        {/* Sidebar */}
        <aside
          className="bg-mbc-900 transition-all duration-200 overflow-hidden flex-shrink-0 fixed bottom-0 left-0 top-[52px] z-50 md:static md:top-auto md:z-auto"
          style={{ width: sidebarColapsada ? '0px' : '208px' }}
        >
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const activo = isActive(item.href);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    router.push(item.href);
                    // En móvil el menú se cierra al navegar
                    if (window.innerWidth < 768) setSidebarColapsada(true);
                  }}
                  className={cx(
                    'group relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    activo
                      ? 'bg-white/10 font-semibold text-white'
                      : 'font-medium text-white/60 hover:bg-white/5 hover:text-white'
                  )}
                >
                  {/* marcador acento del ítem activo */}
                  <span
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full transition-opacity"
                    style={{ backgroundColor: '#1F6FEB', opacity: activo ? 1 : 0 }}
                  />
                  {item.icon}
                  <span className="whitespace-nowrap">{item.label}</span>
                  {/* Alerta de cadencia sobre el Radar */}
                  {item.id === 'agenda' && pendientes > 0 && (
                    <span className="ml-auto rounded-full bg-acento px-2 py-0.5 text-[10px] font-bold text-white">
                      {pendientes}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Contenido principal */}
        <main className="min-w-0 flex-1 md:overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}