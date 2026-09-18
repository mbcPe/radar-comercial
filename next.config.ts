import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Versión Cloudflare: vive dentro del Hub, en hub.mbc-latam.com/lead_comercial
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
};

export default nextConfig;

// En `next dev` da acceso a D1 local (versión Cloudflare) vía getCloudflareContext
if (process.env.NEXT_PUBLIC_BACKEND === "d1") {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}
