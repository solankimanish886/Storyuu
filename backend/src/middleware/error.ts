import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const flat = err.flatten().fieldErrors;
    const firstField = Object.keys(flat)[0];
    const firstMsg = (firstField && flat[firstField]?.[0]) ?? 'Invalid input.';
    return res.status(400).json({ error: firstMsg, issues: flat });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  logger.error({ err, path: req.path, method: req.method }, 'unhandled error');
  res.status(500).json({ error: 'Internal server error. Please try again later.' });
}
