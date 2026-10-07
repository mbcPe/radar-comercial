/**
 * Entrada del Worker en Cloudflare.
 *
 * Las peticiones web siguen yendo a la app Next (bundle de OpenNext); aquí solo
 * se suma el Cron Trigger de los lunes que envía el resumen semanal por correo.
 */

// @ts-ignore: lo genera `opennextjs-cloudflare build`
import app from './.open-next/worker.js';
import { enviarResumenSemanal } from './lib/servidor/resumenSemanal';

// @ts-ignore: Durable Objects que el bundle de OpenNext espera ver exportados
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';

export default {
  fetch: app.fetch,
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(enviarResumenSemanal(env));
  },
};
