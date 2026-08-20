'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

type Props = {
  contactoId: string;
  contactoNombre: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function ModalPausar({ contactoId, contactoNombre, onClose, onSaved }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Por defecto, reactivar en 2 meses
  const en2meses = new Date();
  en2meses.setMonth(en2meses.getMonth() + 2);
  const fechaSugerida = en2meses.toISOString().slice(0, 10);

  const [pausaHasta, setPausaHasta] = useState(fechaSugerida);
  const [motivo, setMotivo] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase
      .from('contactos')
      .update({
        estado: 'pausa',
        pausa_hasta: pausaHasta,
        pausa_motivo: motivo || null,
      })
      .eq('id', contactoId);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-ceramica-300 flex items-center justify-between">
          <h2 className="text-base font-medium text-mbc">Pausar seguimiento</h2>
          <button onClick={onClose} className="text-arena hover:text-mbc text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-tinta mb-4">
            <span className="font-medium text-mbc">{contactoNombre}</span> dejará de aparecer en alertas hasta la fecha que selecciones.
          </p>

          <div className="mb-4">
            <label className="block text-xs font-medium text-tinta mb-1">Reactivar a partir de *</label>
            <input
              type="date"
              required
              value={pausaHasta}
              onChange={(e) => setPausaHasta(e.target.value)}
              className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-sm text-mbc focus:outline-none focus:ring-2"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-tinta mb-1">Motivo (opcional)</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 border border-ceramica-300 rounded-md text-sm text-mbc focus:outline-none focus:ring-2 min-h-[80px] resize-y"
              placeholder="Ej. cliente solicitó retomar en Q3"
            />
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2 mb-4">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-ceramica-300">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-tinta bg-white border border-ceramica-300 rounded-md hover:bg-ceramica">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#A62222' }}>
              {loading ? 'Guardando...' : 'Pausar seguimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}