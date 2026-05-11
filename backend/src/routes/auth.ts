import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { emailService } from '../services/email.service.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateOpaqueToken,
  hashToken,
} from '../utils/tokens.js';
import { env } from '../config/env.js';
import { OAuth2Client } from 'google-auth-library';

const router = Router();

const googleClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.NODE_ENV === 'production' ? 'https://api.storyuu.com' : 'http://localhost:4000'}/api/auth/google/callback`
);

// §M1.3 — tighter rate limit on auth endpoints (separate from global 300/min)
const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const REFRESH_COOKIE = 'storyuu_refresh';
const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth/refresh' });
}

async function getSubscriptionStatus(userId: string): Promise<string> {
  const now = new Date();
  const sub = await Subscription.findOne({
    userId,
    status: 'active',
    $or: [
      { currentPeriodEnd: { $gte: now } },
      { currentPeriodEnd: { $exists: false } },
      { currentPeriodEnd: null },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();
  return sub ? 'active' : 'none';
}

// ─── POST /check-email  (A0 — availability check before step 1) ──────────────
router.post(
  '/check-email',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const existing = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existing) throw new HttpError(409, 'Email already in use.');
    res.json({ available: true });
  }),
);

// ─── POST /signup-step1  (A1 — email + password) ─────────────────────────────
const step1Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
});

router.post(
  '/signup-step1',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = step1Schema.parse(req.body);

    const existing = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existing) throw new HttpError(409, 'An account with this email already exists.');

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = generateOpaqueToken();

    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
      isEmailVerified: false,
      emailVerificationToken: hashToken(verificationToken),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const accessToken = signAccessToken(String(user.id), String(user.role), 0);
    const refreshToken = signRefreshToken(String(user.id));
    (user as any).refreshTokenHash = hashToken(refreshToken);
    await user.save();

    await emailService.send({
      to: email,
      template: 'verification',
      variables: { token: verificationToken, firstName: '' },
    });

    setRefreshCookie(res, refreshToken);
    res.status(201).json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isFoundingMember: user.isFoundingMember,
        subscriptionStatus: 'none',
      },
    });
  }),
);

// ─── POST /signup  (A2 — complete profile) ───────────────────────────────────
const step2Schema = z.object({
  firstName: z.string().min(1, 'First name is required.').max(100).trim(),
  lastName: z.string().max(100).trim().optional(),
  dateOfBirth: z.string().optional(),
});

router.post(
  '/signup',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { firstName, lastName, dateOfBirth } = step2Schema.parse(req.body);

    const update: Record<string, unknown> = { firstName };
    if (lastName) update.lastName = lastName;
    if (dateOfBirth) update.dateOfBirth = new Date(dateOfBirth);

    const user = await User.findByIdAndUpdate(req.auth!.userId, update, { new: true });
    if (!user) throw new HttpError(404, 'User not found.');

    const subscriptionStatus = await getSubscriptionStatus(user.id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isFoundingMember: user.isFoundingMember,
        subscriptionStatus,
      },
    });
  }),
);

// ─── POST /login  (A3) ────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+passwordHash +failedLoginCount +lockoutUntil',
    );
    if (!user) throw new HttpError(401, 'Invalid email or password.');

    if (user.suspendedAt) throw new HttpError(403, 'This account has been suspended.');
    if ((user as any).status === 'blocked') throw new HttpError(403, 'This account has been blocked. Please contact support.');

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const secs = Math.ceil(((user.lockoutUntil as unknown as Date).getTime() - Date.now()) / 1000);
      throw new HttpError(429, `Account locked. Try again in ${secs} seconds.`);
    }

    const match = await bcrypt.compare(password, (user as any).passwordHash as string);
    if (!match) {
      const newCount = ((user as any).failedLoginCount ?? 0) + 1;
      const upd: Record<string, unknown> = { failedLoginCount: newCount };
      if (newCount >= LOCKOUT_ATTEMPTS) {
        upd.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        upd.failedLoginCount = 0;
        await User.updateOne({ _id: user._id }, upd);
        throw new HttpError(429, 'Too many failed attempts. Account locked for 15 minutes.');
      }
      await User.updateOne({ _id: user._id }, upd);
      throw new HttpError(401, 'Invalid email or password.');
    }

    const accessToken = signAccessToken(String(user.id), String(user.role), (user as any).tokenVersion ?? 0);
    const refreshToken = signRefreshToken(String(user.id));

    await User.updateOne(
      { _id: user._id },
      { failedLoginCount: 0, lockoutUntil: null, refreshTokenHash: hashToken(refreshToken), lastActiveAt: new Date() },
    );

    setRefreshCookie(res, refreshToken);
    const subscriptionStatus = await getSubscriptionStatus(user.id);
    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isFoundingMember: user.isFoundingMember,
        subscriptionStatus,
      },
    });
  }),
);

// ─── POST /logout ─────────────────────────────────────────────────────────────
router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await User.updateOne({ _id: req.auth!.userId }, { $unset: { refreshTokenHash: 1 } });
    clearRefreshCookie(res);
    res.status(204).end();
  }),
);

// ─── POST /refresh ────────────────────────────────────────────────────────────
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token: string | undefined = req.cookies[REFRESH_COOKIE];
    if (!token) throw new HttpError(401, 'No refresh token.');

    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new HttpError(401, 'Invalid or expired refresh token.');
    }

    const user = await User.findById(payload.sub).select('+refreshTokenHash');
    if (!user || (user as any).refreshTokenHash !== hashToken(token)) {
      throw new HttpError(401, 'Refresh token revoked.');
    }

    const accessToken = signAccessToken(String(user.id), String(user.role), (user as any).tokenVersion ?? 0);
    const newRefresh = signRefreshToken(String(user.id));
    await User.updateOne({ _id: user._id }, { refreshTokenHash: hashToken(newRefresh) });
    setRefreshCookie(res, newRefresh);

    res.json({ accessToken });
  }),
);

// ─── POST /forgot-password  (A4) ──────────────────────────────────────────────
const forgotSchema = z.object({ email: z.string().email() });

router.post(
  '/forgot-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = forgotSchema.parse(req.body);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new HttpError(404, 'No account found with this email address.');
    }

    const token = generateOpaqueToken();
    await User.updateOne(
      { _id: user._id },
      {
        passwordResetToken: hashToken(token),
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
      },
    );
    await emailService.send({
      to: email,
      template: 'password_reset',
      variables: { token, firstName: String(user.firstName ?? '') },
    });

    // §M1.4 — trigger n8n webhook for password reset
    const webhookUrl = env.NODE_ENV === 'production' ? env.N8N_WEBHOOK_PROD_URL : env.N8N_WEBHOOK_TEST_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.toLowerCase(),
            token,
            firstName: user.firstName,
            resetUrl: `${env.WEB_ORIGIN.split(',')[0].trim()}/reset-password?token=${token}`,
            action: 'password_reset',
          }),
        });
      } catch (err) {
        // Log but don't block the user response
        console.error('[Webhook Error]: Failed to trigger n8n forgot-password workflow', err);
      }
    }

    res.json({ message: 'A reset link has been sent to your email.' });
  }),
);

// ─── POST /reset-password  (A6) ───────────────────────────────────────────────
const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
});

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password } = resetSchema.parse(req.body);

    const user = await User.findOne({
      passwordResetToken: hashToken(token),
      passwordResetExpires: { $gt: new Date() },
    });
    if (!user) throw new HttpError(400, 'Invalid or expired reset token.');

    const passwordHash = await bcrypt.hash(password, 12);
    await User.updateOne(
      { _id: user._id },
      { passwordHash, $unset: { passwordResetToken: 1, passwordResetExpires: 1 } },
    );

    res.json({ message: 'Password reset successfully. You can now log in.' });
  }),
);

// ─── POST /verify-email  (§3.3) ───────────────────────────────────────────────
const verifyEmailSchema = z.object({ token: z.string().min(1) });

router.post(
  '/verify-email',
  asyncHandler(async (req, res) => {
    const { token } = verifyEmailSchema.parse(req.body);

    const user = await User.findOne({
      emailVerificationToken: hashToken(token),
      emailVerificationExpires: { $gt: new Date() },
    });
    if (!user) throw new HttpError(400, 'Invalid or expired verification token.');

    await User.updateOne(
      { _id: user._id },
      { isEmailVerified: true, $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 } },
    );

    res.json({ message: 'Email verified successfully.' });
  }),
);

// ─── GET /google  (A12 — Social Auth) ──────────────────────────────────────────
router.get('/google', (_req, res) => {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new HttpError(501, 'Google OAuth is not configured.');
  }

  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'select_account',
  });
  res.redirect(url);
});

// ─── GET /google/callback ──────────────────────────────────────────────────────
router.get(
  '/google/callback',
  asyncHandler(async (req, res) => {
    const { code } = req.query;
    if (!code) throw new HttpError(400, 'Missing authorization code.');

    const { tokens } = await googleClient.getToken(code as string);
    googleClient.setCredentials(tokens);

    const { data } = await googleClient.request<{
      email: string;
      name: string;
      sub: string;
      picture?: string;
    }>({
      url: 'https://www.googleapis.com/oauth2/v3/userinfo',
    });

    if (!data.email) throw new HttpError(400, 'Google account missing email.');

    let user = await User.findOne({ email: data.email.toLowerCase() });

    if (user) {
      // Link existing account if not already linked
      if (!user.googleId) {
        user.googleId = data.sub;
        if (!user.avatarUrl && data.picture) user.avatarUrl = data.picture;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        email: data.email.toLowerCase(),
        firstName: data.name.split(' ')[0] || 'User',
        lastName: data.name.split(' ').slice(1).join(' '),
        googleId: data.sub,
        isEmailVerified: true, // Trusted from Google
        avatarUrl: data.picture,
      });
      await user.save();
    }

    if (user.suspendedAt) throw new HttpError(403, 'This account has been suspended.');
    if ((user as any).status === 'blocked') throw new HttpError(403, 'This account has been blocked. Please contact support.');

    const accessToken = signAccessToken(String(user.id), String(user.role), (user as any).tokenVersion ?? 0);
    const refreshToken = signRefreshToken(String(user.id));
    setRefreshCookie(res, refreshToken);
    await User.updateOne(
      { _id: user._id },
      { refreshTokenHash: hashToken(refreshToken), lastActiveAt: new Date() },
    );

    // Redirect to frontend auth handler
    res.redirect(`${env.WEB_ORIGIN.split(',')[0].trim()}/auth/callback?token=${accessToken}`);
  }),
);

export default router;
