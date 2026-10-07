'use client';

/**
 * Portada de la app: lo accionable de la semana. El dashboard pasó a /dashboard.
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useScope } from '@/lib/viewScope';
import ModalRegistrarAccion from '@/components/ModalRegistrarAccion';
import ModalEditarContacto from '@/components/ModalEditarContacto';
import { hoyISO, sugerirProximo, sumarDias } from '@/lib/cartera';
import AgendaView from '@/components/agenda/AgendaView';
import type { Contacto, Manager } from '@/components/dashboard/DashboardView';

export default function AgendaPage() {
  const supabase = createClient();
  const { scope } = useScope();

  const [managerId, setManagerId] = useState<string | null>(null);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [managers, setManagers] = useState<Record<string, Manager>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<{ c: Contacto; medio?: string } | null>(null);
  /** Contacto cuyos datos se editan tras registrar la acción. */
  const [editandoId, setEditandoId] = useState<string | null>(null);

  async function cargarContactos(mgrId: string | null, alcance: string) {
    let q = supabase
      .from('contactos')
      .select(
        'id, nombre, empresa, cargo, prioridad, next_touch, estado, pausa_hasta, oportunidad, manager_id, pais, cumple'
      )
      .neq('archivado', true);
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

    const hoy = hoyISO();
    const proximo = sugerirProximo(c.prioridad, hoy);

    const { error: errAct } = await supabase.from('actividades').insert({
      contacto_id: c.id,
      autor_id: managerId,
      tipo: medio,
      fecha: hoy,
      resultado: `Contacto registrado desde la agenda (${medio})`,
    });
    if (errAct) {
      setError(`No se pudo registrar la actividad: ${errAct.message}`);
      throw errAct;
    }

    const { error: errCon } = await supabase
      .from('contactos')
      .update({ last_touch: hoy, next_touch: proximo })
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
    const nueva = sumarDias(dias);
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
        onRegistrarAccion={(c, medio) => setSeleccionado({ c, medio })}
        onPosponer={posponer}
      />

      {seleccionado && managerId && (
        <ModalRegistrarAccion
          contactoId={seleccionado.c.id}
          contactoNombre={seleccionado.c.nombre}
          contactoCargo={seleccionado.c.cargo || ''}
          contactoEmpresa={seleccionado.c.empresa}
          contactoPrioridad={seleccionado.c.prioridad}
          contactoOportunidad={seleccionado.c.oportunidad || ''}
          autorId={managerId}
          autorNombre=""
          tipoInicial={seleccionado.medio}
          onClose={() => setSeleccionado(null)}
          onSaved={() => cargarContactos(managerId, scope)}
          onEditarContacto={() => setEditandoId(seleccionado.c.id)}
        />
      )}

      {editandoId && (
        <ModalEditarContacto
          isOpen
          contacto={{ id: editandoId }}
          onClose={() => setEditandoId(null)}
          onSuccess={() => cargarContactos(managerId, scope)}
        />
      )}
    </>
  );
}
