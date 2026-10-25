import { generateMysteryCase, generateProceduralMystery } from '../server/services/gemini.js';
import { validateMysteryCase } from '../server/services/validator.js';

describe('[Requirement 3 - MOCKED] Gemini Mystery Generation - Procedural & Mock Verification', () => {
  test('[MOCK] Generates complete procedural mystery case in isolated offline mode', async () => {
    const result = await generateMysteryCase({
      theme: 'Victorian Noir',
      difficulty: 'medium',
      forceMock: true
    });

    expect(result.source).toBe('mock-engine');
    expect(result.liveVerified).toBe(false);
    expect(result.case).toBeDefined();

    const validation = validateMysteryCase(result.case);
    expect(validation.valid).toBe(true);
    expect(result.case.suspects.length).toBeGreaterThanOrEqual(3);
    expect(result.case.evidence.length).toBeGreaterThanOrEqual(4);
    expect(result.case.solution.culpritId).toBeDefined();
  });

  test('[MOCK] Procedural generator creates unique case IDs and consistent themes', () => {
    const case1 = generateProceduralMystery('Victorian Noir', 'easy');
    const case2 = generateProceduralMystery('Victorian Noir', 'hard');

    expect(case1.caseId).not.toBe(case2.caseId);
    expect(case1.difficulty).toBe('easy');
    expect(case2.difficulty).toBe('hard');
  });
});
