/**
 * Correo de los lunes: a cada manager, los contactos que le toca tocar en la
 * semana y sus próximos pasos pendientes.
 *
 * Lo dispara el Cron Trigger del Worker (ver worker.mjs y wrangler.jsonc).
 * Sin RESEND_API_KEY no envía nada: solo deja en el log qué habría mandado.
 * Con RESUMEN_SOLO_A todos los correos van a esa dirección (piloto).
 */

import { diasHasta, diasHastaCumple, formatearFecha } from '../cartera';

export type EnvResumen = {
  DB: D1Database;
  RESEND_API_KEY?: string;
  /** Remitente verificado en Resend, p. ej. "Radar Comercial <radar@mbc-latam.com>" */
  RESUMEN_DESDE?: string;
  /** Si viene, todos los correos se desvían a esta dirección. */
  RESUMEN_SOLO_A?: string;
  APP_URL?: string;
};

type ManagerFila = { id: string; nombre: string; email: string };
type ContactoFila = {
  id: string;
  nombre: string;
  empresa: string | null;
  cargo: string | null;
  prioridad: string | null;
  next_touch: string | null;
  oportunidad: string | null;
  cumple: string | null;
  manager_id: string;
};
type PasoFila = {
  id: string;
  contacto_id: string;
  autor_id: string;
  fecha: string | null;
  proximos_pasos: string;
};

export type DatosResumen = {
  managers: ManagerFila[];
  contactos: ContactoFila[];
  pasos: PasoFila[];
};

export type Resumen = {
  para: string;
  nombre: string;
  asunto: string;
  html: string;
  texto: string;
  conteo: { semana: number; pasos: number; cumples: number };
};

/** Lee de D1 solo lo que el correo necesita. */
export async function cargarDatos(db: D1Database): Promise<DatosResumen> {
  const [m, c, p] = await db.batch([
    db.prepare("SELECT id, nombre, email FROM managers WHERE activo = 1 AND email IS NOT NULL AND email != ''"),
    db.prepare(
      `SELECT id, nombre, empresa, cargo, prioridad, next_touch, oportunidad, cumple, manager_id
         FROM contactos
        WHERE archivado = 0 AND COALESCE(estado, 'activo') != 'pausa'`
    ),
    db.prepare(
      `SELECT a.id, a.contacto_id, a.autor_id, a.fecha, a.proximos_pasos
         FROM actividades a JOIN contactos c ON c.id = a.contacto_id
        WHERE a.pasos_hecho = 0 AND TRIM(COALESCE(a.proximos_pasos, '')) != '' AND c.archivado = 0
        ORDER BY a.fecha ASC`
    ),
  ]);
  return {
    managers: (m.results ?? []) as ManagerFila[],
    contactos: (c.results ?? []) as ContactoFila[],
    pasos: (p.results ?? []) as PasoFila[],
  };
}

const esc = (t: string | null | undefined) =>
  String(t ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

const AZUL = '#0A3A6B';
const ROJO = '#A62222';
const GRIS = '#7C8899';

function plazo(dias: number | null): { texto: string; color: string } {
  if (dias === null) return { texto: 'sin fecha válida · ponle una', color: ROJO };
  if (dias < 0) return { texto: `vencido hace ${-dias} d`, color: ROJO };
  if (dias === 0) return { texto: 'hoy', color: AZUL };
  return { texto: `en ${dias} d`, color: GRIS };
}

/** Arma un correo por manager. Sin pendientes, no hay correo. */
export function armarResumenes(datos: DatosResumen, appUrl: string, hoy = new Date()): Resumen[] {
  const url = appUrl.replace(/\/$/, '');
  const hastaDomingo = 7 - (hoy.getDay() === 0 ? 7 : hoy.getDay());
  const porId = new Map(datos.contactos.map((c) => [c.id, c]));
  const fechaTitulo = hoy.toLocaleDateString('es', { day: 'numeric', month: 'long' });
  const resumenes: Resumen[] = [];

  for (const m of datos.managers) {
    const propios = datos.contactos.filter((c) => c.manager_id === m.id);

    const semana = propios
      .map((c) => ({ c, dias: diasHasta(c.next_touch) }))
      .filter(({ dias }) => dias === null || dias <= hastaDomingo)
      .sort((a, b) => (a.dias ?? -Infinity) - (b.dias ?? -Infinity));

    const pasos = datos.pasos
      .filter((p) => p.autor_id === m.id || porId.get(p.contacto_id)?.manager_id === m.id)
      .filter((p) => porId.has(p.contacto_id));

    const cumples = propios
      .map((c) => ({ c, dias: diasHastaCumple(c.cumple) }))
      .filter((x): x is { c: ContactoFila; dias: number } => x.dias !== null && x.dias <= 7)
      .sort((a, b) => a.dias - b.dias);

    if (semana.length === 0 && pasos.length === 0 && cumples.length === 0) continue;

    const vencidos = semana.filter((x) => x.dias === null || x.dias < 0).length;
    const asunto =
      `Tu semana en el Radar: ${semana.length} ${semana.length === 1 ? 'contacto' : 'contactos'}` +
      (pasos.length ? ` y ${pasos.length} ${pasos.length === 1 ? 'paso pendiente' : 'pasos pendientes'}` : '');

    const filaContacto = ({ c, dias }: { c: ContactoFila; dias: number | null }) => {
      const p = plazo(dias);
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #E6EDF6">
          <a href="${url}/contactos/${esc(c.id)}" style="color:${AZUL};font-weight:600;text-decoration:none">${esc(c.nombre)}</a>
          <div style="color:#2B3440;font-size:13px">${esc(c.empresa)}${c.cargo ? ` · ${esc(c.cargo)}` : ''}</div>
          ${c.oportunidad ? `<div style="color:#2B3440;font-size:13px"><b>En juego:</b> ${esc(c.oportunidad)}</div>` : ''}
        </td>
        <td style="padding:10px 0 10px 12px;border-bottom:1px solid #E6EDF6;text-align:right;white-space:nowrap;font-size:13px">
          <span style="color:${p.color};font-weight:600">${p.texto}</span><br>
          <span style="color:${GRIS}">${esc(c.prioridad ?? '')}</span>
        </td>
      </tr>`;
    };

    const filaPaso = (p: PasoFila) => {
      const c = porId.get(p.contacto_id)!;
      return `<tr><td style="padding:10px 0;border-bottom:1px solid #E6EDF6;font-size:14px;color:#2B3440">
        ${esc(p.proximos_pasos)}
        <div style="font-size:13px;color:${GRIS}">
          <a href="${url}/contactos/${esc(c.id)}" style="color:${AZUL};text-decoration:none">${esc(c.nombre)}</a>
          · ${esc(c.empresa)} · registrado el ${esc(formatearFecha(p.fecha))}
        </div></td></tr>`;
    };

    const seccion = (titulo: string, cuerpo: string) =>
      `<h2 style="font-size:15px;color:${AZUL};margin:28px 0 4px">${titulo}</h2>
       <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${cuerpo}</table>`;

    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(asunto)}</title></head><body style="margin:0;background:#EDF1F6;font-family:Segoe UI,Arial,sans-serif">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff">
        <tr><td style="background:${AZUL};padding:18px 24px;color:#fff;font-size:13px;letter-spacing:.04em">RADAR COMERCIAL · MBC</td></tr>
        <tr><td style="padding:24px">
          <p style="margin:0;color:${GRIS};font-size:13px">Semana del ${esc(fechaTitulo)}</p>
          <h1 style="margin:6px 0 0;font-size:22px;color:${AZUL};font-weight:600">Hola, ${esc(m.nombre.split(' ')[0])}</h1>
          <p style="margin:8px 0 0;color:#2B3440;font-size:14px">
            ${semana.length ? `Esta semana te toca contactar a <b>${semana.length}</b> ${semana.length === 1 ? 'persona' : 'personas'}${vencidos ? `, ${vencidos} ya ${vencidos === 1 ? 'está vencida o sin fecha' : 'están vencidas o sin fecha'}` : ''}.` : 'No tienes contactos que vencen esta semana.'}
            ${pasos.length ? ` Tienes <b>${pasos.length}</b> ${pasos.length === 1 ? 'próximo paso pendiente' : 'próximos pasos pendientes'}.` : ''}
          </p>
          ${semana.length ? seccion('A quién contactar', semana.map(filaContacto).join('')) : ''}
          ${pasos.length ? seccion('Próximos pasos pendientes', pasos.map(filaPaso).join('')) : ''}
          ${cumples.length ? seccion('Cumpleaños de los próximos 7 días', cumples.map(({ c, dias }) => `<tr><td style="padding:8px 0;border-bottom:1px solid #E6EDF6;font-size:14px;color:#2B3440"><a href="${url}/contactos/${esc(c.id)}" style="color:${AZUL};text-decoration:none;font-weight:600">${esc(c.nombre)}</a> · ${esc(c.empresa)} — ${dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`}</td></tr>`).join('')) : ''}
          <p style="margin:28px 0 0">
            <a href="${url}/" style="display:inline-block;background:${AZUL};color:#fff;text-decoration:none;padding:10px 18px;font-size:14px;font-weight:600">Abrir mi semana en el Radar</a>
          </p>
        </td></tr>
        <tr><td style="padding:14px 24px;color:${GRIS};font-size:12px;border-top:1px solid #E6EDF6">
          Recibes este correo cada lunes porque tienes cartera asignada en el Radar Comercial.
          Marca los pasos como hechos en <a href="${url}/actividades" style="color:${GRIS}">Actividades</a> para que no vuelvan a aparecer.
        </td></tr>
      </table></td></tr></table></body></html>`;

    const texto = [
      `Radar Comercial · semana del ${fechaTitulo}`,
      '',
      ...(semana.length
        ? ['A QUIÉN CONTACTAR', ...semana.map(({ c, dias }) => `- ${c.nombre} (${c.empresa ?? ''}) — ${plazo(dias).texto}`), '']
        : []),
      ...(pasos.length
        ? ['PRÓXIMOS PASOS PENDIENTES', ...pasos.map((p) => `- ${p.proximos_pasos} — ${porId.get(p.contacto_id)!.nombre}`), '']
        : []),
      ...(cumples.length ? ['CUMPLEAÑOS', ...cumples.map(({ c, dias }) => `- ${c.nombre}: en ${dias} días`), ''] : []),
      `Abrir el Radar: ${url}/`,
    ].join('\n');

    resumenes.push({
      para: m.email,
      nombre: m.nombre,
      asunto,
      html,
      texto,
      conteo: { semana: semana.length, pasos: pasos.length, cumples: cumples.length },
    });
  }
  return resumenes;
}

/** Punto de entrada del Cron Trigger. */
export async function enviarResumenSemanal(env: EnvResumen): Promise<void> {
  const resumenes = armarResumenes(await cargarDatos(env.DB), env.APP_URL || 'https://comercial.mbc-latam.com');

  if (!env.RESEND_API_KEY || !env.RESUMEN_DESDE) {
    console.log(
      `[resumen-semanal] sin RESEND_API_KEY/RESUMEN_DESDE: no se envía. Se habrían enviado ${resumenes.length}:`,
      resumenes.map((r) => `${r.para} (${r.conteo.semana} contactos, ${r.conteo.pasos} pasos)`).join('; ')
    );
    return;
  }

  for (const r of resumenes) {
    const destino = env.RESUMEN_SOLO_A || r.para;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.RESUMEN_DESDE,
        to: [destino],
        subject: env.RESUMEN_SOLO_A ? `[piloto · ${r.para}] ${r.asunto}` : r.asunto,
        html: r.html,
        text: r.texto,
      }),
    });
    // Un fallo con un manager no corta el envío a los demás
    if (!res.ok) console.error(`[resumen-semanal] falló ${destino}: ${res.status} ${await res.text()}`);
    else console.log(`[resumen-semanal] enviado a ${destino}`);
  }
}
