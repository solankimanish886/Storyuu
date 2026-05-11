import { Router } from 'express';
import express from 'express';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { stripeService, type StripePlanId } from '../services/stripe.service.js';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

// GET /api/subscriptions/me — return the caller's most recent subscription
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sub = await Subscription.findOne({ userId: new Types.ObjectId(req.auth!.userId) })
      .sort({ createdAt: -1 })
      .lean();

    if (!sub) {
      return res.json({ subscription: null });
    }

    res.json({
      subscription: {
        id: (sub._id as Types.ObjectId).toString(),
        plan: sub.plan,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      },
    });
  }),
);

// POST /api/subscriptions/checkout — create a Stripe Checkout session and return the URL
router.post(
  '/checkout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { plan } = req.body as { plan: StripePlanId };

    if (!['monthly', 'yearly'].includes(plan)) {
      throw new HttpError(400, 'Invalid plan. Must be "monthly" or "yearly".');
    }

    const user = await User.findById(req.auth!.userId);
    if (!user) throw new HttpError(404, 'User not found.');
    const origin = env.WEB_ORIGIN.split(',')[0].trim();

    const session = await stripeService.createCheckoutSession({
      userId: String(user.id),
      email: String(user.email),
      plan,
      successUrl: `${origin}/home?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/subscribe?canceled=true`,
    });

    res.json({ url: session.url });
  }),
);

// POST /api/subscriptions/complete — verify a Stripe checkout session and persist the subscription.
// Called by the frontend on the success redirect page. Idempotent: safe even if the webhook
// fires later and re-upserts the same record.
router.post(
  '/complete',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.body as { sessionId: string };
    if (!sessionId?.startsWith('cs_')) throw new HttpError(400, 'Invalid sessionId.');

    const userId = req.auth!.userId;

    const session = await stripeService.retrieveCheckoutSession(sessionId);

    // Confirm the payment was actually successful
    if (session.payment_status !== 'paid') {
      throw new HttpError(402, 'Payment not completed.');
    }

    // Confirm this session belongs to the authenticated user
    if (session.client_reference_id !== userId) {
      throw new HttpError(403, 'Session does not belong to this account.');
    }

    const plan = session.metadata?.plan as 'monthly' | 'yearly' | undefined;
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      throw new HttpError(400, 'Plan missing from session metadata.');
    }

    const stripeSubscriptionId =
      typeof session.subscription === 'string' ? session.subscription : null;
    const stripeCustomerId =
      typeof session.customer === 'string' ? session.customer : null;

    const sub = await Subscription.findOneAndUpdate(
      // Key on stripeSubscriptionId so this is idempotent with the webhook
      stripeSubscriptionId
        ? { stripeSubscriptionId }
        : { userId: new Types.ObjectId(userId), plan },
      {
        $setOnInsert: { userId: new Types.ObjectId(userId), plan },
        $set: {
          status: 'active',
          ...(stripeCustomerId && { stripeCustomerId }),
          ...(stripeSubscriptionId && { stripeSubscriptionId }),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(
            Date.now() + (plan === 'yearly' ? 365 : 30) * 86_400_000,
          ),
          cancelAtPeriodEnd: false,
        },
      },
      { upsert: true, new: true },
    );

    res.json({
      subscription: {
        id: sub._id.toString(),
        plan: sub.plan,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      },
    });
  }),
);

// POST /api/subscriptions/cancel — cancel at period end
router.post(
  '/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sub = await Subscription.findOne({
      userId: req.auth!.userId,
      status: 'active',
    }).sort({ createdAt: -1 });

    if (!sub) throw new HttpError(404, 'No active subscription found.');

    if (sub.stripeSubscriptionId) {
      await stripeService.cancelSubscription(sub.stripeSubscriptionId, true);
    }

    sub.cancelAtPeriodEnd = true;
    await sub.save();

    res.json({
      success: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: sub.currentPeriodEnd,
    });
  }),
);

// GET /api/subscriptions/portal — create a Stripe Customer Portal session
router.get(
  '/portal',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sub = await Subscription.findOne({
      userId: req.auth!.userId,
      stripeCustomerId: { $exists: true, $ne: null },
    }).sort({ createdAt: -1 });

    if (!sub?.stripeCustomerId) {
      throw new HttpError(
        404,
        'No billing record found. Please contact support if you believe this is an error.',
      );
    }

    const returnUrl = `${env.WEB_ORIGIN.split(',')[0].trim()}/profile`;
    const { url } = await stripeService.createCustomerPortalSession(
      sub.stripeCustomerId,
      returnUrl,
    );

    res.json({ url });
  }),
);

// POST /api/subscriptions/resume — undo cancel-at-period-end
router.post(
  '/resume',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sub = await Subscription.findOne({
      userId: req.auth!.userId,
      status: 'active',
    }).sort({ createdAt: -1 });

    if (!sub) throw new HttpError(404, 'No active subscription found.');
    if (!sub.cancelAtPeriodEnd) throw new HttpError(400, 'Subscription is not scheduled for cancellation.');

    if (sub.stripeSubscriptionId) {
      await stripeService.resumeSubscription(sub.stripeSubscriptionId);
    }

    sub.cancelAtPeriodEnd = false;
    await sub.save();

    res.json({
      subscription: {
        id: sub._id.toString(),
        plan: sub.plan,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      },
    });
  }),
);

// POST /api/subscriptions/portal-session — create a Stripe Customer Portal session
router.post(
  '/portal-session',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sub = await Subscription.findOne({
      userId: req.auth!.userId,
      stripeCustomerId: { $exists: true, $ne: null },
    }).sort({ createdAt: -1 });

    if (!sub?.stripeCustomerId) {
      throw new HttpError(
        404,
        'No billing record found. Please contact support if you believe this is an error.',
      );
    }

    const returnUrl = `${env.WEB_ORIGIN.split(',')[0].trim()}/profile`;
    let url: string;
    try {
      ({ url } = await stripeService.createCustomerPortalSession(
        sub.stripeCustomerId,
        returnUrl,
      ));
      console.log('[portal-session] session created: userId=%s id=%s url=%s', req.auth!.userId, url.split('/').pop(), url);
    } catch (err: any) {
      console.error('[portal-session] Stripe error userId=%s customerId=%s: %s (type=%s code=%s)', req.auth!.userId, sub.stripeCustomerId, err?.message ?? err, err?.type, err?.code);
      throw new HttpError(502, err?.message ?? 'Failed to open billing portal. Please try again.');
    }

    res.json({ url });
  }),
);

// POST /api/webhooks/stripe — Stripe webhook (mounted before JSON middleware in app.ts)
export const stripeWebhookHandler = asyncHandler(
  async (req: express.Request, res: express.Response) => {
    const signature = req.headers['stripe-signature'] as string;
    let event;

    try {
      event = await stripeService.verifyWebhook(req.body, signature);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.client_reference_id;
        const plan = session.metadata?.plan;
        const stripeSubscriptionId = session.subscription;
        const stripeCustomerId = session.customer;

        if (userId && plan) {
          // Upsert so duplicate events are idempotent
          await Subscription.findOneAndUpdate(
            { stripeSubscriptionId },
            {
              $setOnInsert: { userId, plan },
              $set: {
                status: 'active',
                stripeCustomerId,
                stripeSubscriptionId,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(
                  Date.now() + (plan === 'yearly' ? 365 : 30) * 86_400_000,
                ),
                cancelAtPeriodEnd: false,
              },
            },
            { upsert: true, new: true },
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as any;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: stripeSub.id },
          {
            status: stripeSub.status,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          },
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as any;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: stripeSub.id },
          { status: 'cancelled', cancelAtPeriodEnd: false },
        );
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: invoice.subscription },
            { status: 'past_due' },
          );
        }
        break;
      }

      default:
        // Unhandled event — acknowledged but not processed
        break;
    }

    res.json({ received: true });
  },
);

// DEBUG: Manual trigger for development testing (bypasses Stripe)
router.post(
  '/debug-trigger-success',
  asyncHandler(async (req, res) => {
    if (env.NODE_ENV !== 'development') throw new HttpError(403, 'Forbidden');

    const { userId, plan } = req.body as { userId: string; plan: string };
    if (!userId || !['monthly', 'yearly'].includes(plan)) {
      throw new HttpError(400, 'Missing userId or invalid plan');
    }

    const subscription = await Subscription.findOneAndUpdate(
      { userId, stripeSubscriptionId: 'sub_debug_123' },
      {
        $setOnInsert: { userId },
        $set: {
          plan,
          status: 'active',
          stripeCustomerId: 'cus_debug_123',
          stripeSubscriptionId: 'sub_debug_123',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(
            Date.now() + (plan === 'yearly' ? 365 : 30) * 86_400_000,
          ),
          cancelAtPeriodEnd: false,
        },
      },
      { upsert: true, new: true },
    );

    res.json({ success: true, subscription });
  }),
);

export default router;
