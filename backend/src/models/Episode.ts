import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const EpisodeSchema = new Schema(
  {
    storyId: { type: Types.ObjectId, ref: 'Story', required: true, index: true },
    seasonId: { type: Types.ObjectId, ref: 'Season', required: true, index: true },
    number: { type: Number, required: true },
    title: { type: String, required: true, trim: true },

    body: { type: String, required: true },
    coverImageUrl: { type: String },
    audioUrl: { type: String },

    voteQuestionId: { type: Types.ObjectId, ref: 'VoteQuestion', default: null },

    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date, index: true },
    scheduledFor: { type: Date },

    readTimeMinutes: { type: Number, default: 5 },
    audioDurationSeconds: { type: Number, default: 0 },
  },
  { timestamps: true },
);

EpisodeSchema.index({ storyId: 1, seasonId: 1, number: 1 }, { unique: true });

export type EpisodeDoc = InferSchemaType<typeof EpisodeSchema> & { _id: Types.ObjectId };
export const Episode = model('Episode', EpisodeSchema);
