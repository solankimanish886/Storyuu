import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from './error.js';
import { User } from '../models/User.js';

export type Role = 'reader' | 'admin' | 'superadmin';

type AccessTokenPayload = {
  sub: string;
  role: Role;
  tv?: number; // tokenVersion — optional for backward compat with tokens issued pre-Bug11
};

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Unauthorized'));
  }

  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    return next(new HttpError(401, 'Unauthorized'));
  }

  // DB lookup to enforce real-time status and token invalidation.
  // One query per authenticated request; future optimization: short-TTL cache.
  User.findById(payload.sub).select('status tokenVersion').lean()
    .then((user) => {
      if (!user) return next(new HttpError(401, 'Unauthorized'));

      if ((user as any).status === 'blocked') {
        return next(new HttpError(401, 'ACCOUNT_BLOCKED'));
      }

      // Only check tokenVersion if the JWT carries the tv claim (tokens issued post-Bug11)
      const userTv = (user as any).tokenVersion as number | undefined;
      if (typeof payload.tv === 'number' && typeof userTv === 'number' && payload.tv !== userTv) {
        return next(new HttpError(401, 'TOKEN_INVALIDATED'));
      }

      req.auth = { userId: payload.sub, role: payload.role };
      next();
    })
    .catch((err) => next(err));
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new HttpError(401, 'Unauthorized'));
    if (!roles.includes(req.auth.role)) return next(new HttpError(403, 'INSUFFICIENT_ROLE'));
    next();
  };
}

/** Convenience middleware that restricts to superadmin only. */
export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(new HttpError(401, 'Unauthorized'));
  if (req.auth.role !== 'superadmin') return next(new HttpError(403, 'INSUFFICIENT_ROLE'));
  next();
}
