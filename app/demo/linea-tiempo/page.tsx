'use client';

/** Línea de tiempo con datos ficticios: revisar diseño sin credenciales de Supabase. */

import TimelineView from '@/components/timeline/TimelineView';
import { ACTIVIDADES, CONTACTOS, MANAGERS } from '@/lib/demoData';

export default function DemoLineaTiempoPage() {
  return (
    <div className="min-h-screen bg-ceramica">
      <div className="bg-mbc px-4 py-2 text-center text-xs text-white">
        Vista de diseño con <span className="font-semibold text-acento-200">datos ficticios</span> ·
        no consulta la base de datos real
      </div>
      <TimelineView actividades={ACTIVIDADES} contactos={CONTACTOS} managers={MANAGERS} />
    </div>
  );
}
