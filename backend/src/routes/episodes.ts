import { Router } from 'express';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../middleware/error.js';
import { Episode } from '../models/Episode.js';
import { VoteQuestion } from '../models/VoteQuestion.js';
import { Vote } from '../models/Vote.js';
import { ReadingProgress } from '../models/ReadingProgress.js';
import { Subscription } from '../models/Subscription.js';

const router = Router();

// GET /:id — full episode (gated: first ep of story is free, rest need subscription)
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;

    const episode = await Episode.findById(req.params.id);
    if (!episode || episode.status !== 'published') {
      throw new HttpError(404, 'Episode not found.');
    }

    // Find the first published episode of this story
    const firstEpisode = await Episode.findOne(
      { storyId: episode.storyId, status: 'published' },
      { _id: 1 },
    ).sort({ createdAt: 1 });

    const isFirstEpisode =
      firstEpisode && firstEpisode._id.toString() === episode._id.toString();

    if (!isFirstEpisode) {
      const sub = await Subscription.findOne({
        userId: new Types.ObjectId(userId),
        status: 'active',
        currentPeriodEnd: { $gte: new Date() },
      });
      if (!sub) {
        throw new HttpError(402, 'Subscription required.');
      }
    }

    let voteQuestion = null;
    if (episode.voteQuestionId) {
      const vq = await VoteQuestion.findById(episode.voteQuestionId);
      if (vq) {
        const now = new Date();
        voteQuestion = {
          id: vq._id,
          question: vq.question,
          choices: vq.choices,
          closeAt: vq.closeAt,
          isOpen: vq.openAt <= now && vq.closeAt >= now,
          winningChoiceIndex: vq.winningChoiceIndex,
        };
      }
    }

    res.json({
      episode: {
        id: episode._id,
        storyId: episode.storyId,
        seasonId: episode.seasonId,
        number: episode.number,
        title: episode.title,
        body: episode.body,
        audioUrl: episode.audioUrl,
        coverImageUrl: episode.coverImageUrl,
        readTimeMinutes: episode.readTimeMinutes,
        audioDurationSeconds: episode.audioDurationSeconds,
        voteQuestion,
      },
    });
  }),
);

// POST /:id/progress — upsert ReadingProgress
router.post(
  '/:id/progress',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const { position, mode, completed } = req.body as {
      position: number;
      mode: 'read' | 'listen';
      completed?: boolean;
    };

    const episode = await Episode.findById(req.params.id, { _id: 1, storyId: 1 });
    if (!episode) {
      throw new HttpError(404, 'Episode not found.');
    }

    const setFields: Record<string, unknown> = {
      position,
      mode,
      storyId: episode.storyId,
    };
    if (completed) {
      setFields.completedAt = new Date();
    }

    await ReadingProgress.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), episodeId: episode._id },
      { $set: setFields },
      { upsert: true, new: true },
    );

    res.json({ saved: true });
  }),
);

// GET /:id/progress — get user's progress for this episode
router.get(
  '/:id/progress',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;

    const progress = await ReadingProgress.findOne({
      userId: new Types.ObjectId(userId),
      episodeId: new Types.ObjectId(req.params.id as string),
    });

    res.json({
      progress: progress
        ? {
            position: progress.position,
            mode: progress.mode,
            completedAt: progress.completedAt,
          }
        : null,
    });
  }),
);

// GET /:id/vote — vote question with tally and user's existing vote
router.get(
  '/:id/vote',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;

    const episode = await Episode.findById(req.params.id, {
      _id: 1,
      voteQuestionId: 1,
    });
    if (!episode) {
      throw new HttpError(404, 'Episode not found.');
    }

    if (!episode.voteQuestionId) {
      return res.json({ voteQuestion: null });
    }

    const vq = await VoteQuestion.findById(episode.voteQuestionId);
    if (!vq) {
      return res.json({ voteQuestion: null });
    }

    // Get user's existing vote
    const userVote = await Vote.findOne({
      voteQuestionId: vq._id,
      userId: new Types.ObjectId(userId),
    });

    // Aggregate vote counts per choice
    const tallies: { _id: number; count: number }[] = await Vote.aggregate([
      { $match: { voteQuestionId: vq._id } },
      { $group: { _id: '$choiceIndex', count: { $sum: 1 } } },
    ]);

    const totalVotes = tallies.reduce((sum, t) => sum + t.count, 0);

    const choices = vq.choices.map((choice, index) => {
      const tally = tallies.find((t) => t._id === index);
      const count = tally ? tally.count : 0;
      const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      return {
        title: choice.title,
        description: choice.description,
        count,
        percentage,
      };
    });

    const now = new Date();
    res.json({
      voteQuestion: {
        id: vq._id,
        question: vq.question,
        choices,
        openAt: vq.openAt,
        closeAt: vq.closeAt,
        isOpen: vq.openAt <= now && vq.closeAt >= now,
        winningChoiceIndex: vq.winningChoiceIndex,
        totalVotes,
        userChoiceIndex: userVote ? userVote.choiceIndex : null,
      },
    });
  }),
);

export default router;
