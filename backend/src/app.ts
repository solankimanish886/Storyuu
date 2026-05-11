import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';

import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import channelRoutes from './routes/channels.js';
import storyRoutes from './routes/stories.js';
import episodeRoutes from './routes/episodes.js';
import voteRoutes from './routes/votes.js';
import subscriptionRoutes, { stripeWebhookHandler } from './routes/subscriptions.js';
import notifyMeRoutes from './routes/notifyMe.js';
import adminRoutes from './routes/admin.js';
import superadminRoutes from './routes/superadmin.js';
import notificationRoutes from './routes/notifications.js';
import healthRoutes from './routes/health.js';
import { publicLegalRouter, adminLegalRouter } from './routes/legal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  const allowedOrigins = env.WEB_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Serve uploaded files (avatars etc.) — no auth required for public image URLs.
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Stripe webhook MUST receive the raw body for signature verification (§12).
  // Mount it before the JSON parser.
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    stripeWebhookHandler,
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Global rate limit — auth endpoints get a tighter limit applied inside the auth router (Phase 1).
  app.use(
    '/api/',
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  // Routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/me', meRoutes);
  app.use('/api/channels', channelRoutes);
  app.use('/api/stories', storyRoutes);
  app.use('/api/episodes', episodeRoutes);
  app.use('/api/votes', voteRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/notify-me', notifyMeRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/legal', adminLegalRouter);
  app.use('/api/superadmin', superadminRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/legal', publicLegalRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
