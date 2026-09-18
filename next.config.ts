import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Opcional: servir la app bajo una ruta (p. ej. /lead_comercial)
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
};

export default nextConfig;

// En `next dev` da acceso a D1 local (versión Cloudflare) vía getCloudflareContext
if (process.env.NEXT_PUBLIC_BACKEND === "d1") {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}
