import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import healthRoutes from './routes/health.js';
import caseRoutes from './routes/cases.js';
import sessionRoutes from './routes/sessions.js';
import { generalApiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

export function createApp() {
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // General rate limiting for API
  app.use('/api', generalApiLimiter);

  // API Routes
  app.use('/api/health', healthRoutes);
  app.use('/api/cases', caseRoutes);
  app.use('/api/sessions', sessionRoutes);

  // Serve static frontend assets
  app.use(express.static(publicDir));

  // Client-side routing fallback for HTML requests (Express 5 compatible)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.originalUrl.startsWith('/api')) {
      return res.sendFile(path.join(publicDir, 'index.html'));
    }
    next();
  });

  // Catch-all for undefined routes
  app.use(notFoundHandler);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}

export default createApp;
