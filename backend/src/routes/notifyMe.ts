import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../middleware/error.js';
import { Episode } from '../models/Episode.js';
import { NotifyMeLead } from '../models/NotifyMeLead.js';
import { Types } from 'mongoose';

const router = Router();

// POST / — public endpoint: register a guest's email for episode notification
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { email, episodeId } = req.body as { email: string; episodeId: string };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, 'A valid email address is required.');
    }

    if (!episodeId || !Types.ObjectId.isValid(episodeId)) {
      throw new HttpError(400, 'A valid episodeId is required.');
    }

    const episode = await Episode.findById(episodeId, { _id: 1 });
    if (!episode) {
      throw new HttpError(404, 'Episode not found.');
    }

    await NotifyMeLead.findOneAndUpdate(
      { email: email.toLowerCase().trim(), episodeId: episode._id },
      { $setOnInsert: { email: email.toLowerCase().trim(), episodeId: episode._id } },
      { upsert: true, new: true },
    );

    res.json({ success: true });
  }),
);

export default router;
