'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useScope } from '@/lib/viewScope';

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
    id: 'radar',
    label: 'Radar Comercial',
    href: '/',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="2" />
        <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
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
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { scope, setScope } = useScope();
  const [user, setUser] = useState<Manager | null>(null);
  const [sidebarColapsada, setSidebarColapsada] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-700 text-sm">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Topbar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarColapsada(!sidebarColapsada)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-700"
            title="Mostrar/ocultar menú"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <h1 className="text-base font-medium" style={{ color: '#9C0C54' }}>
            MINSAIT BUSINESS CONSULTING
          </h1>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-800">
          {/* Toggle Vista propia / Vista total */}
          <div className="inline-flex border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setScope('propia')}
              className="px-3 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: scope === 'propia' ? '#9C0C54' : 'white',
                color: scope === 'propia' ? 'white' : '#374151',
              }}
            >
              Vista propia
            </button>
            <button
              onClick={() => setScope('total')}
              className="px-3 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: scope === 'total' ? '#9C0C54' : 'white',
                color: scope === 'total' ? 'white' : '#374151',
              }}
            >
              Vista total
            </button>
          </div>

          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
            style={{ backgroundColor: '#9C0C54' }}
          >
            {user?.iniciales}
          </div>
          <span className="font-medium hidden sm:inline">{user?.nombre}</span>
          <button onClick={handleLogout} className="text-gray-700 hover:text-gray-900 text-xs ml-2 underline">
            Salir
          </button>
        </div>
      </header>

      {/* Layout: sidebar + contenido */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="bg-white border-r border-gray-200 transition-all duration-200 overflow-hidden flex-shrink-0"
          style={{ width: sidebarColapsada ? '0px' : '200px' }}
        >
          <nav className="p-3 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const activo = isActive(item.href);
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
                  style={{
                    backgroundColor: activo ? '#FBEAF0' : 'transparent',
                    color: activo ? '#9C0C54' : '#374151',
                    fontWeight: activo ? 500 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!activo) e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    if (!activo) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {item.icon}
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}