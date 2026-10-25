import { z } from 'zod';

export const SuspectSchema = z.object({
  id: z.string().min(1, 'Suspect ID cannot be empty'),
  name: z.string().min(2, 'Suspect name must be at least 2 characters'),
  occupation: z.string().min(1, 'Occupation is required'),
  alibi: z.string().min(5, 'Alibi must provide substantive explanation'),
  motive: z.string().min(5, 'Motive must provide substantive context'),
  statement: z.string().min(5, 'Statement is required'),
  relationship: z.string().optional().default('Acquaintance'),
  suspicionLevel: z.number().min(0).max(100).optional().default(50),
  avatarColor: z.string().optional().default('#6366f1')
});

export const EvidenceSchema = z.object({
  id: z.string().min(1, 'Evidence ID cannot be empty'),
  title: z.string().min(2, 'Evidence title is required'),
  description: z.string().min(10, 'Evidence description must be detailed'),
  type: z.enum(['physical', 'testimonial', 'forensic', 'digital', 'document']).default('physical'),
  locationFound: z.string().min(2, 'Found location is required'),
  relevance: z.string().optional().default('High'),
  hint: z.string().optional().default('')
});

export const SolutionSchema = z.object({
  culpritId: z.string().min(1, 'Culprit ID is required'),
  motive: z.string().min(5, 'Culprit motive must be clearly defined'),
  method: z.string().min(5, 'Culprit method must be clearly defined'),
  conclusiveEvidenceId: z.string().min(1, 'Conclusive evidence ID is required'),
  explanation: z.string().min(20, 'Detailed forensic explanation is required')
});

export const MysteryCaseSchema = z.object({
  caseId: z.string().min(1, 'Case ID is required'),
  title: z.string().min(3, 'Case title must be at least 3 characters'),
  synopsis: z.string().min(20, 'Synopsis must be at least 20 characters'),
  crime: z.object({
    type: z.string().default('Homicide'),
    victim: z.string().min(2, 'Victim name is required'),
    timeOfCrime: z.string().min(2, 'Time of crime is required'),
    location: z.string().min(2, 'Crime scene location is required'),
    details: z.string().min(10, 'Crime details are required')
  }),
  setting: z.object({
    name: z.string().min(2, 'Setting name is required'),
    atmosphere: z.string().default('Dark and stormy'),
    era: z.string().default('Contemporary Noir')
  }),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  theme: z.string().default('Classic Noir'),
  suspects: z.array(SuspectSchema).min(3, 'A mystery must have at least 3 suspects').max(6, 'A mystery can have at most 6 suspects'),
  evidence: z.array(EvidenceSchema).min(4, 'A mystery must have at least 4 pieces of evidence').max(8, 'A mystery can have at most 8 pieces of evidence'),
  solution: SolutionSchema
});

/**
 * Validates the schema and deep logical consistency of a mystery case.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateMysteryCase(caseData) {
  const errors = [];

  // 1. Zod Schema Validation
  const parseResult = MysteryCaseSchema.safeParse(caseData);
  if (!parseResult.success) {
    parseResult.error.issues.forEach(issue => {
      errors.push(`[Schema] ${issue.path.join('.')}: ${issue.message}`);
    });
    return { valid: false, errors };
  }

  const validData = parseResult.data;

  // 2. Logical Consistency: Unique Suspect IDs
  const suspectIds = new Set();
  validData.suspects.forEach((suspect, idx) => {
    if (suspectIds.has(suspect.id)) {
      errors.push(`[Logical] Duplicate suspect ID "${suspect.id}" at index ${idx}`);
    }
    suspectIds.add(suspect.id);
  });

  // 3. Logical Consistency: Unique Evidence IDs
  const evidenceIds = new Set();
  validData.evidence.forEach((item, idx) => {
    if (evidenceIds.has(item.id)) {
      errors.push(`[Logical] Duplicate evidence ID "${item.id}" at index ${idx}`);
    }
    evidenceIds.add(item.id);
  });

  // 4. Logical Consistency: Culprit must exist in suspects
  const culpritExists = validData.suspects.some(s => s.id === validData.solution.culpritId);
  if (!culpritExists) {
    errors.push(`[Logical] Solution culprit ID "${validData.solution.culpritId}" is not present in suspects roster`);
  }

  // 5. Logical Consistency: Conclusive evidence must exist in evidence roster
  const evidenceExists = validData.evidence.some(e => e.id === validData.solution.conclusiveEvidenceId);
  if (!evidenceExists) {
    errors.push(`[Logical] Solution conclusiveEvidenceId "${validData.solution.conclusiveEvidenceId}" is not present in evidence roster`);
  }

  // 6. Logical Consistency: Culprit cannot be the victim
  if (validData.solution.culpritId) {
    const culprit = validData.suspects.find(s => s.id === validData.solution.culpritId);
    if (culprit && culprit.name.toLowerCase() === validData.crime.victim.toLowerCase()) {
      errors.push(`[Logical] Culprit "${culprit.name}" cannot be identical to victim "${validData.crime.victim}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: validData
  };
}
