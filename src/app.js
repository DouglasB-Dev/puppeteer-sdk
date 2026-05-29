import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createBrowserManager } from './lib/browser-manager.js';
import { createScraperRouter } from './routes/scraper-routes.js';
import { createProjectRedirectRouter } from '../projects/redirect.js';

export const createApp = ({ browserManager = createBrowserManager() } = {}) => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'puppeteer-action-framework', timestamp: new Date().toISOString() });
  });

  app.use('/api/scraper', createScraperRouter({ browserManager }));
  app.use('/projects', createProjectRedirectRouter({ browserManager }));
  app.use('/api/projects', createProjectRedirectRouter({ browserManager }));

  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    return res.status(500).json({ error: error.message });
  });

  return app;
};
