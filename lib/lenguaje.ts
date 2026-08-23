/**
 * Traduce errores técnicos a algo que un consultor pueda entender y accionar.
 *
 * Regla: nunca mostrar el error crudo de Postgres. Decir qué pasó, por qué y
 * qué hacer. Si no reconocemos el error, se dice con honestidad y se conserva
 * el detalle técnico aparte, para poder reportarlo.
 */

export type ErrorLegible = {
  /** Qué pasó, en una frase. */
  titulo: string;
  /** Qué puede hacer el usuario ahora. */
  sugerencia: string;
  /** Mensaje original, para soporte. Nunca es la única información mostrada. */
  detalle?: string;
};

type ErrorCrudo = { message?: string; code?: string; details?: string } | Error | string | null;

function texto(e: ErrorCrudo): string {
  if (!e) return '';
  if (typeof e === 'string') return e;
  return ('message' in e && e.message) || '';
}

function codigo(e: ErrorCrudo): string {
  if (!e || typeof e === 'string' || e instanceof Error) return '';
  return e.code ?? '';
}

export function explicarError(e: ErrorCrudo, contexto?: string): ErrorLegible {
  const msg = texto(e);
  const cod = codigo(e);
  const m = msg.toLowerCase();
  const donde = contexto ? ` al ${contexto}` : '';

  // Sin conexión o servidor caído
  if (m.includes('fetch') || m.includes('network') || m.includes('failed to fetch')) {
    return {
      titulo: `No se pudo conectar con la base de datos${donde}.`,
      sugerencia:
        'Revisa tu conexión a internet y vuelve a intentarlo. Si estás en la red de la oficina, puede que el acceso esté bloqueado.',
      detalle: msg,
    };
  }

  // Sesión vencida
  if (cod === '401' || m.includes('jwt') || m.includes('not authenticated') || m.includes('invalid token')) {
    return {
      titulo: 'Tu sesión caducó.',
      sugerencia: 'Vuelve a iniciar sesión y repite la acción. Lo que escribiste no se perdió si no cerraste la ventana.',
      detalle: msg,
    };
  }

  // Permisos / RLS
  if (cod === '42501' || m.includes('row-level security') || m.includes('permission denied')) {
    return {
      titulo: `No tienes permiso para hacer ese cambio${donde}.`,
      sugerencia:
        'Es probable que el contacto pertenezca a otro consultor. Pídele a quien lo tiene asignado que lo registre, o solicita acceso al administrador.',
      detalle: msg,
    };
  }

  // Duplicado
  if (cod === '23505' || m.includes('duplicate key')) {
    return {
      titulo: 'Ese registro ya existe.',
      sugerencia: 'Búscalo en la lista antes de crearlo de nuevo: puede que lo haya cargado otra persona del equipo.',
      detalle: msg,
    };
  }

  // Campo obligatorio vacío
  if (cod === '23502' || m.includes('null value in column')) {
    const campo = msg.match(/column "([^"]+)"/)?.[1];
    return {
      titulo: campo ? `Falta completar "${campo}".` : 'Falta completar un campo obligatorio.',
      sugerencia: 'Complétalo y vuelve a guardar.',
      detalle: msg,
    };
  }

  // Referencia rota
  if (cod === '23503' || m.includes('foreign key')) {
    return {
      titulo: 'El contacto o el proyecto al que apunta este registro ya no existe.',
      sugerencia: 'Recarga la página: es posible que alguien lo haya borrado mientras trabajabas.',
      detalle: msg,
    };
  }

  // Configuración ausente
  if (m.includes('supabase') && (m.includes('url') || m.includes('key'))) {
    return {
      titulo: 'La aplicación no tiene configurado el acceso a la base de datos.',
      sugerencia: 'Faltan las claves de Supabase en el archivo .env.local. Es un tema de configuración, no algo que puedas resolver desde la pantalla.',
      detalle: msg,
    };
  }

  // No reconocido: se admite en vez de inventar una explicación
  return {
    titulo: `Algo falló${donde} y no sé decirte exactamente qué.`,
    sugerencia: 'Vuelve a intentarlo. Si se repite, pasa el detalle técnico de abajo a quien mantiene la herramienta.',
    detalle: msg || 'Sin mensaje del servidor.',
  };
}
