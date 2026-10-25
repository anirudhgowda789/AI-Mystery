import request from 'supertest';
import { createApp } from '../server/app.js';
import { connectDatabase, disconnectDatabase } from '../server/config/db.js';
import { CaseRepository } from '../server/models/Case.js';

describe('[Requirement 7] Investigation Progress Restoration', () => {
  let app;
  let testCase;
  let sessionId;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();

    const genRes = await request(app)
      .post('/api/cases/generate')
      .send({ forceMock: true });

    testCase = await CaseRepository.findByCaseId(genRes.body.case.caseId);

    const sessRes = await request(app)
      .post('/api/sessions')
      .send({ caseId: testCase.caseId });

    sessionId = sessRes.body.sessionId;

    // View first 2 clues
    await request(app).post(`/api/sessions/${sessionId}/evidence/${testCase.evidence[0].id}/view`);
    await request(app).post(`/api/sessions/${sessionId}/evidence/${testCase.evidence[1].id}/view`);

    // Submit an incorrect accusation
    const innocent = testCase.suspects.find(s => s.id !== testCase.solution.culpritId);
    await request(app).post(`/api/sessions/${sessionId}/accuse`).send({ suspectId: innocent.id, rationale: 'Initial hypothesis' });

    // Save field notes
    await request(app).patch(`/api/sessions/${sessionId}/notes`).send({ notes: 'Contradiction discovered in time of arrival.' });
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  test('GET /api/sessions/:sessionId completely restores progress, viewed evidence, notes, and accusations', async () => {
    const res = await request(app).get(`/api/sessions/${sessionId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const s = res.body.session;
    expect(s.sessionId).toBe(sessionId);
    expect(s.viewedEvidenceIds.length).toBe(2);
    expect(s.viewedEvidenceIds).toContain(testCase.evidence[0].id);
    expect(s.viewedEvidenceIds).toContain(testCase.evidence[1].id);
    expect(s.attemptsRemaining).toBe(2);
    expect(s.accusations.length).toBe(1);
    expect(s.notes).toBe('Contradiction discovered in time of arrival.');

    // Sanitized case is also included with solution stripped
    expect(res.body.case.caseId).toBe(testCase.caseId);
    expect(res.body.case.solution).toBeUndefined();
  });

  test('Returns 404 for unknown session ID', async () => {
    const res = await request(app).get('/api/sessions/unknown_session_xyz');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SESSION_NOT_FOUND');
  });
});
