// Force Google DNS to resolve MongoDB Atlas SRV records
// (local router DNS does not support SRV lookups)
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { setupDefaultAdmin, seedPolicyDocuments } from './config/setup.js';
import { startVoteScheduler } from './services/voteScheduler.js';

async function main() {
  await connectDB();
  await setupDefaultAdmin();
  await seedPolicyDocuments();
  startVoteScheduler();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`api listening on http://localhost:${env.PORT}`);
    logger.info(`[boot] WEB_ORIGIN = ${env.WEB_ORIGIN}`);
    logger.info(`[boot] STRIPE_SECRET_KEY = ${env.STRIPE_SECRET_KEY ? env.STRIPE_SECRET_KEY.slice(0, 8) + '…' : 'NOT SET'}`);
  });

  const shutdown = (signal: string) => () => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'fatal startup error');
  process.exit(1);
});
