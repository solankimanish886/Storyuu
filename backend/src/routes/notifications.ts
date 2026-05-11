import { Router } from 'express';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../middleware/error.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import {
  registerSSEClient,
  unregisterSSEClient,
} from '../services/notifications.js';

const router = Router();

// ---------------------------------------------------------------------------
// SSE stream — authenticated via ?token= query param because EventSource does
// not support custom Authorization headers. The JWT is verified the same way
// as requireAuth; tokens end up in access logs, which is acceptable over TLS.
// ---------------------------------------------------------------------------
router.get('/stream', asyncHandler(async (req, res) => {
  const token = req.query.token as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  let userId: string;
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
    userId = payload.sub;
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Verify the user exists and is not blocked.
  const user = await User.findById(userId).select('status').lean();
  if (!user || (user as any).status === 'blocked') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx proxy buffering
  res.flushHeaders();

  registerSSEClient(userId, res);

  // Send a heartbeat comment every 25 seconds to keep the connection alive
  // through idle-timeout proxies and load balancers.
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
      (res as any).flush?.();
    } catch {
      // Connection already gone; cleanup handlers below will fire.
    }
  }, 25_000);

  // Guard ensures cleanup runs at most once regardless of which event fires first
  // (req 'close', res 'close', and res 'error' can all signal the same disconnect).
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clearInterval(heartbeat);
    unregisterSSEClient(userId, res);
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
}));

// All routes below require cookie/Bearer auth via middleware.
router.use(requireAuth);

// GET /unread-count — cheap badge query
router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({
      userId: new Types.ObjectId(req.auth!.userId),
      readAt: null,
    });
    res.json({ count });
  }),
);

// GET / — paginated notifications for current user
// Accept ?page=1&limit=25
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));

    const filter = { userId: new Types.ObjectId(userId) };

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: new Types.ObjectId(userId), readAt: null }),
    ]);

    res.json({
      notifications: notifications.map((n) => ({
        id: n._id,
        type: n.type,
        title: n.title,
        body: n.body ?? '',
        imageUrl: (n as any).imageUrl ?? null,
        data: n.data,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      total,
      totalPages: Math.ceil(total / limit),
      page,
      unreadCount,
    });
  }),
);

// POST /read-all — mark all notifications as read for current user
router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await Notification.updateMany(
      { userId: new Types.ObjectId(req.auth!.userId), readAt: null },
      { $set: { readAt: new Date() } },
    );
    res.json({ success: true });
  }),
);

// PATCH /:id/read — mark single notification as read (idempotent)
router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const notification = await Notification.findOneAndUpdate(
      {
        _id: new Types.ObjectId(req.params.id as string),
        userId: new Types.ObjectId(userId),
      },
      { $set: { readAt: new Date() } },
      { new: true },
    );
    if (!notification) throw new HttpError(404, 'Notification not found.');
    res.json({ success: true, readAt: notification.readAt });
  }),
);

// POST /:id/read — kept for backward compat
router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const notification = await Notification.findOneAndUpdate(
      {
        _id: new Types.ObjectId(req.params.id as string),
        userId: new Types.ObjectId(userId),
      },
      { $set: { readAt: new Date() } },
      { new: true },
    );
    if (!notification) throw new HttpError(404, 'Notification not found.');
    res.json({ success: true, readAt: notification.readAt });
  }),
);

export default router;
