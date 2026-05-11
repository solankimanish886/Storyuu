import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const StorySchema = new Schema(
  {
    channelId: { type: Types.ObjectId, ref: 'Channel', required: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    overview: { type: String },
    coverImageUrl: { type: String },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

StorySchema.index({ channelId: 1 });
StorySchema.index({ title: 1 });

export type StoryDoc = InferSchemaType<typeof StorySchema> & { _id: Types.ObjectId };
export const Story = model('Story', StorySchema);
