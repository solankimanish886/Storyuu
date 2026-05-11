import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const VoteSchema = new Schema(
  {
    voteQuestionId: { type: Types.ObjectId, ref: 'VoteQuestion', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    choiceIndex: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

// §M6 / Master Prompt §12: one vote per user per episode (enforced via the question -> episode link).
VoteSchema.index({ voteQuestionId: 1, userId: 1 }, { unique: true });

export type VoteDoc = InferSchemaType<typeof VoteSchema> & { _id: Types.ObjectId };
export const Vote = model('Vote', VoteSchema);
