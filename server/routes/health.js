import express from 'express';
import { getDatabaseStatus } from '../config/db.js';
import { config } from '../config/env.js';

const router = express.Router();

router.get('/', (req, res) => {
  const dbStatus = getDatabaseStatus();

  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.connected,
      engine: dbStatus.engine,
      readyState: dbStatus.readyState
    },
    gemini: {
      hasApiKey: Boolean(config.geminiApiKey),
      keyPreview: config.geminiApiKey 
        ? `${config.geminiApiKey.substring(0, 6)}...${config.geminiApiKey.substring(config.geminiApiKey.length - 4)}` 
        : null,
      mode: config.geminiApiKey ? 'live-ready' : 'mock-fallback'
    },
    version: '1.0.0',
    environment: config.nodeEnv
  });
});

export default router;
