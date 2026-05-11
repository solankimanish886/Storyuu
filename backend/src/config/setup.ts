import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { PolicyDocument, POLICY_TYPES } from '../models/PolicyDocument.js';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Initializes the database with a default admin user if one doesn't exist.
 * This ensures that there is always at least one superadmin account available.
 */
export async function setupDefaultAdmin() {
  const { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } = env;

  if (!DEFAULT_ADMIN_EMAIL || !DEFAULT_ADMIN_PASSWORD) {
    logger.warn('Default admin credentials not configured in environment.');
    return;
  }

  try {
    const existing = await User.findOne({ email: DEFAULT_ADMIN_EMAIL.toLowerCase() });
    
    if (existing) {
      // Admin already exists, skip creation
      return;
    }

    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
    
    await User.create({
      email: DEFAULT_ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: 'superadmin',
      isEmailVerified: true,
    });

    logger.info({ email: DEFAULT_ADMIN_EMAIL }, 'Default admin user successfully created.');
  } catch (err) {
    logger.error({ err }, 'Failed to setup default admin user.');
  }
}

export async function seedPolicyDocuments() {
  try {
    await Promise.all(
      POLICY_TYPES.map((type) =>
        PolicyDocument.updateOne({ type }, { $setOnInsert: { type, content: '', updatedBy: null } }, { upsert: true }),
      ),
    );
    logger.info('Policy documents seeded (idempotent).');
  } catch (err) {
    logger.error({ err }, 'Failed to seed policy documents.');
  }
}
