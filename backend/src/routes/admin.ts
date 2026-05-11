import { Router } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../middleware/error.js';
import { Channel } from '../models/Channel.js';
import { Story } from '../models/Story.js';
import { Season } from '../models/Season.js';
import { Episode } from '../models/Episode.js';
import { VoteQuestion } from '../models/VoteQuestion.js';
import { Vote } from '../models/Vote.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import {
  createNewEpisodeNotifications,
  createVotingOpenedNotifications,
} from '../services/notifications.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'superadmin'));

// GET /dashboard — KPI stats (3 spec-aligned cards)
router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    // ISO week: start from most recent Monday
    const dayOfWeek = now.getUTCDay(); // 0=Sun
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfThisWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysToMonday));
    const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalReaders, publishedStories, currentWeekSignups, lastWeekSignups, totalChannels] = await Promise.all([
      Subscription.countDocuments({ status: 'active' }),
      Story.countDocuments({ status: 'published' }),
      User.countDocuments({ createdAt: { $gte: startOfThisWeek } }),
      User.countDocuments({ createdAt: { $gte: startOfLastWeek, $lt: startOfThisWeek } }),
      Channel.countDocuments(),
    ]);

    res.json({ stats: { totalReaders, publishedStories, currentWeekSignups, lastWeekSignups, totalChannels } });
  }),
);

// GET /dashboard/votes — paginated votes details table
router.get(
  '/dashboard/votes',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 25;
    const skip = (page - 1) * limit;
    const sortBy = (req.query.sortBy as string) || 'story';
    const filterStory = (req.query.filterStory as string) || '';
    const filterSeason = (req.query.filterSeason as string) || '';
    const from = req.query.from ? new Date(req.query.from as string) : null;
    const to = req.query.to ? new Date(req.query.to as string) : null;

    const pipeline: object[] = [];

    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.$gte = from;
      if (to) dateFilter.$lte = to;
      pipeline.push({ $match: { createdAt: dateFilter } });
    }

    pipeline.push(
      { $lookup: { from: 'votes', localField: '_id', foreignField: 'voteQuestionId', as: 'votes' } },
      { $lookup: { from: 'episodes', localField: 'episodeId', foreignField: '_id', as: 'epArr' } },
      { $unwind: '$epArr' },
      { $lookup: { from: 'seasons', localField: 'epArr.seasonId', foreignField: '_id', as: 'seasonArr' } },
      { $unwind: '$seasonArr' },
      { $lookup: { from: 'stories', localField: 'epArr.storyId', foreignField: '_id', as: 'storyArr' } },
      { $unwind: '$storyArr' },
      {
        $project: {
          storyId: '$storyArr._id',
          story: '$storyArr.title',
          season: { $ifNull: ['$seasonArr.title', { $concat: ['Season ', { $toString: '$seasonArr.number' }] }] },
          seasonNumber: '$seasonArr.number',
          episode: '$epArr.title',
          episodeNumber: '$epArr.number',
          question: 1,
          choices: 1,
          closeAt: 1,
          totalVotes: { $size: '$votes' },
          c0: { $size: { $filter: { input: '$votes', as: 'v', cond: { $eq: ['$$v.choiceIndex', 0] } } } },
          c1: { $size: { $filter: { input: '$votes', as: 'v', cond: { $eq: ['$$v.choiceIndex', 1] } } } },
          c2: { $size: { $filter: { input: '$votes', as: 'v', cond: { $eq: ['$$v.choiceIndex', 2] } } } },
        },
      },
    );

    if (filterStory) pipeline.push({ $match: { story: { $regex: filterStory, $options: 'i' } } });
    if (filterSeason) pipeline.push({ $match: { season: { $regex: filterSeason, $options: 'i' } } });

    const sortField = sortBy === 'totalVotes' ? 'totalVotes' : sortBy === 'episode' ? 'episodeNumber' : 'story';
    const sortDir = sortBy === 'totalVotes' ? -1 : 1;
    pipeline.push({ $sort: { [sortField]: sortDir } });

    pipeline.push({
      $facet: {
        rows: [{ $skip: skip }, { $limit: limit }],
        meta: [{ $count: 'total' }],
      },
    });

    const [result] = await VoteQuestion.aggregate(pipeline);
    const rows = (result?.rows ?? []).map((r: Record<string, unknown>) => {
      const choices = (r.choices as { title: string }[]) ?? [];
      const total = (r.totalVotes as number) || 0;
      const pct = (n: number) => (total > 0 ? Math.round(((n as number) / total) * 100) : 0);
      return {
        storyId: r.storyId,
        story: r.story,
        season: r.season,
        episode: r.episode,
        question: r.question,
        choice1Label: choices[0]?.title ?? '',
        choice2Label: choices[1]?.title ?? '',
        choice3Label: choices[2]?.title ?? '',
        choice1Pct: pct(r.c0 as number),
        choice2Pct: pct(r.c1 as number),
        choice3Pct: pct(r.c2 as number),
        totalVotes: total,
        closeAt: r.closeAt,
      };
    });
    const total = (result?.meta?.[0]?.total as number) ?? 0;

    res.json({ rows, total, page, pages: Math.ceil(total / limit) || 1 });
  }),
);

// ─── Channels ────────────────────────────────────────────────────────────────

// GET /channels — list all channels sorted by sortOrder, include storyCount
router.get(
  '/channels',
  asyncHandler(async (_req, res) => {
    const channels = await Channel.find().sort({ sortOrder: 1 }).lean();

    const channelIds = channels.map((c) => c._id);
    const storyCounts: { _id: Types.ObjectId; count: number }[] = await Story.aggregate([
      { $match: { channelId: { $in: channelIds } } },
      { $group: { _id: '$channelId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(storyCounts.map((sc) => [sc._id.toString(), sc.count]));

    const result = channels.map((c) => ({
      id: c._id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      coverImageUrl: c.coverImageUrl,
      sortOrder: c.sortOrder,
      isPublished: c.isPublished,
      storyCount: countMap.get(c._id.toString()) ?? 0,
    }));

    res.json({ channels: result });
  }),
);

// POST /channels — create channel
router.post(
  '/channels',
  asyncHandler(async (req, res) => {
    const { name, slug, description, coverImageUrl, sortOrder } = req.body as {
      name: string;
      slug: string;
      description?: string;
      coverImageUrl?: string;
      sortOrder?: number;
    };

    if (!name || !slug) {
      throw new HttpError(400, 'name and slug are required.');
    }

    const channel = await Channel.create({
      name,
      slug,
      description,
      coverImageUrl,
      sortOrder: sortOrder ?? 0,
    });

    res.status(201).json({ channel });
  }),
);

// PATCH /channels/:id — update channel
router.patch(
  '/channels/:id',
  asyncHandler(async (req, res) => {
    const channel = await Channel.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!channel) throw new HttpError(404, 'Channel not found.');
    res.json({ channel });
  }),
);

// DELETE /channels/:id — delete channel
router.delete(
  '/channels/:id',
  asyncHandler(async (req, res) => {
    const channel = await Channel.findByIdAndDelete(req.params.id);
    if (!channel) throw new HttpError(404, 'Channel not found.');
    res.json({ deleted: true });
  }),
);

// ─── Stories ─────────────────────────────────────────────────────────────────

// GET /stories — list all stories, optional ?channelId= / ?search= / ?status= filters
router.get(
  '/stories',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = {};
    if (req.query.channelId) {
      filter.channelId = new Types.ObjectId(req.query.channelId as string);
    }
    if (req.query.search) {
      const escaped = (req.query.search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: escaped, $options: 'i' };
    }
    if (req.query.status) {
      filter.status = req.query.status as string;
    }

    const stories = await Story.find(filter).populate('channelId', 'name').sort({ createdAt: -1 }).lean();

    const result = stories.map((s) => {
      const ch = s.channelId as unknown as { _id: Types.ObjectId; name: string } | null;
      return {
        id: s._id,
        channelId: ch ? ch._id : s.channelId,
        channelName: ch ? ch.name : null,
        title: s.title,
        slug: s.slug,
        overview: s.overview,
        coverImageUrl: s.coverImageUrl,
        status: s.status,
        publishedAt: s.publishedAt,
      };
    });

    res.json({ stories: result });
  }),
);

// POST /stories — create story
router.post(
  '/stories',
  asyncHandler(async (req, res) => {
    const { channelId, title, slug, overview, coverImageUrl, status } = req.body as {
      channelId: string;
      title: string;
      slug: string;
      overview?: string;
      coverImageUrl?: string;
      status?: string;
    };

    if (!channelId || !title || !slug) {
      throw new HttpError(400, 'channelId, title and slug are required.');
    }

    const story = await Story.create({
      channelId,
      title,
      slug,
      overview,
      coverImageUrl,
      status: status ?? 'draft',
    });

    res.status(201).json({ story });
  }),
);

// GET /stories/counts — story counts by status (must precede /stories/:id)
router.get(
  '/stories/counts',
  asyncHandler(async (_req, res) => {
    const [total, published, draft, archived] = await Promise.all([
      Story.countDocuments(),
      Story.countDocuments({ status: 'published' }),
      Story.countDocuments({ status: 'draft' }),
      Story.countDocuments({ status: 'archived' }),
    ]);
    res.json({ total, published, draft, archived });
  }),
);

// GET /stories/:id — story detail with seasons and episode counts
router.get(
  '/stories/:id',
  asyncHandler(async (req, res) => {
    const story = await Story.findById(req.params.id).lean();
    if (!story) throw new HttpError(404, 'Story not found.');

    const seasons = await Season.find({ storyId: story._id }).sort({ number: 1 }).lean();

    const seasonIds = seasons.map((s) => s._id);
    
    // Fetch all episodes for these seasons
    const episodes = await Episode.find({ seasonId: { $in: seasonIds } }).sort({ number: 1 }).lean();

    const seasonsWithEpisodes = seasons.map((s) => ({
      id: s._id,
      number: s.number,
      title: s.title,
      description: s.description,
      coverImageUrl: s.coverImageUrl,
      status: s.status,
      episodes: episodes
        .filter((ep) => ep.seasonId.toString() === s._id.toString())
        .map((ep) => ({
          id: ep._id,
          number: ep.number,
          title: ep.title,
          status: ep.status,
          publishedAt: ep.publishedAt,
          readTimeMinutes: ep.readTimeMinutes,
          coverImageUrl: ep.coverImageUrl,
        })),
      episodeCount: episodes.filter((ep) => ep.seasonId.toString() === s._id.toString()).length,
    }));

    res.json({ story: { ...story, id: story._id }, seasons: seasonsWithEpisodes });
  }),
);

// PATCH /stories/:id — partial update
router.patch(
  '/stories/:id',
  asyncHandler(async (req, res) => {
    const update: Record<string, unknown> = { ...req.body };
    if (update.status === 'published' && !('publishedAt' in update)) {
      update.publishedAt = new Date();
    }
    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!story) throw new HttpError(404, 'Story not found.');
    res.json({ story });
  }),
);

// DELETE /stories/:id — delete story + cascade delete seasons + episodes
router.delete(
  '/stories/:id',
  asyncHandler(async (req, res) => {
    const story = await Story.findByIdAndDelete(req.params.id);
    if (!story) throw new HttpError(404, 'Story not found.');

    const seasons = await Season.find({ storyId: story._id }, { _id: 1 }).lean();
    const seasonIds = seasons.map((s) => s._id);

    await Promise.all([
      Season.deleteMany({ storyId: story._id }),
      Episode.deleteMany({ seasonId: { $in: seasonIds } }),
    ]);

    res.json({ deleted: true });
  }),
);

// ─── Seasons ─────────────────────────────────────────────────────────────────

// POST /stories/:storyId/seasons — create season
router.post(
  '/stories/:storyId/seasons',
  asyncHandler(async (req, res) => {
    const { number, title, description, coverImageUrl, status } = req.body as {
      number: number;
      title?: string;
      description?: string;
      coverImageUrl?: string;
      status?: string;
    };

    if (number === undefined || number === null) {
      throw new HttpError(400, 'number is required.');
    }

    const story = await Story.findById(req.params.storyId, { _id: 1 });
    if (!story) throw new HttpError(404, 'Story not found.');

    const season = await Season.create({
      storyId: story._id,
      number,
      title,
      description,
      coverImageUrl,
      status: status ?? 'draft',
    });

    res.status(201).json({ season });
  }),
);

// PATCH /seasons/:id — partial update
router.patch(
  '/seasons/:id',
  asyncHandler(async (req, res) => {
    const season = await Season.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!season) throw new HttpError(404, 'Season not found.');
    res.json({ season });
  }),
);

// DELETE /seasons/:id — delete season + cascade delete its episodes
router.delete(
  '/seasons/:id',
  asyncHandler(async (req, res) => {
    const season = await Season.findByIdAndDelete(req.params.id);
    if (!season) throw new HttpError(404, 'Season not found.');

    await Episode.deleteMany({ seasonId: season._id });

    res.json({ deleted: true });
  }),
);

// ─── Episodes ────────────────────────────────────────────────────────────────

// POST /seasons/:seasonId/episodes — create episode
router.post(
  '/seasons/:seasonId/episodes',
  asyncHandler(async (req, res) => {
    const {
      title,
      body,
      audioUrl,
      readTimeMinutes,
      readingTimeMinutes,
      listeningTimeMinutes,
      audioDurationSeconds,
      status,
      coverImageUrl,
      voteQuestion,
    } = req.body as {
      title: string;
      body: string;
      audioUrl?: string;
      readTimeMinutes?: number;
      readingTimeMinutes?: number;
      listeningTimeMinutes?: number;
      audioDurationSeconds?: number;
      status?: string;
      coverImageUrl?: string;
      voteQuestion?: { question: string; options: { title: string; description: string }[] };
    };

    if (!title || !body) {
      throw new HttpError(400, 'title and body are required.');
    }

    if (voteQuestion?.question?.trim()) {
      const opts = voteQuestion.options;
      if (!Array.isArray(opts) || opts.length !== 3) {
        throw new HttpError(400, 'voteQuestion.options must have exactly 3 items.');
      }
      for (const [i, opt] of opts.entries()) {
        if (!opt.title?.trim()) throw new HttpError(400, `Option ${i + 1} title is required.`);
        if (!opt.description?.trim()) throw new HttpError(400, `Option ${i + 1} description is required.`);
      }
    }

    const season = await Season.findById(req.params.seasonId, { _id: 1, storyId: 1 }).lean();
    if (!season) throw new HttpError(404, 'Season not found.');

    const lastEpisode = await Episode.findOne(
      { seasonId: season._id },
      { number: 1 },
      { sort: { number: -1 } },
    ).lean();
    const number = (lastEpisode?.number ?? 0) + 1;

    const resolvedReadTime = readTimeMinutes ?? readingTimeMinutes;
    const resolvedAudioDuration =
      audioDurationSeconds ?? (listeningTimeMinutes ? listeningTimeMinutes * 60 : undefined);

    const episode = await Episode.create({
      storyId: season.storyId,
      seasonId: season._id,
      number,
      title,
      body,
      audioUrl,
      readTimeMinutes: resolvedReadTime,
      audioDurationSeconds: resolvedAudioDuration,
      status: status ?? 'draft',
      coverImageUrl,
    });

    if (voteQuestion?.question?.trim()) {
      const opts = voteQuestion.options;
      const vq = await VoteQuestion.create({
        episodeId: episode._id,
        question: voteQuestion.question.trim(),
        choices: opts.map((o) => ({ title: o.title.trim(), description: o.description.trim() })),
        openAt: new Date(),
        closeAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      episode.voteQuestionId = vq._id;
      await episode.save();
    }

    res.status(201).json({ episode });
  }),
);

// GET /episodes/:id — fetch single episode (with voteQuestion populated)
router.get(
  '/episodes/:id',
  asyncHandler(async (req, res) => {
    const episode = await Episode.findById(req.params.id)
      .populate('voteQuestionId', 'question choices')
      .lean();
    if (!episode) throw new HttpError(404, 'Episode not found.');

    let voteQuestionTotalVotes = 0;
    const vqData = episode.voteQuestionId as { _id: Types.ObjectId } | null;
    if (vqData?._id) {
      voteQuestionTotalVotes = await Vote.countDocuments({ voteQuestionId: vqData._id });
    }

    res.json({ episode, voteQuestionTotalVotes });
  }),
);

// PATCH /episodes/:id — partial update
router.patch(
  '/episodes/:id',
  asyncHandler(async (req, res) => {
    const {
      title,
      body,
      status,
      coverImageUrl,
      audioUrl,
      readingTimeMinutes,
      readTimeMinutes,
      listeningTimeMinutes,
      audioDurationSeconds,
      voteQuestion,
    } = req.body as {
      title?: string;
      body?: string;
      status?: string;
      coverImageUrl?: string;
      audioUrl?: string;
      readingTimeMinutes?: number;
      readTimeMinutes?: number;
      listeningTimeMinutes?: number;
      audioDurationSeconds?: number;
      voteQuestion?: { question: string; options?: { title: string; description: string }[] } | null;
    };

    // Capture previous status before update so we can detect publish transitions.
    const existing = await Episode.findById(req.params.id, { status: 1, storyId: 1, voteQuestionId: 1 }).lean();
    if (!existing) throw new HttpError(404, 'Episode not found.');

    const update: Record<string, unknown> = {};
    if (title !== undefined) update.title = title;
    if (body !== undefined) update.body = body;
    if (status !== undefined) update.status = status;
    if (coverImageUrl !== undefined) update.coverImageUrl = coverImageUrl;
    if (audioUrl !== undefined) update.audioUrl = audioUrl;

    const resolvedReadTime = readTimeMinutes ?? readingTimeMinutes;
    if (resolvedReadTime !== undefined) update.readTimeMinutes = resolvedReadTime;

    const resolvedAudioDuration =
      audioDurationSeconds ?? (listeningTimeMinutes !== undefined ? listeningTimeMinutes * 60 : undefined);
    if (resolvedAudioDuration !== undefined) update.audioDurationSeconds = resolvedAudioDuration;

    // Handle voteQuestion upsert
    if (voteQuestion !== undefined) {
      const questionText = voteQuestion?.question?.trim() ?? '';
      const options = voteQuestion?.options;
      const existingVQ = await VoteQuestion.findOne({ episodeId: new Types.ObjectId(req.params.id) });

      if (existingVQ) {
        if (questionText) {
          const vqUpdate: Record<string, unknown> = { question: questionText };
          if (Array.isArray(options) && options.length === 3) {
            vqUpdate.choices = options.map((o) => ({ title: o.title.trim(), description: o.description.trim() }));
          }
          await VoteQuestion.findByIdAndUpdate(existingVQ._id, { $set: vqUpdate });
        }
      } else if (questionText) {
        if (!Array.isArray(options) || options.length !== 3) {
          throw new HttpError(400, 'voteQuestion.options must have exactly 3 items.');
        }
        for (const [i, opt] of options.entries()) {
          if (!opt.title?.trim()) throw new HttpError(400, `Option ${i + 1} title is required.`);
          if (!opt.description?.trim()) throw new HttpError(400, `Option ${i + 1} description is required.`);
        }
        const vq = await VoteQuestion.create({
          episodeId: new Types.ObjectId(req.params.id),
          question: questionText,
          choices: options.map((o) => ({ title: o.title.trim(), description: o.description.trim() })),
          openAt: new Date(),
          closeAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        update.voteQuestionId = vq._id;
      }
    }

    if (status === 'published' && !('publishedAt' in update)) {
      update.publishedAt = new Date();
    }

    const episode = await Episode.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!episode) throw new HttpError(404, 'Episode not found.');

    // Fire notification triggers if this PATCH just transitioned status to published.
    const justPublished = existing.status !== 'published' && episode.status === 'published';
    if (justPublished) {
      const story = await Story.findById(episode.storyId).lean();
      if (story) {
        void (async () => {
          console.log('[Notification Trigger] patch-publish: episode', episode._id.toString(), 'story', story._id.toString());
          try {
            await createNewEpisodeNotifications(episode as any, story as any);
          } catch (err) {
            console.error('[notifications] patch new_episode fan-out failed:', err);
          }
          if (episode.voteQuestionId) {
            try {
              await createVotingOpenedNotifications(
                episode as any,
                story as any,
                episode.voteQuestionId as Types.ObjectId,
              );
            } catch (err) {
              console.error('[notifications] patch voting_opened fan-out failed:', err);
            }
          }
        })();
      }
    }

    res.json({ episode });
  }),
);

// DELETE /episodes/:id — delete episode
router.delete(
  '/episodes/:id',
  asyncHandler(async (req, res) => {
    const episode = await Episode.findByIdAndDelete(req.params.id);
    if (!episode) throw new HttpError(404, 'Episode not found.');
    res.json({ deleted: true });
  }),
);

// POST /episodes/:id/publish — publish episode
router.post(
  '/episodes/:id/publish',
  asyncHandler(async (req, res) => {
    const episode = await Episode.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'published', publishedAt: new Date() } },
      { new: true },
    );
    if (!episode) throw new HttpError(404, 'Episode not found.');

    // Fetch story BEFORE sending the response so no awaits run after res.json().
    // Running awaits after res.json() is inside asyncHandler's Promise chain, meaning
    // any failure there reaches .catch(next), which tries to re-send an error response
    // with headers already sent — swallowing the error and skipping the fan-out.
    const story = await Story.findById(episode.storyId).lean();

    res.json({ episode });

    // Detach fan-out entirely from the request/response cycle with a void IIFE.
    // Errors here must never reach asyncHandler's .catch(next).
    if (story) {
      void (async () => {
        console.log('[Notification Trigger] publish: episode', episode._id.toString(), 'story', story._id.toString());
        try {
          await createNewEpisodeNotifications(episode as any, story as any);
        } catch (err) {
          console.error('[notifications] new_episode fan-out failed:', err);
        }
        if (episode.voteQuestionId) {
          try {
            await createVotingOpenedNotifications(
              episode as any,
              story as any,
              episode.voteQuestionId as Types.ObjectId,
            );
          } catch (err) {
            console.error('[notifications] voting_opened fan-out failed:', err);
          }
        }
      })();
    } else {
      console.warn('[notifications] publish: story not found for episode', episode._id.toString(), '(storyId:', episode.storyId?.toString(), ')');
    }
  }),
);

// POST /episodes/:id/schedule — schedule episode
router.post(
  '/episodes/:id/schedule',
  asyncHandler(async (req, res) => {
    const { scheduledFor } = req.body as { scheduledFor: string };
    if (!scheduledFor) {
      throw new HttpError(400, 'scheduledFor is required.');
    }

    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      throw new HttpError(400, 'scheduledFor must be a valid ISO date string.');
    }

    const episode = await Episode.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'scheduled', scheduledFor: scheduledDate } },
      { new: true },
    );
    if (!episode) throw new HttpError(404, 'Episode not found.');
    res.json({ episode });
  }),
);

// ─── Vote configuration ───────────────────────────────────────────────────────

// POST /episodes/:id/vote — create vote question for episode
router.post(
  '/episodes/:id/vote',
  asyncHandler(async (req, res) => {
    const { question, choices, closeAt } = req.body as {
      question: string;
      choices: { title: string; description?: string }[];
      closeAt: string;
    };

    const episode = await Episode.findById(req.params.id);
    if (!episode) throw new HttpError(404, 'Episode not found.');

    if (!Array.isArray(choices) || choices.length < 2 || choices.length > 4) {
      throw new HttpError(400, 'choices must have between 2 and 4 items.');
    }

    const closeAtDate = new Date(closeAt);
    if (isNaN(closeAtDate.getTime()) || closeAtDate <= new Date()) {
      throw new HttpError(400, 'closeAt must be a valid future ISO date string.');
    }

    const voteQuestion = await VoteQuestion.create({
      episodeId: episode._id,
      question,
      choices,
      closeAt: closeAtDate,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (episode as any).voteQuestionId = voteQuestion._id;
    await episode.save();

    res.status(201).json({ voteQuestion });
  }),
);

// PATCH /votes/:id — update vote question
router.patch(
  '/votes/:id',
  asyncHandler(async (req, res) => {
    const { question, choices, closeAt, winningChoiceIndex } = req.body as {
      question?: string;
      choices?: { title: string; description?: string }[];
      closeAt?: string;
      winningChoiceIndex?: number;
    };

    const updateFields: Record<string, unknown> = {};
    if (question !== undefined) updateFields.question = question;
    if (choices !== undefined) {
      if (!Array.isArray(choices) || choices.length < 2 || choices.length > 4) {
        throw new HttpError(400, 'choices must have between 2 and 4 items.');
      }
      updateFields.choices = choices;
    }
    if (closeAt !== undefined) {
      const closeAtDate = new Date(closeAt);
      if (isNaN(closeAtDate.getTime())) {
        throw new HttpError(400, 'closeAt must be a valid ISO date string.');
      }
      updateFields.closeAt = closeAtDate;
    }
    if (winningChoiceIndex !== undefined) {
      updateFields.winningChoiceIndex = winningChoiceIndex;
    }

    const voteQuestion = await VoteQuestion.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true },
    );
    if (!voteQuestion) throw new HttpError(404, 'Vote question not found.');

    res.json({ voteQuestion });
  }),
);

export default router;
