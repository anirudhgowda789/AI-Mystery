import request from 'supertest';
import { createApp } from '../server/app.js';
import { connectDatabase, disconnectDatabase } from '../server/config/db.js';

describe('[Requirement 1 & 11] Startup, Health Check, and Basic Middleware', () => {
  let app;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  test('GET /api/health returns 200 with status healthy and diagnostic info', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database).toBeDefined();
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.gemini).toBeDefined();
  });

  test('GET /api/non-existent-route returns 404 with structured error envelope', async () => {
    const res = await request(app).get('/api/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  test('Frontend static files are served at root', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('AI Mystery Room');
  });
});
