/**
 * Datos sintéticos para el modo demo. No salen de la base real:
 * sirven para recorrer toda la app sin credenciales y para enseñar
 * la herramienta sin exponer la cartera.
 */

import type {
  Actividad,
  Contacto,
  Manager,
  Proyecto,
} from '@/components/dashboard/DashboardView';

/** Contacto con todos los campos que usan la ficha y los listados. */
export type ContactoDemo = Contacto & {
  /** En los datos demo el cumpleaños siempre viene definido (aunque sea null) */
  cumple: string | null;
  area: string | null;
  email: string | null;
  telefono: string | null;
  notas: string | null;
  last_touch: string | null;
};

export type ManagerDemo = Manager & {
  email: string;
  rol: string;
  activo: boolean;
  es_admin: boolean;
};

export type ProyectoDemo = Proyecto & { contacto_id: string };

const hoy = new Date();
const enDias = (d: number) => new Date(hoy.getTime() + d * 86400000).toISOString();

export const MANAGERS_LISTA: ManagerDemo[] = [
  {
    id: 'm1',
    nombre: 'Nelson Bernal',
    iniciales: 'NB',
    email: 'nelson.bernal@demo.mbc',
    rol: 'Gerente',
    activo: true,
    es_admin: true,
  },
  {
    id: 'm2',
    nombre: 'Andrea Salas',
    iniciales: 'AS',
    email: 'andrea.salas@demo.mbc',
    rol: 'Manager',
    activo: true,
    es_admin: false,
  },
  {
    id: 'm3',
    nombre: 'Diego Ferrand',
    iniciales: 'DF',
    email: 'diego.ferrand@demo.mbc',
    rol: 'Consultor senior',
    activo: true,
    es_admin: false,
  },
];

export const MANAGERS: Record<string, Manager> = Object.fromEntries(
  MANAGERS_LISTA.map((m) => [m.id, { id: m.id, nombre: m.nombre, iniciales: m.iniciales }])
);

/** Usuario con el que se entra en modo demo. */
export const USUARIO_DEMO = MANAGERS_LISTA[0];

type Fila = [string, string, string, string, string, number, string, string | null, string, string];

const FILAS: Fila[] = [
  ['Rosa Melgarejo', 'Alpayana', 'Cadena de Suministro', 'Gerente de Cadena de Suministro', 'P1', -22, 'activo', 'Data maestra de materiales', 'm1', 'Perú'],
  ['Luis Pareja', 'Inca Rail', 'Finanzas', 'CFO', 'P1', -14, 'activo', 'Brechas documentales ERP', 'm1', 'Perú'],
  ['Marcela Ruiz', 'Telered', 'Tecnología', 'Directora de Tecnología', 'P1', -9, 'activo', 'Squad de IA', 'm2', 'Panamá'],
  ['Jorge Salinas', 'Amcor', 'Datos', 'Head of Data', 'P2', -3, 'activo', 'Gobierno del dato maestro', 'm2', 'Perú'],
  ['Patricia Núñez', 'Minera Poderosa', 'Planeamiento', 'Gerente de Planeamiento', 'P1', 2, 'activo', null, 'm3', 'Perú'],
  ['Carlos Yactayo', 'Belcorp', 'Analytics', 'Analytics Lead', 'P2', 6, 'activo', 'Business Data Hub', 'm1', 'Perú'],
  ['Elena Torres', 'Pacífico Salud', 'Operaciones', 'Gerente de Operaciones', 'P1', 11, 'activo', 'Optimización de procesos core', 'm3', 'Perú'],
  ['Raúl Campos', 'Niubiz', 'Producto', 'Gerente de Producto', 'P3', 24, 'activo', null, 'm2', 'Perú'],
  ['Sofía Ramírez', 'Stracon', 'Innovación', 'Gerente de Innovación', 'P2', 38, 'activo', 'Impulso IA', 'm3', 'Perú'],
  ['Miguel Ángel Paz', 'Ferreycorp', 'Abastecimiento', 'Jefe de Abastecimiento', 'P2', 45, 'activo', null, 'm1', 'Perú'],
  ['Ana Lucía Vega', 'Interbank', 'Transformación', 'Gerente de Transformación', 'P1', 0, 'pausa', null, 'm2', 'Perú'],
  ['Fernando Ojeda', 'Cementos Pacasmayo', 'Sistemas', 'CIO', 'P2', 0, 'pausa', null, 'm3', 'Perú'],
  ['Gonzalo Ríos', 'Alpayana', 'Finanzas', 'Gerente de Finanzas', 'P2', 9, 'activo', null, 'm2', 'Perú'],
  ['Claudia Benites', 'Pacífico Salud', 'Sistemas', 'Jefa de Sistemas', 'P3', 30, 'activo', null, 'm3', 'Perú'],
];

/** Cumpleaños ficticios: mismo día/mes que dentro de N días, con año de nacimiento. */
const cumpleEn = (d: number) => {
  const f = new Date(hoy.getTime() + d * 86400000);
  return new Date(1979, f.getMonth(), f.getDate()).toISOString().slice(0, 10);
};
const CUMPLES: Record<number, string> = {
  0: cumpleEn(2),
  2: cumpleEn(6),
  5: cumpleEn(19),
  8: cumpleEn(28),
  12: cumpleEn(1),
};

const NOTAS: Record<number, string> = {
  0: 'Muy directa. Prefiere WhatsApp a correo.',
  1: 'Pide siempre el detalle económico por fase antes de comprometerse.',
  4: 'Acaba de asumir el cargo; está armando su equipo.',
};

const soloLetras = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

export const CONTACTOS: ContactoDemo[] = FILAS.map(
  ([nombre, empresa, area, cargo, prioridad, dias, estado, oportunidad, manager_id, pais], i) => ({
    id: `c${i + 1}`,
    nombre,
    empresa,
    area,
    cargo,
    prioridad,
    last_touch: enDias(dias - (prioridad === 'P1' ? 30 : prioridad === 'P2' ? 60 : 75)),
    next_touch: estado === 'pausa' ? null : enDias(dias),
    estado,
    pausa_hasta: estado === 'pausa' ? enDias(30) : null,
    oportunidad,
    manager_id,
    pais,
    cumple: CUMPLES[i] ?? null,
    email: `${soloLetras(nombre.split(' ')[0])}.${soloLetras(nombre.split(' ')[1] ?? '')}@${soloLetras(empresa)}.com`,
    telefono: `+51 9${String(10000000 + i * 1111111).slice(0, 8)}`,
    notas: NOTAS[i] ?? null,
  })
);

const TIPOS = [
  'Reunión virtual',
  'Email',
  'Llamada',
  'WhatsApp',
  'Reunión presencial',
  'Mensaje LinkedIn',
];

const RESULTADOS = [
  'Presentamos el enfoque y quedaron de revisarlo internamente.',
  'Pidió propuesta económica desglosada por fase.',
  'Confirmó presupuesto para el próximo trimestre.',
  'Sin respuesta todavía, insistir la próxima semana.',
  'Nos derivó al área usuaria para levantar requerimientos.',
  'Interesado en el caso de otro cliente del sector.',
];

const PASOS: Array<string | null> = [
  'Enviar propuesta ajustada antes del viernes.',
  'Agendar sesión con el área usuaria.',
  'Compartir el caso de referencia del sector.',
  null,
];

// Serie determinista: 6 meses con volumen creciente, sin aleatoriedad.
// Los autores se cruzan a propósito para que se vean cuentas compartidas.
export const ACTIVIDADES: Actividad[] = [];
[9, 14, 12, 19, 23, 17].forEach((cantidad, mesIdx) => {
  const esMesActual = mesIdx === 5;
  for (let i = 0; i < cantidad; i++) {
    const dia = esMesActual ? Math.min(((i * 3) % 27) + 1, hoy.getDate()) : ((i * 3) % 27) + 1;
    const f = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - mesIdx), dia);
    const contacto = CONTACTOS[(i * 5 + mesIdx * 2) % CONTACTOS.length];
    // La mayoría las registra el dueño del contacto; algunas, un colega
    const colega = (i + mesIdx) % 4 === 0;
    ACTIVIDADES.push({
      id: `a${mesIdx}-${i}`,
      fecha: f.toISOString(),
      tipo: TIPOS[(i * 2 + mesIdx) % TIPOS.length],
      contacto_id: contacto.id,
      autor_id: colega ? `m${(Number(contacto.manager_id.slice(1)) % 3) + 1}` : contacto.manager_id,
      resultado: RESULTADOS[(i + mesIdx) % RESULTADOS.length],
      proximos_pasos: PASOS[(i + mesIdx) % PASOS.length],
    });
  }
});

const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime();
export const ACTIVIDADES_PERIODO = ACTIVIDADES.filter(
  (a) => new Date(a.fecha).getTime() >= inicioMes
);

export const PROYECTOS: ProyectoDemo[] = [
  { id: 'p1', nombre: 'Data maestra de materiales', contacto_id: 'c1', monto: 28000, fecha_cierre: enDias(-12), estado: 'ganado', manager_id: 'm1' },
  { id: 'p2', nombre: 'Squad de IA — Ola 1', contacto_id: 'c3', monto: 96000, fecha_cierre: enDias(-6), estado: 'ganado', manager_id: 'm2' },
  { id: 'p3', nombre: 'Assessment ERP', contacto_id: 'c2', monto: 9000, fecha_cierre: enDias(-2), estado: 'ganado', manager_id: 'm1' },
  { id: 'p4', nombre: 'Gobierno del dato maestro', contacto_id: 'c4', monto: 42000, fecha_cierre: enDias(-95), estado: 'ganado', manager_id: 'm2' },
  { id: 'p5', nombre: 'Optimización de procesos core', contacto_id: 'c7', monto: 130000, fecha_cierre: enDias(-160), estado: 'ganado', manager_id: 'm3' },
  { id: 'p6', nombre: 'Business Data Hub 2026', contacto_id: 'c6', monto: 78000, fecha_cierre: enDias(-220), estado: 'ganado', manager_id: 'm1' },
  { id: 'p7', nombre: 'Impulso IA — diagnóstico', contacto_id: 'c9', monto: 15000, fecha_cierre: enDias(-40), estado: 'ganado', manager_id: 'm3' },
];
