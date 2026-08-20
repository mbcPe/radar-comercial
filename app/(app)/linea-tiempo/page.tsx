'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useScope } from '@/lib/viewScope';
import TimelineView from '@/components/timeline/TimelineView';
import { MODO_DEMO } from '@/lib/modoDemo';
import { ACTIVIDADES, CONTACTOS, MANAGERS, USUARIO_DEMO } from '@/lib/demoData';
import type { Actividad, Contacto, Manager } from '@/components/dashboard/DashboardView';

export default function LineaTiempoPage() {
  const supabase = createClient();
  const { scope } = useScope();
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [managers, setManagers] = useState<Record<string, Manager>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      if (MODO_DEMO) {
        const propios =
          scope === 'propia'
            ? CONTACTOS.filter((c) => c.manager_id === USUARIO_DEMO.id)
            : CONTACTOS;
        const ids = new Set(propios.map((c) => c.id));
        setContactos(propios);
        setActividades(ACTIVIDADES.filter((a) => ids.has(a.contacto_id)));
        setManagers(MANAGERS);
        setLoading(false);
        return;
      }

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: me } = await supabase
        .from('managers')
        .select('id')
        .eq('email', authUser.email)
        .single();

      let q = supabase
        .from('contactos')
        .select(
          'id, nombre, empresa, cargo, prioridad, next_touch, estado, pausa_hasta, oportunidad, manager_id, pais, cumple'
        );
      // La vista compartida existe para ver la historia completa, pero respetamos
      // el alcance elegido en la barra superior.
      if (scope === 'propia' && me) q = q.eq('manager_id', me.id);

      const { data: cs } = await q;
      const lista = cs || [];
      setContactos(lista);

      if (lista.length > 0) {
        const { data: acts } = await supabase
          .from('actividades')
          .select('id, fecha, tipo, contacto_id, autor_id, resultado, proximos_pasos')
          .in(
            'contacto_id',
            lista.map((c) => c.id)
          )
          .order('fecha', { ascending: false });
        setActividades(acts || []);
      } else {
        setActividades([]);
      }

      const { data: mgrs } = await supabase.from('managers').select('id, nombre, iniciales');
      const mapa: Record<string, Manager> = {};
      mgrs?.forEach((m) => {
        mapa[m.id] = m;
      });
      setManagers(mapa);

      setLoading(false);
    }
    load();
  }, [supabase, scope]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-mbc/70">
        <span className="h-2 w-2 animate-pulse rounded-full bg-acento" />
        Cargando historia de relaciones…
      </div>
    );
  }

  return <TimelineView actividades={actividades} contactos={contactos} managers={managers} />;
}
