import request from 'supertest';
import { createApp } from '../server/app.js';
import { connectDatabase, disconnectDatabase } from '../server/config/db.js';
import { CaseRepository } from '../server/models/Case.js';

describe('[Requirement 10] Solution-Reveal Authorization', () => {
  let app;
  let testCase;
  let activeSessionId;
  let solvedSessionId;
  let failedSessionId;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();

    const genRes = await request(app)
      .post('/api/cases/generate')
      .send({ forceMock: true });

    testCase = await CaseRepository.findByCaseId(genRes.body.case.caseId);

    // Active session
    const s1 = await request(app).post('/api/sessions').send({ caseId: testCase.caseId });
    activeSessionId = s1.body.sessionId;

    // Solved session
    const s2 = await request(app).post('/api/sessions').send({ caseId: testCase.caseId });
    solvedSessionId = s2.body.sessionId;
    await request(app)
      .post(`/api/sessions/${solvedSessionId}/accuse`)
      .send({ suspectId: testCase.solution.culpritId });

    // Failed session
    const s3 = await request(app).post('/api/sessions').send({ caseId: testCase.caseId });
    failedSessionId = s3.body.sessionId;
    const innocent = testCase.suspects.find(s => s.id !== testCase.solution.culpritId);
    await request(app).post(`/api/sessions/${failedSessionId}/accuse`).send({ suspectId: innocent.id });
    await request(app).post(`/api/sessions/${failedSessionId}/accuse`).send({ suspectId: innocent.id });
    await request(app).post(`/api/sessions/${failedSessionId}/accuse`).send({ suspectId: innocent.id });
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  test('GET /api/sessions/:sessionId/solution returns 403 FORBIDDEN while investigation is active', async () => {
    const res = await request(app).get(`/api/sessions/${activeSessionId}/solution`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('SOLUTION_FORBIDDEN');
    expect(res.body.solution).toBeUndefined();
  });

  test('GET /api/sessions/:sessionId/solution returns 200 OK with full culprit dossier when case is solved', async () => {
    const res = await request(app).get(`/api/sessions/${solvedSessionId}/solution`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.solution).toBeDefined();
    expect(res.body.solution.culpritId).toBe(testCase.solution.culpritId);
    expect(res.body.solution.motive).toBeDefined();
    expect(res.body.solution.method).toBeDefined();
    expect(res.body.solution.conclusiveEvidenceId).toBe(testCase.solution.conclusiveEvidenceId);
    expect(res.body.solution.explanation).toBeDefined();
  });

  test('GET /api/sessions/:sessionId/solution returns 200 OK with solution when case has failed (cold case unsealed)', async () => {
    const res = await request(app).get(`/api/sessions/${failedSessionId}/solution`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.solution).toBeDefined();
    expect(res.body.solution.culpritId).toBe(testCase.solution.culpritId);
  });
});
