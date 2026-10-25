import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { config } from './config/env.js';

async function bootstrap() {
  console.log(`=======================================================`);
  console.log(`        AI MYSTERY ROOM - DETECTIVE WORKBENCH          `);
  console.log(`=======================================================`);
  console.log(`Node Environment: ${config.nodeEnv}`);
  console.log(`Gemini Key configured: ${Boolean(config.geminiApiKey)}`);

  // Initialize Database
  try {
    const db = await connectDatabase();
    console.log(`[Database] Active persistence engine: ${db.storageEngineType}`);
  } catch (error) {
    console.error(`[Database Error] Initialization warning: ${error.message}`);
  }

  // Create & Start Express Server
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[Server] Live and listening at http://localhost:${config.port}`);
    console.log(`[Server] Health check: http://localhost:${config.port}/api/health`);
    console.log(`[Server] Investigation Room UI: http://localhost:${config.port}`);
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log(`\n[Server] Gracefully shutting down detective workbench...`);
    server.close(() => {
      console.log(`[Server] HTTP server closed.`);
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error(`[Fatal Startup Error]`, err);
  process.exit(1);
});
