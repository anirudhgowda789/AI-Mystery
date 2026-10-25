import { validateMysteryCase } from '../server/services/validator.js';

describe('[Requirement 4] Generated-Case Schema and Logical Consistency Validation', () => {
  const validBaseCase = {
    caseId: 'valid_case_101',
    title: 'The Alchemist Crypt',
    synopsis: 'A renowned metallurgist was discovered dead in his subterranean laboratory with molten silver on the workbench.',
    crime: {
      type: 'Homicide',
      victim: 'Professor Jonathan Graves',
      timeOfCrime: 'Midnight',
      location: 'Subterranean Vault',
      details: 'Vault was secured from within with a reinforced steel bar.'
    },
    setting: {
      name: 'Old Town Crypt Lab',
      atmosphere: 'Suffocating and sulfurous',
      era: 'Victorian Gothic'
    },
    difficulty: 'medium',
    theme: 'Victorian Noir',
    suspects: [
      { id: 's1', name: 'Dr. Gregory Vance', occupation: 'Rival Chemist', alibi: 'At the faculty club', motive: 'Patent rivalry', statement: 'I never touched his crucible.' },
      { id: 's2', name: 'Madeline Graves', occupation: 'Daughter & Apprentice', alibi: 'Dormitory quarters', motive: 'Inheritance dispute', statement: 'My father was brilliant but reckless.' },
      { id: 's3', name: 'Sergeant Thomas Bell', occupation: 'Night Watchman', alibi: 'Patrolling courtyard', motive: 'Blackmail extortion', statement: 'The crypt was dark all night.' }
    ],
    evidence: [
      { id: 'e1', title: 'Crucible Tongs', description: 'Heavy cast-iron tongs with scorched grips.', type: 'physical', locationFound: 'Crucible bench' },
      { id: 'e2', title: 'Watchman Logbook', description: 'Logbook with page for 23:45 neatly sliced away.', type: 'document', locationFound: 'Guard station' },
      { id: 'e3', title: 'Burned Silk Glove', description: 'A gentleman glove matching Dr. Vance custom tailor.', type: 'forensic', locationFound: 'Flue draft' },
      { id: 'e4', title: 'Laboratory Blueprint', description: 'Diagram indicating hidden ventilation chute into vault.', type: 'document', locationFound: 'Study desk' }
    ],
    solution: {
      culpritId: 's1',
      motive: 'Dr. Vance sought to steal Graves revolutionary metallurgical formula before tomorrow patent deadline.',
      method: 'Lowered toxic sulfur dioxide canisters down the flue before entering via the chute.',
      conclusiveEvidenceId: 'e3',
      explanation: 'The tailored burned silk glove in the flue matches Dr. Vance exclusive haberdasher.'
    }
  };

  test('Valid case passes all schema and logical checks', () => {
    const result = validateMysteryCase(validBaseCase);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('Fails when solution culpritId does not match any suspect', () => {
    const invalid = JSON.parse(JSON.stringify(validBaseCase));
    invalid.solution.culpritId = 'phantom_ghost';
    const result = validateMysteryCase(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('phantom_ghost'))).toBe(true);
  });

  test('Fails when solution conclusiveEvidenceId does not match any evidence item', () => {
    const invalid = JSON.parse(JSON.stringify(validBaseCase));
    invalid.solution.conclusiveEvidenceId = 'evidence_non_existent';
    const result = validateMysteryCase(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('evidence_non_existent'))).toBe(true);
  });

  test('Fails when duplicate suspect IDs exist', () => {
    const invalid = JSON.parse(JSON.stringify(validBaseCase));
    invalid.suspects[1].id = invalid.suspects[0].id;
    const result = validateMysteryCase(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate suspect ID'))).toBe(true);
  });

  test('Fails when case has fewer than 3 suspects', () => {
    const invalid = JSON.parse(JSON.stringify(validBaseCase));
    invalid.suspects = invalid.suspects.slice(0, 2);
    const result = validateMysteryCase(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('at least 3 suspects'))).toBe(true);
  });

  test('Fails when case has fewer than 4 evidence items', () => {
    const invalid = JSON.parse(JSON.stringify(validBaseCase));
    invalid.evidence = invalid.evidence.slice(0, 3);
    const result = validateMysteryCase(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('at least 4 pieces of evidence'))).toBe(true);
  });
});
