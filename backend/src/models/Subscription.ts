import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const SubscriptionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', default: null, index: true },
    plan: { type: String, enum: ['monthly', 'yearly', 'comp'], required: true },
    status: {
      type: String,
      enum: ['active', 'past_due', 'cancelled', 'suspended', 'incomplete'],
      required: true,
      index: true,
    },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date, index: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },

    stripeCustomerId: { type: String, index: true },
    stripeSubscriptionId: { type: String, unique: true, sparse: true },

    // For comp subscriptions (§6.7)
    grantedByUserId: { type: Types.ObjectId, ref: 'User' },
    grantReason: { type: String },

    // Set when the associated User is hard-deleted (audit trail)
    _archivedUserEmail: { type: String },
    _archivedAt: { type: Date },
  },
  { timestamps: true },
);

export type SubscriptionDoc = InferSchemaType<typeof SubscriptionSchema> & { _id: Types.ObjectId };
export const Subscription = model('Subscription', SubscriptionSchema);
