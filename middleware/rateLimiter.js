// middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

// Limit: 10 requests per 15 minutes per IP
const tagSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many tag submissions from this IP. Please try again later.' }
});

// Limit: 5 login attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' }
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts. Please try again later.' }
});

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many verification email requests. Please try again later.' }
});

export { loginLimiter, tagSubmissionLimiter, registerLimiter, resendLimiter };