import request from 'supertest';
import { createApp } from '../server/app.js';
import { connectDatabase, disconnectDatabase } from '../server/config/db.js';

describe('[Requirement 6] Evidence-View Tracking', () => {
  let app;
  let testSessionId;
  let evidenceList;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();

    const genRes = await request(app)
      .post('/api/cases/generate')
      .send({ forceMock: true });

    evidenceList = genRes.body.case.evidence;

    const sessRes = await request(app)
      .post('/api/sessions')
      .send({ caseId: genRes.body.case.caseId });

    testSessionId = sessRes.body.sessionId;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  test('POST /api/sessions/:sessionId/evidence/:evidenceId/view tracks viewed evidence', async () => {
    const target = evidenceList[0];
    const res = await request(app)
      .post(`/api/sessions/${testSessionId}/evidence/${target.id}/view`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.newlyViewed).toBe(true);
    expect(res.body.viewedEvidenceIds).toContain(target.id);
    expect(res.body.viewedCount).toBe(1);
  });

  test('Evidence view tracking is idempotent (no duplicate IDs)', async () => {
    const target = evidenceList[0];
    const res = await request(app)
      .post(`/api/sessions/${testSessionId}/evidence/${target.id}/view`);

    expect(res.status).toBe(200);
    expect(res.body.newlyViewed).toBe(false);
    expect(res.body.viewedEvidenceIds.filter(id => id === target.id).length).toBe(1);
  });

  test('Tracking multiple different evidence items increments viewed count', async () => {
    const second = evidenceList[1];
    const res = await request(app)
      .post(`/api/sessions/${testSessionId}/evidence/${second.id}/view`);

    expect(res.status).toBe(200);
    expect(res.body.newlyViewed).toBe(true);
    expect(res.body.viewedEvidenceIds).toContain(second.id);
    expect(res.body.viewedCount).toBe(2);
  });

  test('Returns 404 for non-existent evidence item in case', async () => {
    const res = await request(app)
      .post(`/api/sessions/${testSessionId}/evidence/fake_evidence_999/view`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EVIDENCE_NOT_FOUND');
  });
});
