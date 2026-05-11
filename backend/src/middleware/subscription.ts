import type { Request, Response, NextFunction } from 'express';
import { Subscription } from '../models/Subscription.js';
import { HttpError } from './error.js';

export async function requireSubscription(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!req.auth) return next(new HttpError(401, 'Unauthorized'));

  const sub = await Subscription.findOne({
    userId: req.auth.userId,
    status: 'active',
    currentPeriodEnd: { $gte: new Date() },
  }).lean();

  if (!sub) return next(new HttpError(402, 'Active subscription required.'));
  next();
}
