import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/**
 * §6.10 — Append-only log of every Admin / Super Admin action. 7-year retention.
 */
const AuditLogSchema = new Schema(
  {
    actorId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    actorRole: { type: String, enum: ['admin', 'superadmin'], required: true },
    action: {
      type: String,
      required: true,
      index: true,
      // refund_issued, comp_granted, user_suspended, user_promoted, content_published, etc.
    },
    targetType: {
      type: String,
      enum: ['user', 'channel', 'story', 'season', 'episode', 'vote', 'system_setting', null],
      default: null,
    },
    targetId: { type: Types.ObjectId, default: null, index: true },
    result: { type: String, enum: ['success', 'failed'], default: 'success' },
    payload: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AuditLogSchema.index({ createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema> & { _id: Types.ObjectId };
export const AuditLog = model('AuditLog', AuditLogSchema);
