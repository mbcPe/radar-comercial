/**
 * Crítico del registro de una interacción.
 *
 * Un CRM se llena de "buena reunión, seguimos en contacto", que no sirve para
 * decidir nada. Esto revisa lo que el consultor escribió, le dice en lenguaje
 * llano qué falta y le hace la pregunta concreta para que profundice.
 *
 * Es determinista, a base de reglas: no llama a ningún modelo. Está aislado a
 * propósito para poder sustituir `evaluarRegistro` por una llamada a un modelo
 * sin tocar la interfaz.
 */

export type Hueco = {
  id: string;
  /** Qué falta, en dos palabras. */
  etiqueta: string;
  /** La pregunta que se le hace al consultor. */
  pregunta: string;
  /** Texto que se añade al campo si acepta profundizar. */
  plantilla: string;
  /** Sin esto el registro no sirve para decidir. */
  critico: boolean;
};

export type Critica = {
  nivel: 'vacio' | 'superficial' | 'aceptable' | 'solido';
  puntaje: number;
  /** Valoración en lenguaje natural, dirigida al consultor. */
  mensaje: string;
  huecos: Hueco[];
};

const NORMALIZAR = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Frases que aparentan contenido pero no dicen nada. */
const RELLENO = [
  'buena reunion',
  'todo bien',
  'seguimos en contacto',
  'quedamos en hablar',
  'sin novedad',
  'conversamos',
  'reunion productiva',
  'muy interesado',
  'le intereso',
];

type Dimension = {
  id: string;
  etiqueta: string;
  pregunta: string;
  plantilla: string;
  critico: boolean;
  peso: number;
  detectar: (t: string) => boolean;
};

const DIMENSIONES: Dimension[] = [
  {
    id: 'necesidad',
    etiqueta: 'La necesidad',
    pregunta: '¿Qué problema concreto quiere resolver? No el tema, el dolor.',
    plantilla: 'Necesidad concreta: ',
    critico: true,
    peso: 25,
    detectar: (t) =>
      /(necesit|problem|dolor|le cuesta|no puede|pierde|demora|manual|retras|riesgo de|ineficien|duplicad)/.test(t),
  },
  {
    id: 'decisor',
    etiqueta: 'Quién decide',
    pregunta: '¿Quién aprueba esto? ¿Habló él o tiene que subirlo a alguien?',
    plantilla: 'Quién decide: ',
    critico: true,
    peso: 20,
    detectar: (t) =>
      /(decide|aprueba|aprobacion|comite|directorio|gerencia general|ceo|cfo|su jefe|escalar|lo sube|firma)/.test(t),
  },
  {
    id: 'plazo',
    etiqueta: 'El plazo',
    pregunta: '¿Para cuándo lo necesita? Sin fecha, esto no entra en ningún pipeline.',
    plantilla: 'Plazo del cliente: ',
    critico: true,
    peso: 20,
    detectar: (t) =>
      /(plazo|antes de|para (el|fin|inicio)|trimestre|semestre|este a[nñ]o|proximo mes|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|q[1-4]|urgente|cuanto antes|\d{1,2}\/\d{1,2})/.test(
        t
      ),
  },
  {
    id: 'dinero',
    etiqueta: 'El tamaño',
    pregunta: '¿Hay presupuesto asignado? ¿De qué orden de magnitud hablamos?',
    plantilla: 'Presupuesto o tamaño: ',
    critico: false,
    peso: 15,
    detectar: (t) =>
      /(presupuest|monto|inversion|costo|precio|tarifa|us\$|usd|s\/|mil|millon|capex|opex|cotiza)/.test(t),
  },
  {
    id: 'competencia',
    etiqueta: 'Con quién compite',
    pregunta: '¿Está viendo a otros proveedores o comparando con hacerlo internamente?',
    plantilla: 'Alternativas que evalúa: ',
    critico: false,
    peso: 10,
    detectar: (t) =>
      /(competencia|competidor|otro proveedor|otras propuestas|cotizando con|interno|in-house|licitacion|comparar)/.test(
        t
      ),
  },
  {
    id: 'riesgo',
    etiqueta: 'Qué lo puede frenar',
    pregunta: '¿Qué objeción o traba apareció? Lo que no se anota, se olvida.',
    plantilla: 'Traba u objeción: ',
    critico: false,
    peso: 10,
    detectar: (t) =>
      /(objecion|duda|preocupa|riesgo|traba|freno|resisten|no esta convencid|le preocupa|depende de)/.test(t),
  },
];

export function evaluarRegistro(entrada: {
  tipo?: string;
  resultado?: string;
  proximosPasos?: string;
}): Critica {
  const resultado = (entrada.resultado ?? '').trim();
  const pasos = (entrada.proximosPasos ?? '').trim();
  const todo = NORMALIZAR(`${resultado} ${pasos}`);
  const palabras = resultado.split(/\s+/).filter(Boolean).length;

  if (palabras === 0) {
    return {
      nivel: 'vacio',
      puntaje: 0,
      mensaje:
        'Todavía no has escrito qué pasó. Si guardas así, dentro de tres meses nadie —ni tú— podrá reconstruir esta conversación.',
      huecos: DIMENSIONES.filter((d) => d.critico).map(aHueco),
    };
  }

  const esRelleno = RELLENO.some((f) => todo.includes(f)) && palabras < 25;
  const cubiertas = DIMENSIONES.filter((d) => d.detectar(todo));
  const huecos = DIMENSIONES.filter((d) => !d.detectar(todo));

  let puntaje = cubiertas.reduce((s, d) => s + d.peso, 0);
  if (palabras < 8) puntaje = Math.min(puntaje, 25);
  if (esRelleno) puntaje = Math.min(puntaje, 20);
  if (pasos.length > 0) puntaje = Math.min(100, puntaje + 5);

  const criticosFaltantes = huecos.filter((h) => h.critico);

  let nivel: Critica['nivel'];
  if (puntaje >= 70 && criticosFaltantes.length === 0) nivel = 'solido';
  else if (puntaje >= 45) nivel = 'aceptable';
  else nivel = 'superficial';

  return {
    nivel,
    puntaje,
    mensaje: redactar({ nivel, palabras, esRelleno, criticosFaltantes, cubiertas, pasos }),
    huecos: huecos.map(aHueco),
  };
}

function aHueco(d: Dimension): Hueco {
  return {
    id: d.id,
    etiqueta: d.etiqueta,
    pregunta: d.pregunta,
    plantilla: d.plantilla,
    critico: d.critico,
  };
}

/** La crítica, escrita como se la diría un gerente a su consultor. */
function redactar(ctx: {
  nivel: Critica['nivel'];
  palabras: number;
  esRelleno: boolean;
  criticosFaltantes: Dimension[];
  cubiertas: Dimension[];
  pasos: string;
}): string {
  const lista = (ds: Dimension[]) => {
    const n = ds.map((d) => d.etiqueta.toLowerCase());
    if (n.length === 1) return n[0];
    return `${n.slice(0, -1).join(', ')} y ${n.at(-1)}`;
  };

  if (ctx.esRelleno) {
    return 'Lo que escribiste describe el ambiente de la reunión, no su contenido. "Buena reunión" no es un dato: ¿qué dijo el cliente que no sabías antes?';
  }

  if (ctx.nivel === 'superficial') {
    if (ctx.palabras < 8) {
      return `Son ${ctx.palabras} palabras. Con eso no se puede decidir el siguiente paso ni pasarle el caso a un colega.`;
    }
    return `Cuentas qué pasó, pero falta lo que permite avanzar: ${lista(ctx.criticosFaltantes)}. Sin eso, esta reunión no mueve nada.`;
  }

  if (ctx.nivel === 'aceptable') {
    if (ctx.criticosFaltantes.length > 0) {
      return `Buen registro. Le falta ${lista(ctx.criticosFaltantes)} para que otro pueda retomar la cuenta sin llamarte.`;
    }
    return 'Registro correcto. Si añades el presupuesto o con quién más está hablando, se vuelve accionable para el comité.';
  }

  if (!ctx.pasos) {
    return 'Registro sólido en contenido, pero no anotaste el próximo paso. Un compromiso sin dueño ni fecha se pierde.';
  }
  return 'Registro sólido: se entiende la necesidad, quién decide y para cuándo. Así se puede retomar la cuenta dentro de seis meses.';
}
