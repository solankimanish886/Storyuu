import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const ChannelSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String },
    coverImageUrl: { type: String },
    sortOrder: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export type ChannelDoc = InferSchemaType<typeof ChannelSchema> & { _id: Types.ObjectId };
export const Channel = model('Channel', ChannelSchema);
