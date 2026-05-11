import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const VALID_TYPES = ['terms', 'privacy', 'cookies'] as const;
export type PolicyType = (typeof VALID_TYPES)[number];

const PolicyDocumentSchema = new Schema(
  {
    type: {
      type: String,
      enum: VALID_TYPES,
      required: true,
      unique: true,
      index: true,
    },
    content: { type: String, default: '' },
    updatedBy: { type: Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export type PolicyDocumentDoc = InferSchemaType<typeof PolicyDocumentSchema> & {
  _id: Types.ObjectId;
};
export const PolicyDocument = model('PolicyDocument', PolicyDocumentSchema);
export { VALID_TYPES as POLICY_TYPES };
