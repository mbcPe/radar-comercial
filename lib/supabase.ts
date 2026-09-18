import { createBrowserClient } from '@supabase/ssr';
import { MODO_D1, MODO_DEMO } from '@/lib/modoDemo';
import { createDemoClient } from '@/lib/supabaseDemo';
import { createD1Client } from '@/lib/supabaseD1';

let real: ReturnType<typeof construirReal> | null = null;

function construirReal() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Se reutiliza la misma instancia: su identidad es dependencia de varios useEffect. */
function clienteReal() {
  if (!real) real = construirReal();
  return real;
}

type Cliente = ReturnType<typeof clienteReal>;

export function createClient(): Cliente {
  // En modo demo se trabaja contra datos en memoria: nada sale ni entra a Supabase.
  // Se fuerza al tipo real para que el resto de la app conserve su tipado.
  if (MODO_DEMO) return createDemoClient() as Cliente;
  // Versión Cloudflare: consultas a D1 vía /api/db
  if (MODO_D1) return createD1Client() as Cliente;

  return clienteReal();
}