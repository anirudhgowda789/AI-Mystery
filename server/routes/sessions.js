import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SessionRepository } from '../models/Session.js';
import { CaseRepository } from '../models/Case.js';
import { accusationLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/sessions
 * Initializes a new investigation session for a specific case.
 */
router.post('/', async (req, res, next) => {
  try {
    const { caseId } = req.body || {};
    if (!caseId) {
      return res.status(400).json({
        success: false,
        error: 'caseId is required to start an investigation session',
        code: 'MISSING_CASE_ID'
      });
    }

    const caseDoc = await CaseRepository.findByCaseId(caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        error: `Case with ID "${caseId}" does not exist`,
        code: 'CASE_NOT_FOUND'
      });
    }

    const sessionId = `session_${uuidv4().substring(0, 8)}`;
    const session = await SessionRepository.create({
      sessionId,
      caseId
    });

    const sanitizedCase = CaseRepository.sanitize(caseDoc);

    res.status(201).json({
      success: true,
      sessionId,
      session,
      case: sanitizedCase
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/:sessionId
 * Restores the complete investigation session state and sanitized case data (Requirement 7).
 */
router.get('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await SessionRepository.findBySessionId(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: `Session "${sessionId}" not found`,
        code: 'SESSION_NOT_FOUND'
      });
    }

    const caseDoc = await CaseRepository.findByCaseId(session.caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        error: `Associated case "${session.caseId}" not found`,
        code: 'CASE_NOT_FOUND'
      });
    }

    // Always sanitize case so culprit remains hidden (Requirement 9)
    const sanitizedCase = CaseRepository.sanitize(caseDoc);

    res.json({
      success: true,
      session,
      case: sanitizedCase
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions/:sessionId/evidence/:evidenceId/view
 * Tracks that the investigator has inspected a piece of evidence (Requirement 6).
 */
router.post('/:sessionId/evidence/:evidenceId/view', async (req, res, next) => {
  try {
    const { sessionId, evidenceId } = req.params;
    const session = await SessionRepository.findBySessionId(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: `Session "${sessionId}" not found`,
        code: 'SESSION_NOT_FOUND'
      });
    }

    const caseDoc = await CaseRepository.findByCaseId(session.caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        error: `Associated case not found`,
        code: 'CASE_NOT_FOUND'
      });
    }

    const evidenceItem = caseDoc.evidence.find(e => e.id === evidenceId);
    if (!evidenceItem) {
      return res.status(404).json({
        success: false,
        error: `Evidence item "${evidenceId}" does not exist in this case`,
        code: 'EVIDENCE_NOT_FOUND'
      });
    }

    const isNewlyViewed = !session.viewedEvidenceIds.includes(evidenceId);
    const updatedSession = await SessionRepository.addViewedEvidence(sessionId, evidenceId);

    res.json({
      success: true,
      newlyViewed: isNewlyViewed,
      evidence: evidenceItem,
      viewedEvidenceIds: updatedSession.viewedEvidenceIds,
      totalEvidenceCount: caseDoc.evidence.length,
      viewedCount: updatedSession.viewedEvidenceIds.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions/:sessionId/accuse
 * Submits a formal accusation against a suspect (Requirement 8).
 */
router.post('/:sessionId/accuse', accusationLimiter, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { suspectId, rationale = '' } = req.body || {};

    if (!suspectId) {
      return res.status(400).json({
        success: false,
        error: 'suspectId is required for an accusation',
        code: 'MISSING_SUSPECT_ID'
      });
    }

    const session = await SessionRepository.findBySessionId(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: `Session "${sessionId}" not found`,
        code: 'SESSION_NOT_FOUND'
      });
    }

    // Check if session has already concluded
    if (session.status === 'solved') {
      return res.status(400).json({
        success: false,
        error: 'Case is already solved! No further accusations required.',
        code: 'CASE_ALREADY_SOLVED',
        status: session.status
      });
    }

    if (session.status === 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Investigation has gone cold! You have exhausted all attempts.',
        code: 'CASE_FAILED',
        status: session.status
      });
    }

    const caseDoc = await CaseRepository.findByCaseId(session.caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        error: 'Associated case not found',
        code: 'CASE_NOT_FOUND'
      });
    }

    const suspect = caseDoc.suspects.find(s => s.id === suspectId);
    if (!suspect) {
      return res.status(404).json({
        success: false,
        error: `Suspect "${suspectId}" is not part of this investigation`,
        code: 'SUSPECT_NOT_FOUND'
      });
    }

    const isCorrect = suspectId === caseDoc.solution.culpritId;
    let feedback = '';
    let newStatus = session.status;
    let attemptsRemaining = session.attemptsRemaining;
    let score = session.score;
    let rank = session.rank;
    let solutionUnlocked = session.solutionUnlocked;

    if (isCorrect) {
      newStatus = 'solved';
      solutionUnlocked = true;

      // Score calculation based on attempts left and evidence examined
      const evidenceRatio = session.viewedEvidenceIds.length / caseDoc.evidence.length;
      const attemptBonus = attemptsRemaining * 250;
      score = Math.round(500 + attemptBonus + (evidenceRatio * 250));

      if (score >= 900) rank = 'Master Sleuth (Sherlock Grade)';
      else if (score >= 750) rank = 'Senior Inspector';
      else if (score >= 600) rank = 'Field Detective';
      else rank = 'Junior Detective';

      feedback = `BULLSEYE! ${suspect.name} breaks down under interrogation and confesses to the crime. Your sharp deductive reasoning has closed the case!`;
    } else {
      attemptsRemaining -= 1;
      feedback = `${suspect.name}'s alibi holds up under intense questioning. Forensics confirms they could not have executed the crime. You have expended an accusation strike.`;

      if (attemptsRemaining <= 0) {
        newStatus = 'failed';
        attemptsRemaining = 0;
        solutionUnlocked = true; // Player can now view case solution upon request
        feedback += ' The commissioner has removed you from the case. The investigation has officially gone cold.';
      }
    }

    const accusationRecord = {
      suspectId,
      suspectName: suspect.name,
      rationale,
      timestamp: new Date(),
      isCorrect,
      feedback
    };

    const updatedSession = await SessionRepository.addAccusation(sessionId, accusationRecord, {
      status: newStatus,
      attemptsRemaining,
      accusedSuspectId: suspectId,
      score,
      rank,
      solutionUnlocked
    });

    res.json({
      success: true,
      correct: isCorrect,
      status: updatedSession.status,
      attemptsRemaining: updatedSession.attemptsRemaining,
      feedback,
      score: updatedSession.score,
      rank: updatedSession.rank,
      solutionUnlocked: updatedSession.solutionUnlocked
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/:sessionId/solution
 * Solution reveal authorization (Requirement 10).
 * Strictly forbids access (403) while case is active.
 * Only grants access (200) once solved or failed.
 */
router.get('/:sessionId/solution', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await SessionRepository.findBySessionId(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: `Session "${sessionId}" not found`,
        code: 'SESSION_NOT_FOUND'
      });
    }

    // Security check: Must not reveal solution while investigation is active!
    if (session.status === 'active' && !session.solutionUnlocked) {
      return res.status(403).json({
        success: false,
        error: 'Solution is locked! You must solve the case or exhaust all attempts before the confidential solution is declassified.',
        code: 'SOLUTION_FORBIDDEN',
        attemptsRemaining: session.attemptsRemaining
      });
    }

    const caseDoc = await CaseRepository.findByCaseId(session.caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        error: 'Case not found',
        code: 'CASE_NOT_FOUND'
      });
    }

    const culprit = caseDoc.suspects.find(s => s.id === caseDoc.solution.culpritId);
    const conclusiveEvidence = caseDoc.evidence.find(e => e.id === caseDoc.solution.conclusiveEvidenceId);

    res.json({
      success: true,
      solution: {
        culpritId: caseDoc.solution.culpritId,
        culpritName: culprit ? culprit.name : 'Unknown',
        culpritOccupation: culprit ? culprit.occupation : '',
        motive: caseDoc.solution.motive,
        method: caseDoc.solution.method,
        conclusiveEvidenceId: caseDoc.solution.conclusiveEvidenceId,
        conclusiveEvidenceTitle: conclusiveEvidence ? conclusiveEvidence.title : '',
        explanation: caseDoc.solution.explanation
      },
      sessionStatus: session.status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/sessions/:sessionId/notes
 * Saves investigator's field notes.
 */
router.patch('/:sessionId/notes', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { notes = '' } = req.body || {};

    const updated = await SessionRepository.update(sessionId, { notes });
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      notes: updated.notes
    });
  } catch (error) {
    next(error);
  }
});

export default router;
