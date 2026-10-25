import rateLimit from 'express-rate-limit';

// Standard rate limiter for all general API endpoints
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP address, please try again in 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Stricter rate limiter specifically for LLM mystery generation
export const generationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Mystery generation rate limit reached. Please wait a few minutes before generating another case.',
    code: 'GENERATION_RATE_LIMIT_EXCEEDED'
  }
});

// Stricter rate limiter for accusations to prevent brute-forcing
export const accusationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many accusation attempts in a short interval. Please analyze the clues carefully before proceeding.',
    code: 'ACCUSATION_RATE_LIMIT_EXCEEDED'
  }
});
