import { Router } from 'express';
import { Types } from 'mongoose';
import Stripe from 'stripe';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../middleware/error.js';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { Vote } from '../models/Vote.js';
import { VoteQuestion } from '../models/VoteQuestion.js';
import { ReadingProgress } from '../models/ReadingProgress.js';
import { Episode } from '../models/Episode.js';
import { Story } from '../models/Story.js';
import { Channel } from '../models/Channel.js';
import { AuditLog } from '../models/AuditLog.js';
import { env } from '../config/env.js';

const router = Router();
router.use(requireAuth, requireRole('superadmin'));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assertNotSuperAdmin(targetRole: string) {
  if (targetRole === 'superadmin') {
    throw new HttpError(403, 'Cannot perform this action on a super admin.');
  }
}

// ─── Users list ──────────────────────────────────────────────────────────────

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const search = req.query.search as string | undefined;

    const filter: Record<string, unknown> = {};
    if (search) {
      // Escape regex special characters from user input
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      filter.$or = [{ email: re }, { firstName: re }, { lastName: re }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('email firstName lastName role isEmailVerified isFoundingMember status suspendedAt createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      users: users.map((u) => ({
        id: u._id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isEmailVerified: u.isEmailVerified,
        isFoundingMember: u.isFoundingMember,
        status: (u as any).status ?? 'active',
        suspendedAt: u.suspendedAt,
        createdAt: u.createdAt,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  }),
);

// ─── User detail ─────────────────────────────────────────────────────────────

router.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;

    const user = await User.findById(targetId)
      .select('email firstName lastName role isEmailVerified isFoundingMember status suspendedAt suspendedReason createdAt updatedAt lastActiveAt avatarUrl preferences')
      .lean();
    if (!user) throw new HttpError(404, 'User not found.');

    // Superadmin protection — detail view is allowed for all roles (read-only).
    // Actions on superadmins are blocked at the action endpoints.

    const subscription = await Subscription.findOne({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      user: {
        ...user,
        id: user._id,
        status: (user as any).status ?? 'active',
      },
      subscription,
    });
  }),
);

// ─── User votes ───────────────────────────────────────────────────────────────

router.get(
  '/users/:id/votes',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 25;

    const [votes, total] = await Promise.all([
      Vote.find({ userId: req.params.id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Vote.countDocuments({ userId: req.params.id }),
    ]);

    if (!votes.length) return res.json({ votes: [], total: 0, pages: 0, page });

    const questionIds = votes.map((v) => v.voteQuestionId);
    const questions = await VoteQuestion.find({ _id: { $in: questionIds } }).lean();
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    const episodeIds = questions.map((q) => q.episodeId);
    const episodes = await Episode.find({ _id: { $in: episodeIds } }).lean();
    const episodeMap = new Map(episodes.map((e) => [e._id.toString(), e]));

    const storyIds = [...new Set(episodes.map((e) => (e as any).storyId.toString()))];
    const stories = await Story.find({ _id: { $in: storyIds } }).lean();
    const storyMap = new Map(stories.map((s) => [s._id.toString(), s]));

    const formatted = votes.map((v) => {
      const question = questionMap.get(v.voteQuestionId.toString());
      const episode = question ? episodeMap.get(question.episodeId.toString()) : null;
      const story = episode ? storyMap.get((episode as any).storyId.toString()) : null;
      const choice = question?.choices?.[v.choiceIndex];

      return {
        id: v._id,
        choiceIndex: v.choiceIndex,
        choiceTitle: choice?.title ?? `Option ${v.choiceIndex + 1}`,
        createdAt: (v as any).createdAt,
        question: question ? { id: question._id, text: question.question } : null,
        episode: episode ? { id: episode._id, title: (episode as any).title } : null,
        story: story ? { id: story._id, title: story.title } : null,
      };
    });

    res.json({ votes: formatted, total, page, pages: Math.ceil(total / limit) });
  }),
);

// ─── User activity (reading progress) ────────────────────────────────────────

router.get(
  '/users/:id/activity',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 25;

    const [progresses, total] = await Promise.all([
      ReadingProgress.find({ userId: req.params.id })
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ReadingProgress.countDocuments({ userId: req.params.id }),
    ]);

    if (!progresses.length) return res.json({ activity: [], total: 0, pages: 0, page });

    const episodeIds = progresses.map((p) => p.episodeId);
    const episodes = await Episode.find({ _id: { $in: episodeIds } }).lean();
    const episodeMap = new Map(episodes.map((e) => [e._id.toString(), e]));

    const storyIds = [...new Set(progresses.map((p) => p.storyId.toString()))];
    const stories = await Story.find({ _id: { $in: storyIds } }).lean();
    const storyMap = new Map(stories.map((s) => [s._id.toString(), s]));

    const channelIds = [...new Set(stories.map((s) => (s as any).channelId.toString()))];
    const channels = await Channel.find({ _id: { $in: channelIds } }).lean();
    const channelMap = new Map(channels.map((c) => [c._id.toString(), c]));

    const formatted = progresses.map((p) => {
      const episode = episodeMap.get(p.episodeId.toString());
      const story = storyMap.get(p.storyId.toString());
      const channel = story ? channelMap.get((story as any).channelId.toString()) : null;
      return {
        id: p._id,
        mode: p.mode,
        position: p.position,
        completedAt: p.completedAt,
        updatedAt: (p as any).updatedAt,
        episode: episode ? { id: episode._id, title: (episode as any).title, number: (episode as any).number } : null,
        story: story ? { id: story._id, title: story.title, coverImageUrl: (story as any).coverImageUrl ?? null } : null,
        channel: channel ? { id: channel._id, name: (channel as any).name } : null,
      };
    });

    res.json({ activity: formatted, total, page, pages: Math.ceil(total / limit) });
  }),
);

// ─── User payment history (stub — Stripe integration pending) ─────────────────

router.get(
  '/users/:id/payments',
  asyncHandler(async (_req, res) => {
    // Full Stripe payment history requires fetching invoices via the customer's
    // stripeCustomerId. Stripe integration for this specific endpoint is pending.
    res.json({ payments: [], total: 0, note: 'Payment history via Stripe not yet integrated.' });
  }),
);

// ─── Change user status (block / unblock) ────────────────────────────────────

router.patch(
  '/users/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = req.body as { status?: string };
    if (status !== 'active' && status !== 'blocked') {
      throw new HttpError(400, "status must be 'active' or 'blocked'.");
    }

    const targetUser = await User.findById(req.params.id).select('role status tokenVersion');
    if (!targetUser) throw new HttpError(404, 'User not found.');
    assertNotSuperAdmin(String(targetUser.role));

    // Increment tokenVersion whenever status changes, ensuring all existing
    // JWTs (which carry the old tv value) become invalid on next request.
    const newTokenVersion = ((targetUser as any).tokenVersion ?? 0) + 1;

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { status, tokenVersion: newTokenVersion } },
      { new: true },
    ).select('email firstName lastName role status tokenVersion');
    if (!updated) throw new HttpError(404, 'User not found.');

    res.json({ user: { id: updated._id, email: updated.email, status, tokenVersion: newTokenVersion } });
  }),
);

// ─── Delete user (hard delete with cascade) ───────────────────────────────────

router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const targetUser = await User.findById(req.params.id).select('role email');
    if (!targetUser) throw new HttpError(404, 'User not found.');
    assertNotSuperAdmin(String(targetUser.role));

    const deletedEmail = targetUser.email;
    const userId = new Types.ObjectId(req.params.id);

    // Step 1: Delete all votes by this user and collect affected question IDs
    const userVotes = await Vote.find({ userId }).select('voteQuestionId').lean();
    const affectedQuestionIds = [...new Set(userVotes.map((v) => v.voteQuestionId.toString()))];
    const deleteVotesResult = await Vote.deleteMany({ userId });

    // Step 2: VoteQuestion tallies are computed dynamically from Vote docs — no
    // cached counts to update. Deletion of Vote docs is sufficient.

    // Step 3: Archive subscription records (retain for financial audit)
    const archiveResult = await Subscription.updateMany(
      { userId },
      {
        $set: {
          userId: null,
          _archivedUserEmail: deletedEmail,
          _archivedAt: new Date(),
        },
      },
    );

    // Step 4: Delete the user document
    await User.findByIdAndDelete(userId);

    const summary = {
      deletedVotes: deleteVotesResult.deletedCount,
      affectedVoteQuestions: affectedQuestionIds.length,
      archivedSubscriptions: archiveResult.modifiedCount,
    };

    console.log(`[UserDelete] Deleted user ${deletedEmail} (${req.params.id}). Cascade: ${JSON.stringify(summary)}`);

    res.json({ success: true, summary });
  }),
);

// ─── Existing action endpoints (kept for backward compat) ────────────────────

router.post(
  '/users/:id/suspend',
  asyncHandler(async (req, res) => {
    const { reason } = req.body as { reason?: string };
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { suspendedAt: new Date(), suspendedReason: reason ?? null } },
      { new: true },
    ).select('email firstName lastName role suspendedAt suspendedReason');
    if (!user) throw new HttpError(404, 'User not found.');
    res.json({ user });
  }),
);

router.post(
  '/users/:id/unsuspend',
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { suspendedAt: null, suspendedReason: null } },
      { new: true },
    ).select('email firstName lastName role suspendedAt');
    if (!user) throw new HttpError(404, 'User not found.');
    res.json({ user });
  }),
);

router.post(
  '/users/:id/comp-subscription',
  asyncHandler(async (req, res) => {
    const { months } = req.body as { months: number };
    if (!months || months < 1) throw new HttpError(400, 'months must be a positive integer.');

    const user = await User.findById(req.params.id, { _id: 1 });
    if (!user) throw new HttpError(404, 'User not found.');

    const now = new Date();
    const periodEnd = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);

    const subscription = await Subscription.findOneAndUpdate(
      { userId: user._id, plan: 'comp' },
      {
        $set: {
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          grantedByUserId: new Types.ObjectId(req.auth!.userId),
        },
      },
      { upsert: true, new: true },
    );
    res.json({ subscription });
  }),
);

router.post(
  '/users/:id/promote',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('role');
    if (!user) throw new HttpError(404, 'User not found.');
    if (user.role !== 'reader') {
      throw new HttpError(400, `User role is '${user.role}'; only readers can be promoted to admin.`);
    }
    user.role = 'admin';
    await user.save();
    res.json({ user: { id: user._id, role: user.role } });
  }),
);

router.post(
  '/users/:id/demote',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('role');
    if (!user) throw new HttpError(404, 'User not found.');
    if (user.role !== 'admin') {
      throw new HttpError(400, `User role is '${user.role}'; only admins can be demoted to reader.`);
    }
    user.role = 'reader';
    await user.save();
    res.json({ user: { id: user._id, role: user.role } });
  }),
);

router.post('/users/:id/refund', asyncHandler(async (_req, res) => {
  res.json({ success: true, message: 'Refund initiated. Complete via Stripe dashboard.' });
}));

// ─── Audit Log ────────────────────────────────────────────────────────────────

router.get(
  '/audit-log',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));

    const [entries, total] = await Promise.all([
      AuditLog.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(),
    ]);

    res.json({ entries, total, page, pages: Math.ceil(total / limit) });
  }),
);

// ─── Settings stubs ───────────────────────────────────────────────────────────

router.get('/settings/pricing', (_req, res) => {
  res.json({ monthly: 7.99, yearly: 59.99 });
});
router.put('/settings/pricing', (_req, res) => {
  res.json({ success: true });
});
router.get('/settings/emails/:templateKey', (req, res) => {
  res.json({ templateKey: req.params.templateKey, subject: '', body: '' });
});
router.put('/settings/emails/:templateKey', (req, res) => {
  res.json({ success: true, templateKey: req.params.templateKey });
});
router.get('/settings/legal/:doc', (req, res) => {
  res.json({ doc: req.params.doc, content: '' });
});
router.put('/settings/legal/:doc', (req, res) => {
  res.json({ success: true, doc: req.params.doc });
});

// ─── Revenue helpers ──────────────────────────────────────────────────────────

const MONTHLY_USD = 7.99;
const YEARLY_USD  = 59.99;

let _stripeClient: Stripe | null | undefined; // undefined = not yet initialised
function getStripe(): Stripe | null {
  if (_stripeClient !== undefined) return _stripeClient;
  _stripeClient = env.STRIPE_SECRET_KEY
    ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-10-28.acacia' as any })
    : null;
  return _stripeClient;
}

function planToMrr(plan: string): number {
  if (plan === 'monthly') return MONTHLY_USD;
  if (plan === 'yearly')  return YEARLY_USD / 12;
  return 0;
}

function parseRange(range: string): { start: Date; end: Date; prevStart: Date } {
  const now = new Date();
  let start: Date;
  let prevStart: Date;
  if (range === '7d') {
    start     = new Date(now.getTime() - 7  * 86_400_000);
    prevStart = new Date(start.getTime() - 7  * 86_400_000);
  } else if (range === '90d') {
    start     = new Date(now.getTime() - 90 * 86_400_000);
    prevStart = new Date(start.getTime() - 90 * 86_400_000);
  } else if (range === '12m') {
    start     = new Date(now);  start.setFullYear(start.getFullYear() - 1);
    prevStart = new Date(start); prevStart.setFullYear(prevStart.getFullYear() - 1);
  } else if (range === 'all') {
    start = new Date(0); prevStart = new Date(0);
  } else {
    // 30d default
    start     = new Date(now.getTime() - 30 * 86_400_000);
    prevStart = new Date(start.getTime() - 30 * 86_400_000);
  }
  return { start, end: now, prevStart };
}

// ─── GET /revenue/kpis ────────────────────────────────────────────────────────

router.get('/revenue/kpis', asyncHandler(async (req, res) => {
  const range = String(req.query.range || '30d');
  const { start, end, prevStart } = parseRange(range);

  const activeSubs = await Subscription.find({ status: 'active' }).select('plan').lean();
  const mrr      = activeSubs.reduce((s, sub) => s + planToMrr(sub.plan), 0);
  const monthly  = activeSubs.filter(s => s.plan === 'monthly').length;
  const yearly   = activeSubs.filter(s => s.plan === 'yearly').length;

  const [newThisPeriod, prevPeriodNew, churnCount] = await Promise.all([
    Subscription.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Subscription.countDocuments({ createdAt: { $gte: prevStart, $lt: start } }),
    Subscription.countDocuments({ status: 'cancelled', updatedAt: { $gte: start, $lte: end } }),
  ]);

  const churnBase = activeSubs.length + churnCount;
  const churnRate = churnBase > 0 ? +((churnCount / churnBase) * 100).toFixed(1) : 0;

  res.json({
    mrr: +mrr.toFixed(2),
    activeSubscribers: { total: activeSubs.length, monthly, yearly },
    newThisPeriod,
    prevPeriodNew,
    churnCount,
    churnRate,
  });
}));

// ─── GET /revenue/mrr-trend ───────────────────────────────────────────────────

router.get('/revenue/mrr-trend', asyncHandler(async (req, res) => {
  const range = String(req.query.range || '30d');
  const { start, end } = parseRange(range);

  const bucketFmt: 'day' | 'week' | 'month' =
    range === '12m' || range === 'all' ? 'month' :
    range === '90d'                    ? 'week'  : 'day';

  const allSubs = await Subscription
    .find({ plan: { $in: ['monthly', 'yearly'] } })
    .select('plan status createdAt updatedAt')
    .lean();

  if (!allSubs.length) return res.json({ points: [] });

  // For 'all', start from earliest subscription instead of epoch
  let trendStart = start;
  if (range === 'all') {
    const minMs = allSubs.reduce(
      (m, s) => Math.min(m, (s.createdAt as Date).getTime()), Date.now(),
    );
    trendStart = new Date(minMs);
  }

  // Generate bucket boundaries
  const cur = new Date(trendStart);
  if (bucketFmt === 'month') {
    cur.setDate(1); cur.setHours(0, 0, 0, 0);
  } else if (bucketFmt === 'week') {
    const d = cur.getDay();
    cur.setDate(cur.getDate() - (d === 0 ? 6 : d - 1));
    cur.setHours(0, 0, 0, 0);
  } else {
    cur.setHours(0, 0, 0, 0);
  }

  const buckets: { key: string; bStart: Date; bEnd: Date }[] = [];
  while (cur <= end) {
    const bStart = new Date(cur);
    let bEnd: Date;
    if (bucketFmt === 'day') {
      bEnd = new Date(cur); bEnd.setDate(bEnd.getDate() + 1); cur.setDate(cur.getDate() + 1);
    } else if (bucketFmt === 'week') {
      bEnd = new Date(cur); bEnd.setDate(bEnd.getDate() + 7); cur.setDate(cur.getDate() + 7);
    } else {
      bEnd = new Date(cur); bEnd.setMonth(bEnd.getMonth() + 1); cur.setMonth(cur.getMonth() + 1);
    }
    buckets.push({
      key: bucketFmt === 'month'
        ? bStart.toISOString().slice(0, 7)
        : bStart.toISOString().slice(0, 10),
      bStart,
      bEnd,
    });
  }

  // For each bucket: sum MRR of subscriptions active during it
  const points = buckets.map(({ key, bStart, bEnd }) => {
    const mrr = allSubs.reduce((sum, s) => {
      const created   = (s.createdAt as Date).getTime();
      const cancelled = (s.updatedAt  as Date).getTime();
      if (created >= bEnd.getTime()) return sum;           // not yet created
      if (s.status === 'active')     return sum + planToMrr(s.plan);
      if (s.status === 'cancelled' && cancelled >= bStart.getTime())
        return sum + planToMrr(s.plan);
      return sum;
    }, 0);
    return { date: key, mrr: +mrr.toFixed(2) };
  });

  res.json({ points });
}));

// ─── GET /revenue/transactions ────────────────────────────────────────────────

router.get('/revenue/transactions', asyncHandler(async (req, res) => {
  const range     = String(req.query.range  || '30d');
  const status    = String(req.query.status || 'all');
  const page      = Math.max(1, parseInt(String(req.query.page || '1')));
  const limit     = 25;
  const { start, end } = parseRange(range);

  const stripe = getStripe();
  if (!stripe) return res.json({ transactions: [], total: 0, page: 1, totalPages: 0 });

  const invoiceList = await stripe.invoices.list({
    created: {
      gte: Math.floor(start.getTime() / 1000),
      lte: Math.floor(end.getTime()   / 1000),
    },
    limit: 100,
  });

  const customerIds = [
    ...new Set(
      invoiceList.data
        .map(inv => (typeof inv.customer === 'string' ? inv.customer : null))
        .filter((id): id is string => id !== null),
    ),
  ];

  type PopulatedUser = { _id: Types.ObjectId; firstName?: string; lastName?: string } | null;
  const subs = customerIds.length
    ? await Subscription
        .find({ stripeCustomerId: { $in: customerIds } })
        .populate<{ userId: PopulatedUser }>('userId', 'firstName lastName')
        .lean()
    : [];

  const customerMap = new Map(subs.map(s => [s.stripeCustomerId, s]));

  const all = invoiceList.data
    .filter(inv => (inv.amount_due > 0 || inv.amount_paid > 0))
    .map(inv => {
      const customerId = typeof inv.customer === 'string' ? inv.customer : null;
      const sub  = customerId ? customerMap.get(customerId) : undefined;
      const user = sub?.userId as PopulatedUser | undefined;

      const txStatus: 'paid' | 'failed' | 'refunded' =
        inv.status === 'void' ? 'refunded' :
        inv.status === 'paid' ? 'paid' : 'failed';

      const amount = (inv.amount_paid > 0 ? inv.amount_paid : inv.amount_due) / 100;
      // Rough plan detection: yearly charge is > midpoint between monthly and yearly price
      const plan: 'monthly' | 'yearly' =
        amount > (MONTHLY_USD + YEARLY_USD) / 2 ? 'yearly' : 'monthly';

      return {
        id:   inv.id,
        date: new Date(inv.created * 1000).toISOString(),
        user: user
          ? { id: String(user._id), name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown' }
          : { id: null as string | null, name: 'Unknown User' },
        plan,
        amount,
        status: txStatus,
      };
    });

  const filtered = status === 'all' ? all : all.filter(t => t.status === status);
  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = filtered.length;
  res.json({
    transactions: filtered.slice((page - 1) * limit, page * limit),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}));

export default router;
