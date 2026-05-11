import Stripe from 'stripe';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export type StripePlanId = 'monthly' | 'yearly';

export interface CheckoutSessionInput {
  userId: string;
  email: string;
  plan: StripePlanId;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export interface RefundInput {
  chargeId: string;
  amount?: number;
  reason: string;
}

export interface StripeService {
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession>;
  retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session>;
  createCustomerPortalSession(stripeCustomerId: string, returnUrl: string): Promise<{ url: string }>;
  cancelSubscription(stripeSubscriptionId: string, atPeriodEnd: boolean): Promise<void>;
  resumeSubscription(stripeSubscriptionId: string): Promise<void>;
  refund(input: RefundInput): Promise<{ refundId: string }>;
  verifyWebhook(payload: Buffer, signature: string): Promise<Stripe.Event>;
}

class RealStripeService implements StripeService {
  private stripe: Stripe | null = null;

  constructor() {
    if (env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-10-28.acacia',
      });
    } else {
      logger.warn('STRIPE_SECRET_KEY is not set. Stripe services will be unavailable.');
    }
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment.');
    }
    return this.stripe;
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession> {
    const stripe = this.getStripe();
    const priceId = input.plan === 'yearly' ? env.STRIPE_PRICE_YEARLY : env.STRIPE_PRICE_MONTHLY;

    if (!priceId) {
      throw new Error(`Stripe price ID for plan "${input.plan}" is not configured.`);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: input.email,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.userId,
      metadata: {
        userId: input.userId,
        plan: input.plan,
      },
    });

    if (!session.url) {
      throw new Error('Stripe session creation failed (no URL returned).');
    }

    return {
      id: session.id,
      url: session.url,
    };
  }

  async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    const stripe = this.getStripe();
    return stripe.checkout.sessions.retrieve(sessionId);
  }

  async createCustomerPortalSession(stripeCustomerId: string, returnUrl: string) {
    const stripe = this.getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  }

  async cancelSubscription(stripeSubscriptionId: string, atPeriodEnd: boolean) {
    const stripe = this.getStripe();
    if (atPeriodEnd) {
      await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      await stripe.subscriptions.cancel(stripeSubscriptionId);
    }
  }

  async resumeSubscription(stripeSubscriptionId: string) {
    const stripe = this.getStripe();
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
  }

  async refund(input: RefundInput) {
    const stripe = this.getStripe();
    const refund = await stripe.refunds.create({
      charge: input.chargeId,
      amount: input.amount,
      reason: input.reason as any,
    });
    return { refundId: refund.id };
  }

  async verifyWebhook(payload: Buffer, signature: string): Promise<Stripe.Event> {
    const stripe = this.getStripe();
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET || '',
    );
  }
}

export const stripeService: StripeService = new RealStripeService();
