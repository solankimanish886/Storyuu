import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler so thrown errors / rejected promises hit the error middleware.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * Helper for stubbed endpoints during scaffolding — returns 501 with the spec section.
 */
export const stub = (specSection: string, phase: number): RequestHandler => (_req, res) => {
  res.status(501).json({
    error: 'Not Implemented',
    spec: specSection,
    phase,
    message: `Endpoint stubbed in Phase 0; implementation lands in Phase ${phase}.`,
  });
};
