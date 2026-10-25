import express from 'express';
import { generateMysteryCase } from '../services/gemini.js';
import { CaseRepository } from '../models/Case.js';
import { generationLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/cases/generate
 * Generates a procedural or Gemini-powered mystery case, stores it,
 * and returns the case with the hidden culprit STRIPPED (Requirement 9).
 */
router.post('/generate', generationLimiter, async (req, res, next) => {
  try {
    const { theme = 'Classic Noir', difficulty = 'medium', forceMock = false } = req.body || {};

    const generationResult = await generateMysteryCase({ theme, difficulty, forceMock });
    const savedCase = await CaseRepository.create(generationResult.case);

    // Sanitize case to protect the hidden culprit (Requirement 9)
    const sanitizedCase = CaseRepository.sanitize(savedCase);

    res.status(201).json({
      success: true,
      case: sanitizedCase,
      source: generationResult.source,
      liveVerified: generationResult.liveVerified,
      message: generationResult.liveVerified 
        ? 'Case successfully generated live via Google Gemini API'
        : 'Case generated using procedural mystery engine (mocked/fallback)'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cases
 * Returns list of stored mystery cases (public metadata only).
 */
router.get('/', async (req, res, next) => {
  try {
    const cases = await CaseRepository.findAll();
    const sanitized = cases.map(c => CaseRepository.sanitize(c));
    res.json({
      success: true,
      cases: sanitized,
      count: sanitized.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cases/:caseId
 * Returns a specific mystery case by ID (sanitized - NO solution).
 */
router.get('/:caseId', async (req, res, next) => {
  try {
    const caseDoc = await CaseRepository.findByCaseId(req.params.caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        error: `Mystery case with ID "${req.params.caseId}" not found`,
        code: 'CASE_NOT_FOUND'
      });
    }

    const sanitized = CaseRepository.sanitize(caseDoc);
    res.json({
      success: true,
      case: sanitized
    });
  } catch (error) {
    next(error);
  }
});

export default router;
