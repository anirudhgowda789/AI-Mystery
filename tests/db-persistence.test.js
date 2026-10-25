import { CaseRepository } from '../server/models/Case.js';
import { SessionRepository } from '../server/models/Session.js';
import { connectDatabase, disconnectDatabase } from '../server/config/db.js';

describe('[Requirement 2] MongoDB Connection and Data Persistence', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  test('Persists and retrieves a complete MysteryCase document', async () => {
    const testCase = {
      caseId: 'test_persist_case_001',
      title: 'The Silent Hourglass',
      synopsis: 'A collector of antiquities was found motionless in his private gallery surrounded by broken sundials.',
      crime: {
        type: 'Homicide',
        victim: 'Julian Sands',
        timeOfCrime: '22:00',
        location: 'Antique Gallery',
        details: 'Found slumped over an ancient pendulum.'
      },
      setting: {
        name: 'Sands Antiquities',
        atmosphere: 'Dusty and somber',
        era: '1930s'
      },
      difficulty: 'medium',
      theme: 'Classic Noir',
      suspects: [
        { id: 's1', name: 'Arthur Pendelton', occupation: 'Curator', alibi: 'At the archive', motive: 'Rare artifact jealousy', statement: 'I was in the stacks.' },
        { id: 's2', name: 'Beatrice Vane', occupation: 'Appraiser', alibi: 'Cataloging coins', motive: 'Forgery exposure', statement: 'I arrived at dawn.' },
        { id: 's3', name: 'Charles Cross', occupation: 'Courier', alibi: 'On his bicycle route', motive: 'Stolen reliquary', statement: 'I delivered the parcel.' }
      ],
      evidence: [
        { id: 'e1', title: 'Broken Pendulum Rod', description: 'Fractured brass rod with microscopic traces of lead.', type: 'physical', locationFound: 'Gallery floor' },
        { id: 'e2', title: 'Curator Archive Register', description: 'Log showing Arthur left the archive at 21:45.', type: 'document', locationFound: 'Archive desk' },
        { id: 'e3', title: 'Velvet Ribbon', description: 'Navy silk ribbon snagged on the display case latch.', type: 'physical', locationFound: 'Glass latch' },
        { id: 'e4', title: 'Courier Receipt', description: 'Delivery timestamp signed by Sands at 21:30.', type: 'document', locationFound: 'Countertop' }
      ],
      solution: {
        culpritId: 's1',
        motive: 'Julian intended to expose Arthur for replacing genuine dynastic gold with brass replicas.',
        method: 'Struck victim with pendulum weight.',
        conclusiveEvidenceId: 'e2',
        explanation: 'The archive log proves Arthur was not in the stacks during the murder hour.'
      }
    };

    const created = await CaseRepository.create(testCase);
    expect(created.caseId).toBe('test_persist_case_001');

    const retrieved = await CaseRepository.findByCaseId('test_persist_case_001');
    expect(retrieved).not.toBeNull();
    expect(retrieved.title).toBe('The Silent Hourglass');
    expect(retrieved.suspects.length).toBe(3);
    expect(retrieved.evidence.length).toBe(4);
  });

  test('Persists and updates an InvestigationSession document', async () => {
    const session = await SessionRepository.create({
      sessionId: 'test_session_001',
      caseId: 'test_persist_case_001'
    });

    expect(session.sessionId).toBe('test_session_001');
    expect(session.status).toBe('active');
    expect(session.attemptsRemaining).toBe(3);

    // Update with viewed evidence
    const updated = await SessionRepository.addViewedEvidence('test_session_001', 'e1');
    expect(updated.viewedEvidenceIds).toContain('e1');

    // Retrieve again to verify persistence
    const fetched = await SessionRepository.findBySessionId('test_session_001');
    expect(fetched.viewedEvidenceIds).toContain('e1');
  });
});
