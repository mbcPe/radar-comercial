'use client';

/** Plantillas con datos ficticios: revisar la sección sin credenciales de Supabase. */

import PlantillasView, { type ContactoLigero } from '@/components/plantillas/PlantillasView';
import { CONTACTOS } from '@/lib/demoData';

// Teléfonos y correos inventados, solo para probar los botones de WhatsApp y correo
const CONTACTOS_DEMO: ContactoLigero[] = CONTACTOS.map((c, i) => ({
  id: c.id,
  nombre: c.nombre,
  empresa: c.empresa,
  cargo: c.cargo,
  oportunidad: c.oportunidad,
  telefono: `+51 9${String(10000000 + i * 111111).slice(0, 8)}`,
  email: `${c.nombre.toLowerCase().split(' ')[0]}.demo@${c.empresa
    .toLowerCase()
    .replace(/[^a-z]/g, '')}.com`,
}));

export default function DemoPlantillasPage() {
  return (
    <div className="min-h-screen bg-ceramica">
      <div className="bg-mbc px-4 py-2 text-center text-xs text-white">
        Vista de diseño con <span className="font-semibold text-acento-200">datos ficticios</span> ·
        no consulta la base de datos real
      </div>
      <PlantillasView contactos={CONTACTOS_DEMO} consultor="Nelson Bernal" />
    </div>
  );
}
