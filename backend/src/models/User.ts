import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const PreferencesSchema = new Schema(
  {
    fontSize: { type: Number, default: 16 },
    lineSpacing: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    letterSpacing: { type: String, enum: ['small', 'medium', 'large'], default: 'small' },
    readerTheme: { type: String, enum: ['dark', 'light', 'sepia'], default: 'dark' },
    notifyEmail: { type: Boolean, default: true },
    notifyInApp: { type: Boolean, default: true },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, select: false },
    googleId: { type: String, index: true },
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true },
    dateOfBirth: { type: Date },
    avatarUrl: { type: String },

    role: { type: String, enum: ['reader', 'admin', 'superadmin'], default: 'reader', index: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    isFoundingMember: { type: Boolean, default: false, index: true },
    suspendedAt: { type: Date, default: null },
    suspendedReason: { type: String },

    status: { type: String, enum: ['active', 'blocked'], default: 'active', index: true },
    tokenVersion: { type: Number, default: 0 },

    preferences: { type: PreferencesSchema, default: () => ({}) },

    utm: {
      source: String,
      medium: String,
      campaign: String,
    },

    failedLoginCount: { type: Number, default: 0, select: false },
    lockoutUntil: { type: Date, select: false },
    refreshTokenHash: { type: String, select: false },
    lastActiveAt: { type: Date },
  },
  { timestamps: true },
);

UserSchema.index({ createdAt: -1 });

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: Types.ObjectId };
export const User = model('User', UserSchema);
