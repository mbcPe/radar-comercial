import { createBrowserClient } from '@supabase/ssr';
import { MODO_DEMO } from '@/lib/modoDemo';
import { createDemoClient } from '@/lib/supabaseDemo';

function clienteReal() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type Cliente = ReturnType<typeof clienteReal>;

export function createClient(): Cliente {
  // En modo demo se trabaja contra datos en memoria: nada sale ni entra a Supabase.
  // Se fuerza al tipo real para que el resto de la app conserve su tipado.
  if (MODO_DEMO) return createDemoClient() as Cliente;

  return clienteReal();
}