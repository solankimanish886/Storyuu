import { Router } from 'express';
import sanitizeHtml from 'sanitize-html';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../middleware/error.js';
import { PolicyDocument, POLICY_TYPES, type PolicyType } from '../models/PolicyDocument.js';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'u', 's',
    'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: 'noopener noreferrer' },
    }),
  },
};

function isValidType(t: string): t is PolicyType {
  return (POLICY_TYPES as readonly string[]).includes(t);
}

// ── Public router — mounted at /api/legal ────────────────────────────────────
export const publicLegalRouter = Router();

publicLegalRouter.get(
  '/:type',
  asyncHandler(async (req, res) => {
    const type = req.params.type as string;
    if (!isValidType(type)) throw new HttpError(400, 'Invalid document type.');

    const doc = await PolicyDocument.findOne({ type }).lean();
    if (!doc) throw new HttpError(404, 'Document not found.');

    res.json({ type: doc.type, content: doc.content ?? '', updatedAt: (doc as any).updatedAt });
  }),
);

// ── Admin router — mounted at /api/admin/legal ───────────────────────────────
export const adminLegalRouter = Router();
adminLegalRouter.use(requireAuth, requireRole('superadmin'));

adminLegalRouter.get(
  '/:type',
  asyncHandler(async (req, res) => {
    const type = req.params.type as string;
    if (!isValidType(type)) throw new HttpError(400, 'Invalid document type.');

    const doc = await PolicyDocument.findOne({ type })
      .populate('updatedBy', 'firstName lastName email')
      .lean();
    if (!doc) throw new HttpError(404, 'Document not found.');

    res.json({
      type: doc.type,
      content: doc.content ?? '',
      updatedAt: (doc as any).updatedAt,
      updatedBy: doc.updatedBy ?? null,
    });
  }),
);

adminLegalRouter.put(
  '/:type',
  asyncHandler(async (req, res) => {
    const type = req.params.type as string;
    if (!isValidType(type)) throw new HttpError(400, 'Invalid document type.');

    const { content } = req.body as { content?: string };
    if (content === undefined) throw new HttpError(400, 'content is required.');

    const clean = sanitizeHtml(String(content), SANITIZE_OPTIONS);

    const doc = await PolicyDocument.findOneAndUpdate(
      { type },
      { $set: { content: clean, updatedBy: req.auth!.userId } },
      { new: true, upsert: false },
    ).lean();

    if (!doc) throw new HttpError(404, 'Document not found.');

    res.json({ type: doc.type, content: doc.content ?? '', updatedAt: (doc as any).updatedAt });
  }),
);
