'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { MODO_DEMO } from '@/lib/modoDemo';
import { CONTACTOS, PROYECTOS } from '@/lib/demoData';

type Contacto = {
  id: string;
  nombre: string;
  empresa: string;
};

type Proyecto = {
  id: string;
  nombre: string;
  contacto_id: string;
  monto: number | null;
  fecha_cierre: string;
};

type RankingItem = {
  contacto: Contacto;
  count: number;
  monto: number;
};

function formatearMonto(n: number): string {
  if (n === 0) return '$0';
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  return '$' + (n / 1000).toFixed(0) + 'K';
}

function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ProyectosPage() {
  const supabase = createClient();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [contactos, setContactos] = useState<Record<string, Contacto>>({});
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (MODO_DEMO) {
        const provs = [...PROYECTOS].sort(
          (a, b) => new Date(b.fecha_cierre).getTime() - new Date(a.fecha_cierre).getTime()
        );
        setProyectos(provs);
        const mapa = Object.fromEntries(CONTACTOS.map((c) => [c.id, c]));
        setContactos(mapa);
        const porContacto: Record<string, { count: number; monto: number }> = {};
        provs.forEach((p) => {
          porContacto[p.contacto_id] ??= { count: 0, monto: 0 };
          porContacto[p.contacto_id].count++;
          porContacto[p.contacto_id].monto += p.monto || 0;
        });
        setRanking(
          Object.entries(porContacto)
            .map(([cid, d]) => ({ contacto: mapa[cid], count: d.count, monto: d.monto }))
            .filter((r) => r.contacto)
            .sort((a, b) => b.monto - a.monto)
        );
        setLoading(false);
        return;
      }

      // Cargar todos los proyectos
      const { data: proyectosData } = await supabase
        .from('proyectos')
        .select('id, nombre, contacto_id, monto, fecha_cierre')
        .order('fecha_cierre', { ascending: false });

      const provs = proyectosData || [];
      setProyectos(provs);

      if (provs.length === 0) {
        setLoading(false);
        return;
      }

      // Cargar contactos referenciados
      const contactoIds = [...new Set(provs.map(p => p.contacto_id))];
      const { data: contactosData } = await supabase
        .from('contactos')
        .select('id, nombre, empresa')
        .in('id', contactoIds);

      const mapContactos: Record<string, Contacto> = {};
      contactosData?.forEach(c => { mapContactos[c.id] = c; });
      setContactos(mapContactos);

      // Calcular ranking de contactos por monto cerrado
      const porContacto: Record<string, { count: number; monto: number }> = {};
      provs.forEach(p => {
        if (!porContacto[p.contacto_id]) {
          porContacto[p.contacto_id] = { count: 0, monto: 0 };
        }
        porContacto[p.contacto_id].count++;
        porContacto[p.contacto_id].monto += p.monto || 0;
      });

      const rankingArray: RankingItem[] = Object.entries(porContacto)
        .map(([cid, data]) => ({
          contacto: mapContactos[cid],
          count: data.count,
          monto: data.monto,
        }))
        .filter(r => r.contacto) // por si algún contacto fue borrado
        .sort((a, b) => b.monto - a.monto);

      setRanking(rankingArray);
      setLoading(false);
    }

    loadData();
  }, [supabase]);

  if (loading) {
    return <div className="p-6 text-tinta text-sm">Cargando proyectos...</div>;
  }

  const totalMonto = proyectos.reduce((sum, p) => sum + (p.monto || 0), 0);
  const contactosProductivos = ranking.length;
  const contactosOro = ranking.filter(r => r.count >= 2).length;

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-mbc mb-1">Proyectos ganados</h2>
      <p className="text-sm text-tinta mb-6">Negocio cerrado del equipo</p>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-ceramica border border-ceramica-300 rounded-md p-3">
          <div className="text-[10px] font-medium text-tinta uppercase tracking-wide mb-1">Proyectos</div>
          <div className="text-2xl font-medium text-mbc">{proyectos.length}</div>
          <div className="text-xs text-arena mt-0.5">total histórico</div>
        </div>
        <div className="bg-ceramica border border-ceramica-300 rounded-md p-3">
          <div className="text-[10px] font-medium text-tinta uppercase tracking-wide mb-1">Monto cerrado</div>
          <div className="text-2xl font-medium" style={{ color: '#2E9E5B' }}>{formatearMonto(totalMonto)}</div>
          <div className="text-xs text-arena mt-0.5">acumulado</div>
        </div>
        <div className="bg-ceramica border border-ceramica-300 rounded-md p-3">
          <div className="text-[10px] font-medium text-tinta uppercase tracking-wide mb-1">Productivos</div>
          <div className="text-2xl font-medium text-mbc">{contactosProductivos}</div>
          <div className="text-xs text-arena mt-0.5">contactos con 1+</div>
        </div>
        <div className="bg-ceramica border border-ceramica-300 rounded-md p-3">
          <div className="text-[10px] font-medium text-tinta uppercase tracking-wide mb-1">De oro</div>
          <div className="text-2xl font-medium" style={{ color: '#E58413' }}>{contactosOro}</div>
          <div className="text-xs text-arena mt-0.5">contactos con 2+</div>
        </div>
      </div>

      {proyectos.length === 0 ? (
        <div className="bg-white border border-ceramica-300 rounded-xl p-12 text-center">
          <p className="text-sm text-tinta">Aún no hay proyectos cerrados.</p>
          <p className="text-xs text-arena mt-1">Cuando registres uno desde la ficha de un contacto, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top contactos de oro */}
          <div className="bg-white border border-ceramica-300 rounded-xl p-4">
            <h3 className="text-sm font-medium text-mbc mb-3">Top contactos de oro</h3>
            <div className="space-y-2">
              {ranking.slice(0, 8).map((r, idx) => {
                const esOro = r.count >= 2;
                return (
                  <div key={r.contacto.id} className="flex items-center gap-3 py-1">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                      style={{
                        backgroundColor: esOro ? '#FDF0E1' : '#F3F4F6',
                        color: esOro ? '#9A5400' : '#374151',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <div className="text-sm">
                          <span className="font-medium text-mbc">{r.contacto.nombre}</span>
                          {esOro && (
                            <span className="ml-1.5" style={{ color: '#E58413' }}>⭐</span>
                          )}
                          <div className="text-xs text-arena">{r.contacto.empresa}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-mbc">{formatearMonto(r.monto)}</div>
                          <div className="text-xs text-arena">
                            {r.count} {r.count === 1 ? 'proyecto' : 'proyectos'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Últimos cerrados */}
          <div className="bg-white border border-ceramica-300 rounded-xl p-4">
            <h3 className="text-sm font-medium text-mbc mb-3">Últimos cerrados</h3>
            <div className="space-y-2">
              {proyectos.slice(0, 6).map(p => {
                const c = contactos[p.contacto_id];
                return (
                  <div key={p.id} className="border border-ceramica-300 rounded-md p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-medium text-sm text-mbc">{p.nombre}</div>
                      <div className="font-medium text-sm" style={{ color: '#2E9E5B' }}>
                        {formatearMonto(p.monto || 0)}
                      </div>
                    </div>
                    {c && (
                      <div className="text-xs text-arena mt-1">
                        {c.nombre} · {c.empresa} · {formatearFecha(p.fecha_cierre)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}