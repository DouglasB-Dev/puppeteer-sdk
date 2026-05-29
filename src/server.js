import { createApp } from './app.js';
import { createBrowserManager } from './lib/browser-manager.js';
import { env } from './config/env.js';

const browserManager = createBrowserManager();
const app = createApp({ browserManager });

const server = app.listen(env.port, () => {
  console.log(`[scraper] API escuchando en http://localhost:${env.port}`);
});

const shutdown = async (signal) => {
  console.log(`[scraper] Cerrando por ${signal}`);
  server.close(async () => {
    await browserManager.close();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
