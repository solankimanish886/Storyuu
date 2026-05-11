import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/**
 * §9.4 — Guests can request notification when an unreleased episode drops.
 * Stored separate from users; merged into User on later sign-up.
 */
const NotifyMeLeadSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    episodeId: { type: Types.ObjectId, ref: 'Episode', required: true },
    notifiedAt: { type: Date, default: null },
    convertedUserId: { type: Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

NotifyMeLeadSchema.index({ email: 1, episodeId: 1 }, { unique: true });

export type NotifyMeLeadDoc = InferSchemaType<typeof NotifyMeLeadSchema> & { _id: Types.ObjectId };
export const NotifyMeLead = model('NotifyMeLead', NotifyMeLeadSchema);
