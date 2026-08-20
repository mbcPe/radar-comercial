/**
 * Catálogo de plantillas de contacto para MBC.
 *
 * Cada plantilla lleva su regla de uso, no solo el texto: el benchmark es claro en que
 * el problema no es la redacción sino el "checking in" sin contenido. Toda plantilla
 * aquí obliga a aportar algo concreto y a proponer un siguiente paso.
 *
 * Variables disponibles: {{nombre}} {{empresa}} {{cargo}} {{consultor}}
 *                        {{propuesta}} {{tema}} {{caso}}
 */

export type Canal = 'whatsapp' | 'email';

export type Plantilla = {
  id: string;
  titulo: string;
  /** Cuándo se dispara este tipo de contacto. */
  cuando: string;
  /** La regla de oro de esta situación, en una línea. */
  regla: string;
  /** Color de acento (paleta Holmes) para la tarjeta. */
  acento: string;
  icono: string;
  asunto?: string;
  whatsapp: string;
  email: string;
};

export const FIRMA_MINSAIT = `{{consultor}}
Minsait Business Consulting | Perú
An Indra Company`;

export const PLANTILLAS: Plantilla[] = [
  {
    id: 'cumpleanos',
    titulo: 'Cumpleaños',
    cuando: 'El mismo día, temprano. Nunca al día siguiente.',
    regla: 'Sin agenda comercial. Un saludo con pedido dentro deja de ser un saludo.',
    acento: '#1F6FEB',
    icono: '🎂',
    asunto: 'Feliz cumpleaños, {{nombre}}',
    whatsapp: `Hola {{nombre}}, ¡feliz cumpleaños! 🎉

Que tengas un gran día y un año excelente, en lo personal y en {{empresa}}.

Un abrazo,
{{consultor}}`,
    email: `Estimado(a) {{nombre}}:

Quería tomarme un momento para desearle un muy feliz cumpleaños.

Le deseo un excelente año, tanto en lo personal como en sus proyectos en {{empresa}}.

Un cordial saludo,

${FIRMA_MINSAIT}`,
  },
  {
    id: 'seguimiento-propuesta',
    titulo: 'Seguimiento de propuesta',
    cuando: 'Primer seguimiento a los 2-3 días de enviarla. Luego cada 5-7 días, máximo tres veces.',
    regla:
      'Reitera los dos beneficios que el cliente marcó como importantes y propón un siguiente paso concreto. Nunca preguntes "¿pudo revisarla?".',
    acento: '#0A3A6B',
    icono: '📄',
    asunto: '{{propuesta}} — siguiente paso',
    whatsapp: `Hola {{nombre}}, ¿cómo estás?

Sobre la propuesta de {{propuesta}}: quedé pensando en el punto de {{tema}} que mencionaste y creo que ahí está el mayor impacto a corto plazo.

¿Te sirve que la conversemos 20 minutos esta semana? Puedo el jueves por la mañana.

Saludos,
{{consultor}}`,
    email: `Estimado(a) {{nombre}}:

Retomo la propuesta de {{propuesta}} que le compartimos.

Después de nuestra conversación quedé revisando el punto de {{tema}}, que es donde vemos el mayor impacto en el corto plazo. Preparé una vista específica de cómo lo abordaríamos en las primeras semanas.

¿Le parece si lo revisamos en una sesión de 20 minutos? Tengo disponibilidad el jueves por la mañana; si le acomoda mejor otro momento, con gusto me ajusto.

Quedo atento,

${FIRMA_MINSAIT}`,
  },
  {
    id: 'post-reunion',
    titulo: 'Post-reunión',
    cuando: 'Dentro de las 4 horas siguientes. Al día siguiente pierde la mitad del efecto.',
    regla:
      'Resume lo acordado en tres líneas y deja por escrito quién hace qué y para cuándo. Es el correo que evita el malentendido de la semana siguiente.',
    acento: '#6B5BD2',
    icono: '🤝',
    asunto: 'Resumen de nuestra reunión — {{tema}}',
    whatsapp: `{{nombre}}, gracias por el tiempo de hoy.

Me quedo con tres cosas:
1. {{tema}}
2. Nosotros preparamos la vista de detalle
3. Volvemos a conversar la próxima semana

Cualquier cosa que quieras agregar, me avisas.

{{consultor}}`,
    email: `Estimado(a) {{nombre}}:

Gracias por el tiempo de hoy. Le dejo por escrito lo que entendimos, para asegurarnos de estar alineados:

• Situación: {{tema}}
• Compromiso de Minsait: preparar la vista de detalle y compartirla antes de la próxima sesión
• Compromiso de {{empresa}}: confirmar los datos de referencia
• Siguiente hito: nueva conversación la próxima semana

Si algo de lo anterior no refleja lo conversado, le agradezco corregirme.

Saludos cordiales,

${FIRMA_MINSAIT}`,
  },
  {
    id: 'sondeo-oportunidad',
    titulo: 'Sondeo de oportunidad',
    cuando: 'Cuando la cuenta lleva tiempo sin movimiento pero la relación está viva.',
    regla:
      'Pregunta por la prioridad del cliente, no por tu oferta. La pregunta abierta sobre el año en curso abre más puertas que cualquier catálogo.',
    acento: '#0D8FA6',
    icono: '🎯',
    asunto: 'Prioridades de {{empresa}} para este año',
    whatsapp: `Hola {{nombre}}, espero que todo bien por {{empresa}}.

Estamos cerrando la planificación del semestre y quería preguntarte directamente: ¿cuáles son las dos o tres prioridades donde más presión tienes ahora?

Lo pregunto para no ofrecerte cosas que no te sirven.

{{consultor}}`,
    email: `Estimado(a) {{nombre}}:

Espero que se encuentre muy bien.

Estamos cerrando la planificación del semestre y, antes de proponerle nada, prefiero preguntarle: ¿cuáles son las dos o tres prioridades donde {{empresa}} tiene hoy más presión?

Se lo consulto porque en los últimos meses hemos trabajado temas de {{caso}} en compañías del sector, y prefiero contarle solo lo que sea pertinente a lo que usted está enfrentando.

Quedo atento a sus comentarios,

${FIRMA_MINSAIT}`,
  },
  {
    id: 'aporte-valor',
    titulo: 'Aporte de valor',
    cuando: 'Entre contactos comerciales, para mantener la cadencia sin desgastar la relación.',
    regla:
      'Manda algo que le sirva aunque nunca te compre: un caso, un dato del sector, una lectura. Sin pedir nada a cambio en ese mensaje.',
    acento: '#2E9E5B',
    icono: '💡',
    asunto: 'Le puede interesar: {{caso}}',
    whatsapp: `{{nombre}}, vi esto y me acordé de lo que conversamos sobre {{tema}}.

{{caso}}

Sin agenda, solo me pareció útil para lo que están haciendo en {{empresa}}.

{{consultor}}`,
    email: `Estimado(a) {{nombre}}:

Le comparto algo que me pareció pertinente para lo que conversamos sobre {{tema}}: {{caso}}.

Lo más relevante para el caso de {{empresa}} es el enfoque de implementación por fases, que permite mostrar resultados antes de comprometer todo el alcance.

No requiere respuesta; se lo envío porque puede serle útil.

Saludos cordiales,

${FIRMA_MINSAIT}`,
  },
  {
    id: 'reactivacion',
    titulo: 'Reactivación',
    cuando: 'Contacto dormido más de 4 meses o marcado como rezagado.',
    regla:
      'Reconoce el silencio sin disculparte en exceso y da una razón nueva para retomar. Si no hay novedad que contar, no es momento de escribir.',
    acento: '#E58413',
    icono: '🔄',
    asunto: 'Retomando contacto — {{empresa}}',
    whatsapp: `Hola {{nombre}}, ha pasado un tiempo desde la última vez.

Te escribo porque {{caso}} y pensé que podía conectar con lo que estaban viendo en {{empresa}}.

¿Sigues a cargo de ese frente? Si cambió, dime con quién debería conversar.

{{consultor}}`,
    email: `Estimado(a) {{nombre}}:

Ha pasado un tiempo desde nuestra última conversación y quería retomar el contacto con una razón concreta.

{{caso}}. Recordé lo que veníamos conversando sobre {{tema}} en {{empresa}} y me pareció que podía ser pertinente.

Además, quería confirmar si usted sigue a cargo de ese frente; si el equipo cambió, le agradecería indicarme con quién sería mejor conversar.

Saludos cordiales,

${FIRMA_MINSAIT}`,
  },
  {
    id: 'felicitacion-hito',
    titulo: 'Felicitación por hito',
    cuando: 'Ascenso, nombramiento, premio, resultados publicados o aniversario de la compañía.',
    regla:
      'Dentro de las 48 horas de la noticia y sin pedir nada. Es el contacto con mejor tasa de respuesta de todos.',
    acento: '#D64545',
    icono: '🏆',
    asunto: 'Felicitaciones, {{nombre}}',
    whatsapp: `{{nombre}}, ¡felicitaciones! 👏

Me enteré de {{caso}}. Muy merecido.

Un abrazo,
{{consultor}}`,
    email: `Estimado(a) {{nombre}}:

Me enteré de {{caso}} y quería felicitarlo(a).

Conociendo su trabajo en {{empresa}}, no me sorprende. Le deseo mucho éxito en esta nueva etapa.

Un cordial saludo,

${FIRMA_MINSAIT}`,
  },
  {
    id: 'post-cierre',
    titulo: 'Después de cerrar un proyecto',
    cuando: 'A las 3 o 4 semanas de terminar el trabajo, no el mismo día del cierre.',
    regla:
      'Pregunta por el resultado real, no por la satisfacción con el servicio. La respuesta te da el caso de éxito y la siguiente oportunidad.',
    acento: '#1A3B47',
    icono: '✅',
    asunto: '{{propuesta}} — ¿cómo va funcionando?',
    whatsapp: `Hola {{nombre}}, ya pasó un mes desde que cerramos {{propuesta}}.

Más allá de la entrega, ¿cómo está funcionando en el día a día? ¿Se notó el cambio en {{tema}}?

Te pregunto de verdad, no por formalidad.

{{consultor}}`,
    email: `Estimado(a) {{nombre}}:

Ha pasado alrededor de un mes desde que cerramos {{propuesta}} y quería consultarle algo más útil que un "¿quedaron conformes?".

¿Cómo está funcionando en la operación diaria? Concretamente, ¿se ha notado el cambio en {{tema}}?

Se lo pregunto por dos motivos: para corregir a tiempo lo que no esté rindiendo, y porque si el resultado fue bueno me gustaría documentarlo con usted.

Quedo atento,

${FIRMA_MINSAIT}`,
  },
  {
    id: 'presentacion-interna',
    titulo: 'Pedir una presentación',
    cuando: 'Cuando necesitas llegar a otra área o a un nivel más alto dentro de la misma cuenta.',
    regla:
      'Pide la presentación explicando qué gana la persona a la que quieres llegar, no qué ganas tú. Y facilítale el texto para reenviar.',
    acento: '#7C8899',
    icono: '🔗',
    asunto: 'Consulta: contacto en {{tema}}',
    whatsapp: `{{nombre}}, una consulta.

Estamos trabajando {{caso}} y creo que a quien lleva {{tema}} en {{empresa}} le puede servir verlo.

¿Te parece si me presentas? Te dejo listo el texto para reenviar, así no te toma tiempo.

Gracias,
{{consultor}}`,
    email: `Estimado(a) {{nombre}}:

Quería pedirle una ayuda concreta.

Estamos trabajando {{caso}} y creo que a la persona responsable de {{tema}} en {{empresa}} le sería útil conocerlo, sobre todo por el ahorro de tiempo que implica en la operación.

¿Le parecería presentarnos? Para que no le tome tiempo, le dejo un texto listo para reenviar:

---
"Te comparto el contacto de {{consultor}}, de Minsait Business Consulting. Han trabajado {{caso}} y creo que puede ser útil para lo que estás viendo en {{tema}}. Los dejo en contacto."
---

Muchas gracias de antemano,

${FIRMA_MINSAIT}`,
  },
  {
    id: 'cierre-ano',
    titulo: 'Cierre de año',
    cuando: 'Segunda quincena de diciembre. Antes del 20, o se pierde entre cientos.',
    regla:
      'Personaliza con algo que pasó ese año con esa persona. Un saludo genérico masivo resta más de lo que suma.',
    acento: '#14548F',
    icono: '🎄',
    asunto: 'Gracias por este año, {{nombre}}',
    whatsapp: `{{nombre}}, se cierra el año y quería agradecerte.

Lo de {{tema}} fue de lo mejor que nos tocó trabajar este año.

Que tengas unas muy buenas fiestas y nos vemos en enero.

{{consultor}}`,
    email: `Estimado(a) {{nombre}}:

Se cierra el año y quería agradecerle la confianza.

Trabajar {{tema}} con el equipo de {{empresa}} fue de lo más gratificante de este año para nosotros.

Le deseo unas muy buenas fiestas junto a su familia y un excelente inicio de año. Retomamos en enero.

Un cordial saludo,

${FIRMA_MINSAIT}`,
  },
];

/** Reemplaza las variables {{...}} con los valores disponibles. */
export function renderPlantilla(texto: string, valores: Record<string, string>): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (_, clave: string) => valores[clave] ?? `{{${clave}}}`);
}

/** Variables que quedaron sin resolver: hay que completarlas antes de enviar. */
export function variablesPendientes(texto: string): string[] {
  return [...new Set([...texto.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
}

/* ---------- Buenas prácticas transversales ---------- */

export const BUENAS_PRACTICAS = [
  {
    titulo: 'Cinco seguimientos, no uno',
    detalle:
      'El 80% de los cierres necesita cinco o más seguimientos, pero el 70% de los comerciales manda uno solo y abandona. La cadencia P1/P2/P3 existe para que eso no dependa de la memoria.',
  },
  {
    titulo: 'Prohibido el "solo para hacer seguimiento"',
    detalle:
      'Es el formato más común y el menos efectivo. Cada toque debe llevar algo útil: un caso, un dato, una idea concreta. Si no tienes nada que aportar, no es momento de escribir.',
  },
  {
    titulo: 'Personaliza entre el 20% y el 30%',
    detalle:
      'La estructura de la plantilla se mantiene; los detalles se ganan. Un mensaje que podría ir a cualquiera se lee como lo que es.',
  },
  {
    titulo: 'Martes, miércoles y jueves por la mañana',
    detalle:
      'Son los tramos con mejor tasa de respuesta en B2B de forma consistente. Lunes y viernes por la tarde son los peores.',
  },
  {
    titulo: 'El resumen post-reunión va dentro de las 4 horas',
    detalle:
      'Conecta la conversación con el correo en la cabeza del cliente y deja los compromisos por escrito el mismo día.',
  },
  {
    titulo: 'Un dueño por contacto, historia compartida',
    detalle:
      'Antes de escribir a alguien de una cuenta ajena, revisa la línea de tiempo: si un colega la tocó esta semana, coordina primero. Dos correos de Minsait el mismo día restan credibilidad.',
  },
  {
    titulo: 'Registra en el momento, no el viernes',
    detalle:
      'El registro manual acumulado es la causa número uno de que un CRM se abandone. El check de la agenda existe para que registrar cueste dos clics.',
  },
];
