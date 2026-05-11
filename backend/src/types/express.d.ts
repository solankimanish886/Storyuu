import type { Role } from '../middleware/auth.js';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: Role;
      };
    }
  }
}

export {};
