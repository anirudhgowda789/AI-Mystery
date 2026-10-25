import request from 'supertest';
import { createApp } from '../server/app.js';
import { connectDatabase, disconnectDatabase } from '../server/config/db.js';

describe('[Requirement 9] Backend Protection of the Hidden Culprit', () => {
  let app;
  let createdCaseId;
  let createdSessionId;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();

    // Generate a case through the API
    const genRes = await request(app)
      .post('/api/cases/generate')
      .send({ theme: 'Victorian Noir', forceMock: true });

    expect(genRes.status).toBe(201);
    createdCaseId = genRes.body.case.caseId;

    // Start a session
    const sessRes = await request(app)
      .post('/api/sessions')
      .send({ caseId: createdCaseId });

    expect(sessRes.status).toBe(201);
    createdSessionId = sessRes.body.sessionId;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  test('POST /api/cases/generate strips solution and culprit identity', async () => {
    const res = await request(app)
      .post('/api/cases/generate')
      .send({ theme: 'Cyberpunk Noir', forceMock: true });

    expect(res.status).toBe(201);
    expect(res.body.case.solution).toBeUndefined();
    expect(res.body.case.culpritId).toBeUndefined();
    expect(res.body.case.conclusiveEvidenceId).toBeUndefined();
  });

  test('GET /api/cases strips solution from all cases in the list', async () => {
    const res = await request(app).get('/api/cases');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.cases)).toBe(true);

    res.body.cases.forEach(c => {
      expect(c.solution).toBeUndefined();
      expect(c.culpritId).toBeUndefined();
      expect(c.conclusiveEvidenceId).toBeUndefined();
    });
  });

  test('GET /api/cases/:caseId strips solution from individual case response', async () => {
    const res = await request(app).get(`/api/cases/${createdCaseId}`);
    expect(res.status).toBe(200);
    expect(res.body.case.solution).toBeUndefined();
    expect(res.body.case.culpritId).toBeUndefined();
    expect(res.body.case.conclusiveEvidenceId).toBeUndefined();
  });

  test('GET /api/sessions/:sessionId strips solution from restored session case', async () => {
    const res = await request(app).get(`/api/sessions/${createdSessionId}`);
    expect(res.status).toBe(200);
    expect(res.body.case.solution).toBeUndefined();
    expect(res.body.case.culpritId).toBeUndefined();
    expect(res.body.case.conclusiveEvidenceId).toBeUndefined();
  });
});
