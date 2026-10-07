/**
 * Vista previa del correo semanal con los datos de la D1 local (no envía nada).
 *
 *   npm run correo:vista            -> deja .wrangler/resumen-<email>.html
 *   npm run correo:vista -- --remote  (lee la D1 de producción; sigue sin enviar)
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { armarResumenes, type DatosResumen } from '../lib/servidor/resumenSemanal';

const remoto = process.argv.includes('--remote');

function consulta<T>(sql: string): T[] {
  const salida = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'radar-comercial', remoto ? '--remote' : '--local', '--json', '--command', `"${sql}"`],
    { encoding: 'utf8', shell: true }
  );
  return (JSON.parse(salida)[0]?.results ?? []) as T[];
}

const datos: DatosResumen = {
  managers: consulta("SELECT id, nombre, email FROM managers WHERE activo = 1 AND email IS NOT NULL AND email != ''"),
  contactos: consulta(
    "SELECT id, nombre, empresa, cargo, prioridad, next_touch, oportunidad, cumple, manager_id FROM contactos WHERE archivado = 0 AND COALESCE(estado, 'activo') != 'pausa'"
  ),
  pasos: consulta(
    "SELECT a.id, a.contacto_id, a.autor_id, a.fecha, a.proximos_pasos FROM actividades a JOIN contactos c ON c.id = a.contacto_id WHERE a.pasos_hecho = 0 AND TRIM(COALESCE(a.proximos_pasos, '')) != '' AND c.archivado = 0 ORDER BY a.fecha ASC"
  ),
};

const resumenes = armarResumenes(datos, 'https://comercial.mbc-latam.com');
if (resumenes.length === 0) console.log('Nadie tiene pendientes: no saldría ningún correo.');
for (const r of resumenes) {
  const archivo = `.wrangler/resumen-${r.para.replace(/[^a-z0-9]+/gi, '_')}.html`;
  writeFileSync(archivo, r.html, 'utf8');
  console.log(`${r.para} · "${r.asunto}" · ${JSON.stringify(r.conteo)} → ${archivo}`);
}
