import { Router } from 'express';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../middleware/error.js';
import { VoteQuestion } from '../models/VoteQuestion.js';
import { Vote } from '../models/Vote.js';

const router = Router();

// POST / — submit or update vote
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const { voteQuestionId, choiceIndex } = req.body as {
      voteQuestionId: string;
      choiceIndex: number;
    };

    if (!voteQuestionId || choiceIndex === undefined || choiceIndex === null) {
      throw new HttpError(400, 'voteQuestionId and choiceIndex are required.');
    }

    const vq = await VoteQuestion.findById(voteQuestionId);
    if (!vq) {
      throw new HttpError(404, 'Vote question not found.');
    }

    const now = new Date();
    if (vq.openAt > now) {
      throw new HttpError(400, 'Voting has not opened yet.');
    }
    if (vq.closeAt < now) {
      throw new HttpError(400, 'Voting has closed.');
    }

    if (choiceIndex < 0 || choiceIndex >= vq.choices.length) {
      throw new HttpError(400, `choiceIndex must be between 0 and ${vq.choices.length - 1}.`);
    }

    await Vote.findOneAndUpdate(
      {
        voteQuestionId: new Types.ObjectId(voteQuestionId),
        userId: new Types.ObjectId(userId),
      },
      { $set: { choiceIndex } },
      { upsert: true, new: true },
    );

    res.json({ voted: true, choiceIndex });
  }),
);

export default router;
