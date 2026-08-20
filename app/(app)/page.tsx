'use client';

/**
 * Portada de la app: lo accionable de la semana. El dashboard pasó a /dashboard.
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useScope } from '@/lib/viewScope';
import ModalRegistrarAccion from '@/components/ModalRegistrarAccion';
import AgendaView from '@/components/agenda/AgendaView';
import type { Contacto, Manager } from '@/components/dashboard/DashboardView';

/** Cadencia de contacto por prioridad, igual que en ModalRegistrarAccion. */
const DIAS_POR_PRIORIDAD: Record<string, number> = { P1: 30, P2: 60, P3: 75 };

export default function AgendaPage() {
  const supabase = createClient();
  const { scope } = useScope();

  const [managerId, setManagerId] = useState<string | null>(null);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [managers, setManagers] = useState<Record<string, Manager>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<Contacto | null>(null);

  async function cargarContactos(mgrId: string | null, alcance: string) {
    let q = supabase
      .from('contactos')
      .select(
        'id, nombre, empresa, cargo, prioridad, next_touch, estado, pausa_hasta, oportunidad, manager_id, pais, cumple'
      );
    if (alcance === 'propia' && mgrId) q = q.eq('manager_id', mgrId);

    const { data, error: err } = await q;
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setContactos(data || []);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: yo } = await supabase
        .from('managers')
        .select('id')
        .eq('email', authUser.email)
        .single();

      const id = yo?.id ?? null;
      setManagerId(id);
      await cargarContactos(id, scope);

      const { data: mgrs } = await supabase.from('managers').select('id, nombre, iniciales');
      const mapa: Record<string, Manager> = {};
      mgrs?.forEach((m) => {
        mapa[m.id] = m;
      });
      setManagers(mapa);

      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, scope]);

  /** Registra el contacto y mueve la fecha del próximo según la prioridad. */
  async function marcarContactado(c: Contacto, medio: string) {
    if (!managerId) return;

    const hoyISO = new Date().toISOString().slice(0, 10);
    const dias = DIAS_POR_PRIORIDAD[c.prioridad] ?? 60;
    const proximo = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);

    const { error: errAct } = await supabase.from('actividades').insert({
      contacto_id: c.id,
      autor_id: managerId,
      tipo: medio,
      fecha: hoyISO,
      resultado: `Contacto registrado desde la agenda (${medio})`,
    });
    if (errAct) {
      setError(`No se pudo registrar la actividad: ${errAct.message}`);
      throw errAct;
    }

    const { error: errCon } = await supabase
      .from('contactos')
      .update({ last_touch: hoyISO, next_touch: proximo })
      .eq('id', c.id);
    if (errCon) {
      setError(
        `La actividad quedó registrada, pero no se movió el próximo contacto: ${errCon.message}`
      );
      throw errCon;
    }

    await cargarContactos(managerId, scope);
  }

  /** Mueve la fecha del próximo contacto sin registrar actividad. */
  async function posponer(c: Contacto, dias: number) {
    const nueva = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
    const { error: err } = await supabase
      .from('contactos')
      .update({ next_touch: nueva })
      .eq('id', c.id);
    if (err) {
      setError(`No se pudo posponer: ${err.message}`);
      throw err;
    }
    await cargarContactos(managerId, scope);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-mbc/70">
        <span className="h-2 w-2 animate-pulse rounded-full bg-acento" />
        Cargando tu semana…
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mx-auto max-w-[1180px] px-6 pt-6">
          <div
            className="notch px-4 py-3 text-sm text-white"
            style={{ backgroundColor: '#D64545' }}
            role="alert"
          >
            {error}
          </div>
        </div>
      )}

      <AgendaView
        contactos={contactos}
        managers={managers}
        onMarcarContactado={marcarContactado}
        onRegistrarAccion={setSeleccionado}
        onPosponer={posponer}
      />

      {seleccionado && managerId && (
        <ModalRegistrarAccion
          contactoId={seleccionado.id}
          contactoNombre={seleccionado.nombre}
          contactoCargo={seleccionado.cargo || ''}
          contactoEmpresa={seleccionado.empresa}
          contactoPrioridad={seleccionado.prioridad}
          contactoOportunidad={seleccionado.oportunidad || ''}
          autorId={managerId}
          autorNombre=""
          onClose={() => setSeleccionado(null)}
          onSaved={() => cargarContactos(managerId, scope)}
        />
      )}
    </>
  );
}
