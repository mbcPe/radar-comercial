'use client';

/**
 * Vista de diseño con datos ficticios. Sirve para revisar la UI sin credenciales
 * de Supabase y para enseñar la herramienta sin exponer la cartera real.
 * No consulta la base de datos. Se puede borrar sin afectar la app.
 */

import Link from 'next/link';
import DashboardView from '@/components/dashboard/DashboardView';
import {
  ACTIVIDADES,
  ACTIVIDADES_PERIODO,
  CONTACTOS,
  MANAGERS,
  PROYECTOS,
} from '@/lib/demoData';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-ceramica">
      <div className="flex flex-wrap items-center justify-center gap-3 bg-mbc px-4 py-2 text-center text-xs text-white">
        <span>
          Vista de diseño con <span className="font-semibold text-acento-200">datos ficticios</span> ·
          no consulta la base de datos real
        </span>
        <Link
          href="/demo/linea-tiempo"
          className="rounded-full bg-white/10 px-3 py-1 font-semibold hover:bg-acento"
        >
          Ver línea de tiempo →
        </Link>
      </div>
      <DashboardView
        contactos={CONTACTOS}
        actividades={ACTIVIDADES}
        actividadesPeriodo={ACTIVIDADES_PERIODO}
        proyectos={PROYECTOS}
        managers={MANAGERS}
        // En la demo el check no escribe en base: solo muestra el flujo
        onMarcarContactado={async () => {
          await new Promise((r) => setTimeout(r, 250));
        }}
      />
    </div>
  );
}
