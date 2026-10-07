#!/usr/bin/env node
/**
 * Carga un respaldo JSON del Radar (Equipo > Descargar respaldo) en la base D1.
 *
 *   node scripts/cargar-respaldo.mjs <respaldo.json>                 → solo revisa y genera el SQL
 *   node scripts/cargar-respaldo.mjs <respaldo.json> --local --aplicar
 *   node scripts/cargar-respaldo.mjs <respaldo.json> --remote --aplicar
 *
 * Reglas para no perder nada:
 * - INSERT OR IGNORE: una fila que ya existe (mismo id) no se sobreescribe.
 * - Columnas del respaldo que D1 no tiene se crean (ALTER TABLE), no se descartan.
 * - Si alguien ya entró antes de la carga, Access lo dio de alta con otro id:
 *   se reasigna ese manager (y lo que registró) al id del respaldo, por email.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const ESQUEMA = {
  managers: ['id', 'nombre', 'iniciales', 'email', 'rol', 'activo', 'es_admin', 'created_at'],
  contactos: [
    'id', 'nombre', 'empresa', 'area', 'cargo', 'email', 'telefono', 'cumple', 'pais',
    'prioridad', 'last_touch', 'next_touch', 'estado', 'pausa_hasta', 'pausa_motivo',
    'oportunidad', 'notas', 'manager_id', 'created_at', 'archivado', 'archivado_en',
  ],
  actividades: [
    'id', 'contacto_id', 'autor_id', 'tipo', 'fecha', 'resultado', 'proximos_pasos', 'created_at',
    'pasos_hecho', 'pasos_hecho_en', 'editado_en',
  ],
  proyectos: ['id', 'nombre', 'contacto_id', 'monto', 'fecha_cierre', 'estado', 'manager_id', 'notas', 'created_at'],
};
// Orden de carga: primero el equipo, luego lo que lo referencia
const ORDEN = ['managers', 'contactos', 'actividades', 'proyectos'];
const NOMBRE_VALIDO = /^[a-z_][a-z0-9_]*$/i;

const args = process.argv.slice(2);
const archivo = args.find((a) => !a.startsWith('--'));
const aplicar = args.includes('--aplicar');
const destino = args.includes('--remote') ? '--remote' : '--local';

if (!archivo) {
  console.error('Uso: node scripts/cargar-respaldo.mjs <respaldo.json> [--local|--remote] [--aplicar]');
  process.exit(1);
}

let respaldo;
try {
  respaldo = JSON.parse(readFileSync(archivo, 'utf8'));
} catch (e) {
  console.error(`No pude leer el respaldo "${archivo}": ${e.message}`);
  process.exit(1);
}
if (!respaldo?.datos || typeof respaldo.datos !== 'object') {
  console.error('El archivo no tiene el formato de respaldo del Radar (falta "datos").');
  process.exit(1);
}

const q = (v) => {
  if (v === undefined || v === null) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return `'${s.replace(/'/g, "''")}'`;
};

const sql = [];
const resumen = [];
const avisos = [];

for (const tabla of ORDEN) {
  const filas = Array.isArray(respaldo.datos[tabla]) ? respaldo.datos[tabla] : [];
  const conocidas = new Set(ESQUEMA[tabla]);
  const extra = new Set();
  for (const f of filas) for (const c of Object.keys(f)) if (!conocidas.has(c)) extra.add(c);

  for (const c of extra) {
    if (!NOMBRE_VALIDO.test(c)) {
      avisos.push(`${tabla}.${c}: nombre de columna no válido, se omite`);
      continue;
    }
    // ADD COLUMN falla si ya existe (carga repetida): el ejecutor lo tolera abajo
    sql.push(`-- columna nueva desde el respaldo\nALTER TABLE ${tabla} ADD COLUMN ${c} TEXT;`);
    avisos.push(`${tabla}.${c}: no existía en D1, se crea para no perder el dato`);
  }

  let sinId = 0;
  for (const f of filas) {
    if (!f.id) {
      sinId++;
      continue;
    }
    const cols = Object.keys(f).filter((c) => conocidas.has(c) || (extra.has(c) && NOMBRE_VALIDO.test(c)));

    if (tabla === 'managers' && f.email) {
      const id = q(f.id);
      const email = q(f.email);
      const viejo = `(SELECT id FROM managers WHERE email = ${email} COLLATE NOCASE AND id <> ${id})`;
      sql.push(
        `UPDATE contactos SET manager_id = ${id} WHERE manager_id = ${viejo};`,
        `UPDATE proyectos SET manager_id = ${id} WHERE manager_id = ${viejo};`,
        `UPDATE actividades SET autor_id = ${id} WHERE autor_id = ${viejo};`,
        `UPDATE managers SET id = ${id} WHERE email = ${email} COLLATE NOCASE AND id <> ${id};`
      );
    }
    sql.push(`INSERT OR IGNORE INTO ${tabla} (${cols.join(', ')}) VALUES (${cols.map((c) => q(f[c])).join(', ')});`);
  }
  if (sinId) avisos.push(`${tabla}: ${sinId} filas sin id, se omiten`);
  resumen.push({ tabla, filas: filas.length, esperado: respaldo.filas?.[tabla] ?? '—' });
}

const salida = join('.wrangler', `carga-${basename(archivo, '.json')}.sql`);
writeFileSync(salida, sql.join('\n') + '\n', 'utf8');

console.log(`\nRespaldo: ${archivo}`);
console.log(`Generado: ${respaldo.generado ?? '¿?'} · origen: ${respaldo.origen ?? '¿?'}\n`);
console.table(resumen);
for (const t of resumen) {
  if (t.esperado !== '—' && t.esperado !== t.filas) {
    console.warn(`⚠ ${t.tabla}: el respaldo declara ${t.esperado} filas pero trae ${t.filas}. Revisa el archivo.`);
  }
}
avisos.forEach((a) => console.log(`• ${a}`));
console.log(`\nSQL generado en ${salida} (${sql.length} sentencias).`);

if (!aplicar) {
  console.log(`\nNo se tocó ninguna base. Para cargar: añade ${destino} --aplicar\n`);
  process.exit(0);
}

const wrangler = (extraArgs) =>
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'radar-comercial', destino, '--yes', ...extraArgs], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

// Las columnas nuevas van primero y una a una: si ya existen, se sigue
const alters = sql.filter((s) => s.includes('ALTER TABLE'));
for (const a of alters) {
  const linea = a.split('\n').pop();
  try {
    wrangler(['--command', JSON.stringify(linea)]);
  } catch (e) {
    if (!/duplicate column/i.test(String(e.stdout ?? '') + String(e.stderr ?? ''))) throw e;
  }
}
const cuerpo = join('.wrangler', `carga-${basename(archivo, '.json')}-datos.sql`);
writeFileSync(cuerpo, sql.filter((s) => !s.includes('ALTER TABLE')).join('\n') + '\n', 'utf8');

console.log(`\nCargando en D1 (${destino.slice(2)})…`);
wrangler(['--file', cuerpo]);

const conteo = wrangler([
  '--json',
  '--command',
  JSON.stringify(ORDEN.map((t) => `SELECT '${t}' AS tabla, COUNT(*) AS filas FROM ${t}`).join(' UNION ALL ')),
]);
const filasD1 = JSON.parse(conteo.slice(conteo.indexOf('[')))[0].results;
console.log('\nFilas en D1 después de la carga:');
console.table(filasD1);
