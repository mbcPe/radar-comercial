#!/usr/bin/env node
/**
 * Migra los datos de Supabase a D1 sin pasar por la app de Vercel.
 *
 * Lee las 4 tablas por la API REST de Supabase (solo lectura), guarda una copia
 * JSON con el mismo formato que "Equipo > Descargar respaldo" y se la pasa a
 * cargar-respaldo.mjs, que es quien escribe en D1.
 *
 * Las claves NO van en el código ni en la línea de comandos: se leen del archivo
 * .env.migracion (ignorado por git), que completa el propio usuario:
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_KEY=eyJ...      (anon key; si hay RLS activo, la service_role)
 *
 *   npm run db:migrar                      → lee Supabase y deja el respaldo + revisión (no carga)
 *   npm run db:migrar -- --remote --aplicar → además carga en la D1 de producción
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const TABLAS = ['managers', 'contactos', 'actividades', 'proyectos'];
const PAGINA = 1000;

function leerEnv(ruta) {
  if (!existsSync(ruta)) {
    console.error(
      `Falta ${ruta}. Créalo con dos líneas:\n  SUPABASE_URL=https://xxxx.supabase.co\n  SUPABASE_KEY=eyJ...\n` +
        '(Supabase > Project Settings > API, o las variables del proyecto en Vercel)'
    );
    process.exit(1);
  }
  const env = {};
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = leerEnv('.env.migracion');
const url = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const clave = env.SUPABASE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !clave) {
  console.error('En .env.migracion faltan SUPABASE_URL o SUPABASE_KEY.');
  process.exit(1);
}

async function leerTabla(tabla) {
  const filas = [];
  for (let desde = 0; ; desde += PAGINA) {
    const r = await fetch(`${url}/rest/v1/${tabla}?select=*&order=id`, {
      headers: {
        apikey: clave,
        Authorization: `Bearer ${clave}`,
        Range: `${desde}-${desde + PAGINA - 1}`,
        'Range-Unit': 'items',
      },
    });
    if (!r.ok && r.status !== 206) {
      throw new Error(`Supabase respondió ${r.status} al leer "${tabla}": ${(await r.text()).slice(0, 200)}`);
    }
    const lote = await r.json();
    filas.push(...lote);
    if (lote.length < PAGINA) return filas;
  }
}

const datos = {};
const filas = {};
try {
  for (const t of TABLAS) {
    datos[t] = await leerTabla(t);
    filas[t] = datos[t].length;
    console.log(`Leída ${t}: ${filas[t]} filas`);
  }
} catch (e) {
  // Se aborta entero: una migración a medias da falsa tranquilidad
  console.error(`\nNo se migró nada. ${e.message}`);
  process.exit(1);
}

if (Object.values(filas).every((n) => n === 0)) {
  console.error(
    '\nSupabase devolvió las 4 tablas vacías. Si la base tiene datos, lo más probable es que haya RLS ' +
      'activo: usa la clave service_role en SUPABASE_KEY. No se cargó nada.'
  );
  process.exit(1);
}

mkdirSync('respaldos', { recursive: true });
const generado = new Date().toISOString();
const archivo = join('respaldos', `supabase-${generado.slice(0, 19).replace(/[:T]/g, '-')}.json`);
writeFileSync(archivo, JSON.stringify({ generado, origen: `Supabase ${new URL(url).host}`, filas, datos }, null, 2));
console.log(`\nCopia guardada en ${archivo} (queda como respaldo aunque falle la carga).`);

execFileSync(process.execPath, ['scripts/cargar-respaldo.mjs', archivo, ...process.argv.slice(2)], {
  stdio: 'inherit',
});
