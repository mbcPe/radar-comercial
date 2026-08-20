'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import PlantillasView, { type ContactoLigero } from '@/components/plantillas/PlantillasView';
import { MODO_DEMO } from '@/lib/modoDemo';
import { CONTACTOS, USUARIO_DEMO } from '@/lib/demoData';

export default function PlantillasPage() {
  const supabase = createClient();
  const [contactos, setContactos] = useState<ContactoLigero[]>([]);
  const [consultor, setConsultor] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (MODO_DEMO) {
        setConsultor(USUARIO_DEMO.nombre);
        setContactos([...CONTACTOS].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setLoading(false);
        return;
      }

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: me } = await supabase
        .from('managers')
        .select('nombre')
        .eq('email', authUser.email)
        .single();
      if (me) setConsultor(me.nombre);

      const { data: cs } = await supabase
        .from('contactos')
        .select('id, nombre, empresa, cargo, email, telefono, oportunidad')
        .order('nombre');
      setContactos(cs || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-mbc/70">
        <span className="h-2 w-2 animate-pulse rounded-full bg-acento" />
        Cargando plantillas…
      </div>
    );
  }

  return <PlantillasView contactos={contactos} consultor={consultor} />;
}
