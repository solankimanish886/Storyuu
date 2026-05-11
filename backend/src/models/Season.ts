import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const SeasonSchema = new Schema(
  {
    storyId: { type: Types.ObjectId, ref: 'Story', required: true, index: true },
    number: { type: Number, required: true },
    title: { type: String, trim: true },
    description: { type: String },
    coverImageUrl: { type: String },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
  },
  { timestamps: true },
);

SeasonSchema.index({ storyId: 1, number: 1 }, { unique: true });

export type SeasonDoc = InferSchemaType<typeof SeasonSchema> & { _id: Types.ObjectId };
export const Season = model('Season', SeasonSchema);
