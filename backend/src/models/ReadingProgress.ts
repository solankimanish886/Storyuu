import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/**
 * §8.3.1 / §8.3.3 — Auto-save reading position every 2s of inactivity.
 * One row per (user, episode); upsert on each save.
 */
const ReadingProgressSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    episodeId: { type: Types.ObjectId, ref: 'Episode', required: true, index: true },
    storyId: { type: Types.ObjectId, ref: 'Story', required: true, index: true },
    position: { type: Number, default: 0 },
    mode: { type: String, enum: ['read', 'listen'], required: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ReadingProgressSchema.index({ userId: 1, episodeId: 1 }, { unique: true });
// Used by getImplicitFollowers to efficiently find recent engagers per story.
ReadingProgressSchema.index({ storyId: 1, updatedAt: -1 });

export type ReadingProgressDoc = InferSchemaType<typeof ReadingProgressSchema> & { _id: Types.ObjectId };
export const ReadingProgress = model('ReadingProgress', ReadingProgressSchema);
