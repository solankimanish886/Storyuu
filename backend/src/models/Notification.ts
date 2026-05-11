import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const NotificationSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'new_episode',
        'voting_opened',
        'voting_closing_soon',
        'voting_results',
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String },
    imageUrl: { type: String, default: null },
    // Contextual data for client-side routing (storyId, episodeId, voteQuestionId, etc.)
    data: { type: Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, readAt: 1 });

export type NotificationDoc = InferSchemaType<typeof NotificationSchema> & { _id: Types.ObjectId };
export const Notification = model('Notification', NotificationSchema);
