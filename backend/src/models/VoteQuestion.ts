import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const VoteChoiceSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false },
);

const VoteQuestionSchema = new Schema(
  {
    episodeId: { type: Types.ObjectId, ref: 'Episode', required: true, unique: true, index: true },
    question: { type: String, required: true },
    choices: {
      type: [VoteChoiceSchema],
      validate: {
        validator: (v: unknown[]) => v.length === 3,
        message: 'A vote must have exactly 3 choices',
      },
    },
    openAt: { type: Date, default: () => new Date() },
    closeAt: { type: Date, required: true, index: true },
    winningChoiceIndex: { type: Number, default: null },
    closingSoonNotificationSent: { type: Boolean, default: false },
    resultsNotificationSent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type VoteQuestionDoc = InferSchemaType<typeof VoteQuestionSchema> & { _id: Types.ObjectId };
export const VoteQuestion = model('VoteQuestion', VoteQuestionSchema);
