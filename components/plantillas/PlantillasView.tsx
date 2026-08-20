'use client';

/**
 * Buenas prácticas de contacto + plantillas de WhatsApp y correo.
 * Las ediciones se guardan en localStorage del navegador: cuando exista una tabla
 * `plantillas` en Supabase, solo hay que cambiar cargar()/guardar().
 */

import { useEffect, useMemo, useState } from 'react';
import {
  BUENAS_PRACTICAS,
  PLANTILLAS,
  renderPlantilla,
  variablesPendientes,
  type Canal,
  type Plantilla,
} from '@/lib/plantillas';
import { Chip, PageHeader, Panel, cx } from '@/components/ui/kit';

export type ContactoLigero = {
  id: string;
  nombre: string;
  empresa: string;
  cargo?: string | null;
  email?: string | null;
  telefono?: string | null;
  oportunidad?: string | null;
};

const CLAVE_STORAGE = 'mbc-plantillas-v1';

export default function PlantillasView({
  contactos,
  consultor,
}: {
  contactos: ContactoLigero[];
  consultor: string;
}) {
  const [seleccionada, setSeleccionada] = useState<Plantilla>(PLANTILLAS[0]);
  const [canal, setCanal] = useState<Canal>('whatsapp');
  const [contactoId, setContactoId] = useState<string>('');
  const [tema, setTema] = useState('');
  const [caso, setCaso] = useState('');
  const [propuesta, setPropuesta] = useState('');
  const [borrador, setBorrador] = useState('');
  const [editado, setEditado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  /** Textos personalizados por el usuario: { "id:canal": texto } */
  const [personalizadas, setPersonalizadas] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_STORAGE);
      if (guardado) setPersonalizadas(JSON.parse(guardado));
    } catch {
      // localStorage no disponible: se trabaja con las plantillas base
    }

    // El radar enlaza aquí con la situación y el contacto ya elegidos
    const q = new URLSearchParams(window.location.search);
    const p = PLANTILLAS.find((x) => x.id === q.get('situacion'));
    if (p) setSeleccionada(p);
    const cto = q.get('contacto');
    if (cto) setContactoId(cto);
  }, []);

  const contacto = contactos.find((c) => c.id === contactoId);

  // Solo se sustituye lo que tiene valor: lo demás queda como {{variable}} y
  // aparece en "falta completar". Sustituir por vacío produce "Hola , ¿cómo estás?".
  const valores = useMemo(() => {
    const v: Record<string, string> = {};
    if (consultor) v.consultor = consultor;
    if (contacto) {
      v.nombre = contacto.nombre.split(' ')[0];
      v.empresa = contacto.empresa;
      if (contacto.cargo) v.cargo = contacto.cargo;
    }
    const prop = propuesta || contacto?.oportunidad || '';
    if (prop) v.propuesta = prop;
    if (tema) v.tema = tema;
    if (caso) v.caso = caso;
    return v;
  }, [contacto, consultor, propuesta, tema, caso]);

  /** Texto base: el personalizado si existe, si no el del catálogo. */
  const textoBase = useMemo(
    () => personalizadas[`${seleccionada.id}:${canal}`] ?? seleccionada[canal],
    [personalizadas, seleccionada, canal]
  );

  // Al cambiar plantilla, canal o variables se recalcula el borrador,
  // salvo que el usuario esté editando a mano.
  useEffect(() => {
    if (!editado) setBorrador(renderPlantilla(textoBase, valores));
  }, [textoBase, valores, editado]);

  useEffect(() => {
    setEditado(false);
  }, [seleccionada, canal]);

  const pendientes = variablesPendientes(borrador);
  const asunto = seleccionada.asunto ? renderPlantilla(seleccionada.asunto, valores) : '';

  function copiar() {
    navigator.clipboard.writeText(borrador);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function abrirWhatsApp() {
    const tel = (contacto?.telefono ?? '').replace(/[^\d]/g, '');
    const url = tel
      ? `https://wa.me/${tel}?text=${encodeURIComponent(borrador)}`
      : `https://wa.me/?text=${encodeURIComponent(borrador)}`;
    window.open(url, '_blank', 'noopener');
  }

  function abrirCorreo() {
    const para = contacto?.email ?? '';
    window.location.href = `mailto:${para}?subject=${encodeURIComponent(
      asunto
    )}&body=${encodeURIComponent(borrador)}`;
  }

  function guardarPersonalizacion() {
    // Se guarda el texto CON las variables, no el borrador ya sustituido
    let conVariables = borrador;
    if (valores.nombre) conVariables = conVariables.split(valores.nombre).join('{{nombre}}');
    if (valores.empresa) conVariables = conVariables.split(valores.empresa).join('{{empresa}}');
    if (consultor) conVariables = conVariables.split(consultor).join('{{consultor}}');

    const nuevas = { ...personalizadas, [`${seleccionada.id}:${canal}`]: conVariables };
    setPersonalizadas(nuevas);
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(nuevas));
    setEditado(false);
  }

  function restaurar() {
    const nuevas = { ...personalizadas };
    delete nuevas[`${seleccionada.id}:${canal}`];
    setPersonalizadas(nuevas);
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(nuevas));
    setEditado(false);
  }

  const esPersonalizada = Boolean(personalizadas[`${seleccionada.id}:${canal}`]);

  return (
    <div className="mx-auto max-w-[1180px] p-6">
      <PageHeader
        kicker="Buenas prácticas de contacto"
        titulo="Qué decir en cada tipo de contacto"
        bajada="Plantillas de WhatsApp y correo con el formato Minsait. Elige la situación, completa el contexto y envía."
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Catálogo de situaciones */}
        <div className="space-y-2">
          <div className="kicker mb-1">Tipo de contacto</div>
          {PLANTILLAS.map((p) => {
            const activa = p.id === seleccionada.id;
            return (
              <button
                key={p.id}
                onClick={() => setSeleccionada(p)}
                className={cx(
                  'card relative w-full overflow-hidden p-3 text-left transition-transform',
                  !activa && 'hover:-translate-y-0.5'
                )}
                style={{ boxShadow: activa ? `0 0 0 2px ${p.acento}` : undefined }}
              >
                <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: p.acento }} />
                <div className="flex items-start gap-2 pl-2">
                  <span className="text-lg leading-none">{p.icono}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-mbc">{p.titulo}</div>
                    <div className="text-[11px] leading-snug text-tinta/75">{p.cuando}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="space-y-4">
          <Panel
            kicker={seleccionada.cuando}
            titulo={`${seleccionada.icono}  ${seleccionada.titulo}`}
            derecha={
              <div className="inline-flex rounded-lg bg-white/10 p-0.5">
                {(['whatsapp', 'email'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCanal(c)}
                    className="rounded-md px-3 py-1 text-xs font-semibold transition-colors"
                    style={{
                      backgroundColor: canal === c ? '#1F6FEB' : 'transparent',
                      color: canal === c ? '#fff' : 'rgba(255,255,255,.7)',
                    }}
                  >
                    {c === 'whatsapp' ? 'WhatsApp' : 'Correo'}
                  </button>
                ))}
              </div>
            }
          >
            {/* La regla de la situación */}
            <div
              className="mb-4 rounded-xl p-3 text-sm"
              style={{ backgroundColor: '#EAF2FE', color: '#0A3A6B' }}
            >
              <span className="font-semibold">Regla: </span>
              {seleccionada.regla}
            </div>

            {/* Contexto */}
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="kicker">Contacto</span>
                <select
                  value={contactoId}
                  onChange={(e) => setContactoId(e.target.value)}
                  className="field mt-1 cursor-pointer"
                >
                  <option value="">— Sin contacto (texto genérico) —</option>
                  {contactos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} · {c.empresa}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="kicker">Tema conversado</span>
                <input
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  placeholder="homologación de materiales"
                  className="field mt-1"
                />
              </label>

              <label className="block">
                <span className="kicker">Propuesta u oportunidad</span>
                <input
                  value={propuesta}
                  onChange={(e) => setPropuesta(e.target.value)}
                  placeholder={contacto?.oportunidad ?? 'data maestra de materiales'}
                  className="field mt-1"
                />
              </label>

              <label className="block">
                <span className="kicker">Caso, dato o novedad</span>
                <input
                  value={caso}
                  onChange={(e) => setCaso(e.target.value)}
                  placeholder="cerramos un proyecto similar en el sector minero"
                  className="field mt-1"
                />
              </label>
            </div>

            {canal === 'email' && (
              <div className="mb-3">
                <span className="kicker">Asunto</span>
                <div className="field mt-1">{asunto}</div>
              </div>
            )}

            {/* Borrador */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="kicker">Mensaje</span>
                {esPersonalizada && <Chip color="acento">Plantilla personalizada</Chip>}
              </div>
              <textarea
                value={borrador}
                onChange={(e) => {
                  setBorrador(e.target.value);
                  setEditado(true);
                }}
                rows={canal === 'whatsapp' ? 10 : 16}
                className="field leading-relaxed"
              />
            </div>

            {pendientes.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-tinta/75">Falta completar:</span>
                {pendientes.map((v) => (
                  <Chip key={v} color="proximo">
                    {v}
                  </Chip>
                ))}
              </div>
            )}

            {/* Acciones */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={copiar} className="btn-primary px-4 py-2 text-sm">
                {copiado ? '✓ Copiado' : 'Copiar mensaje'}
              </button>
              {canal === 'whatsapp' ? (
                <button onClick={abrirWhatsApp} className="btn-ghost px-4 py-2 text-sm">
                  Abrir en WhatsApp
                  {!contacto?.telefono && <span className="text-arena"> (sin teléfono)</span>}
                </button>
              ) : (
                <button onClick={abrirCorreo} className="btn-ghost px-4 py-2 text-sm">
                  Abrir en el correo
                  {!contacto?.email && <span className="text-arena"> (sin email)</span>}
                </button>
              )}
              {editado && (
                <button onClick={guardarPersonalizacion} className="btn-ghost px-4 py-2 text-sm">
                  Guardar como mi plantilla
                </button>
              )}
              {esPersonalizada && (
                <button onClick={restaurar} className="btn-ghost px-4 py-2 text-sm">
                  Restaurar la original
                </button>
              )}
            </div>

            <p className="mt-3 text-[11px] text-tinta/75">
              Las plantillas que guardes quedan en este navegador. Cuando exista la tabla
              correspondiente en Supabase pasarán a compartirse con todo el equipo.
            </p>
          </Panel>

          {/* Buenas prácticas */}
          <Panel kicker="Cómo se hace bien" titulo="Buenas prácticas de seguimiento">
            <ul className="grid gap-3 sm:grid-cols-2">
              {BUENAS_PRACTICAS.map((b) => (
                <li key={b.titulo} className="rounded-xl bg-ceramica/60 p-3">
                  <div className="text-sm font-semibold text-mbc">{b.titulo}</div>
                  <p className="mt-1 text-xs leading-snug text-tinta/80">{b.detalle}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
