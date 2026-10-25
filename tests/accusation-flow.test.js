import request from 'supertest';
import { createApp } from '../server/app.js';
import { connectDatabase, disconnectDatabase } from '../server/config/db.js';
import { CaseRepository } from '../server/models/Case.js';

describe('[Requirement 8] Correct and Incorrect Accusations', () => {
  let app;
  let testCase;
  let solvedSessionId;
  let strikeoutSessionId;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();

    const genRes = await request(app)
      .post('/api/cases/generate')
      .send({ forceMock: true });

    testCase = await CaseRepository.findByCaseId(genRes.body.case.caseId);

    // Session 1: For correct accusation
    const s1 = await request(app).post('/api/sessions').send({ caseId: testCase.caseId });
    solvedSessionId = s1.body.sessionId;

    // Session 2: For strike-out test
    const s2 = await request(app).post('/api/sessions').send({ caseId: testCase.caseId });
    strikeoutSessionId = s2.body.sessionId;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  test('Incorrect accusation decrements attempts remaining from 3 to 2', async () => {
    // Pick an innocent suspect
    const innocent = testCase.suspects.find(s => s.id !== testCase.solution.culpritId);

    const res = await request(app)
      .post(`/api/sessions/${strikeoutSessionId}/accuse`)
      .send({ suspectId: innocent.id, rationale: 'I suspect them because of their alibi.' });

    expect(res.status).toBe(200);
    expect(res.body.correct).toBe(false);
    expect(res.body.attemptsRemaining).toBe(2);
    expect(res.body.status).toBe('active');
    expect(res.body.solutionUnlocked).toBe(false);
  });

  test('Three consecutive incorrect accusations transition session status to "failed"', async () => {
    const innocent = testCase.suspects.find(s => s.id !== testCase.solution.culpritId);

    // Strike 2
    const strike2 = await request(app)
      .post(`/api/sessions/${strikeoutSessionId}/accuse`)
      .send({ suspectId: innocent.id });
    expect(strike2.body.attemptsRemaining).toBe(1);
    expect(strike2.body.status).toBe('active');

    // Strike 3 (Final)
    const strike3 = await request(app)
      .post(`/api/sessions/${strikeoutSessionId}/accuse`)
      .send({ suspectId: innocent.id });
    expect(strike3.body.attemptsRemaining).toBe(0);
    expect(strike3.body.status).toBe('failed');
    expect(strike3.body.solutionUnlocked).toBe(true);

    // Further accusation attempts are rejected
    const blocked = await request(app)
      .post(`/api/sessions/${strikeoutSessionId}/accuse`)
      .send({ suspectId: innocent.id });
    expect(blocked.status).toBe(400);
    expect(blocked.body.code).toBe('CASE_FAILED');
  });

  test('Correct accusation transitions session status to "solved" and calculates score', async () => {
    const culpritId = testCase.solution.culpritId;

    const res = await request(app)
      .post(`/api/sessions/${solvedSessionId}/accuse`)
      .send({ suspectId: culpritId, rationale: 'Forensic evidence decisively disproves their timeline.' });

    expect(res.status).toBe(200);
    expect(res.body.correct).toBe(true);
    expect(res.body.status).toBe('solved');
    expect(res.body.solutionUnlocked).toBe(true);
    expect(res.body.score).toBeGreaterThan(0);
    expect(res.body.rank).toBeDefined();

    // Subsequent accusations blocked once solved
    const extra = await request(app)
      .post(`/api/sessions/${solvedSessionId}/accuse`)
      .send({ suspectId: culpritId });
    expect(extra.status).toBe(400);
    expect(extra.body.code).toBe('CASE_ALREADY_SOLVED');
  });
});
