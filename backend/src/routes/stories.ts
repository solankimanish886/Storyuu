import { Router, type Request } from 'express';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Story } from '../models/Story.js';
import { Channel } from '../models/Channel.js';
import { Season } from '../models/Season.js';
import { Episode } from '../models/Episode.js';
import { VoteQuestion } from '../models/VoteQuestion.js';
import { Vote } from '../models/Vote.js';
import { HttpError } from '../middleware/error.js';
import { env } from '../config/env.js';


const router = Router();

// Parse JWT if present, but don't require it
function tryGetUserId(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

function fmtStory(s: any) {
  return {
    id: s._id.toString(),
    channelId: s.channelId.toString(),
    title: s.title,
    slug: s.slug,
    overview: s.overview ?? null,
    coverImageUrl: s.coverImageUrl ?? null,
    status: s.status,
    publishedAt: s.publishedAt ?? null,
    sortOrder: s.sortOrder ?? 0,
  };
}

function fmtChannel(c: any) {
  return {
    id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
    coverImageUrl: c.coverImageUrl ?? null,
  };
}

function fmtEpisode(
  e: any,
  voteData: {
    state: 'none' | 'available' | 'voted' | 'closed';
    closeAt: string | null;
    winnerLabel: string | null;
    winnerChoiceIndex: number | null;
  } = { state: 'none', closeAt: null, winnerLabel: null, winnerChoiceIndex: null },
) {
  return {
    id: e._id.toString(),
    storyId: e.storyId.toString(),
    seasonId: e.seasonId.toString(),
    number: e.number,
    title: e.title,
    status: e.status,
    publishedAt: e.publishedAt ?? null,
    readTimeMinutes: e.readTimeMinutes ?? 5,
    audioDurationSeconds: e.audioDurationSeconds ?? 0,
    listeningTimeMinutes: Math.round((e.audioDurationSeconds ?? 0) / 60),
    voteState: voteData.state,
    voteCloseAt: voteData.closeAt,
    voteWinnerLabel: voteData.winnerLabel,
    voteWinnerChoiceIndex: voteData.winnerChoiceIndex,
  };
}

// GET /trending — latest published stories, sorted by publish recency (must precede /:storyId)
router.get('/trending', asyncHandler(async (_req, res) => {
  const stories = await Story.find({ status: 'published' })
    .sort({ publishedAt: -1, _id: -1 })
    .limit(10)
    .lean();

  res.set('Cache-Control', 'no-cache, must-revalidate');
  res.json({ stories: stories.map(fmtStory) });
}));

// GET /:storyId — story detail with channel (public)
router.get('/:storyId', asyncHandler(async (req, res) => {
  const story = await Story.findById(req.params.storyId).lean();
  if (!story || story.status !== 'published') throw new HttpError(404, 'Story not found.');

  const channel = await Channel.findById(story.channelId).lean();

  res.json({
    story: {
      ...fmtStory(story),
      channel: channel ? fmtChannel(channel) : null,
    },
  });
}));

// GET /:storyId/episodes — published episodes grouped by season, with vote state
router.get('/:storyId/episodes', asyncHandler(async (req, res) => {
  const story = await Story.findById(req.params.storyId).lean();
  if (!story || story.status !== 'published') throw new HttpError(404, 'Story not found.');

  const [seasons, episodes] = await Promise.all([
    Season.find({ storyId: story._id }).sort({ number: 1 }).lean(),
    Episode.find({ storyId: story._id, status: 'published' }).sort({ number: 1 }).lean(),
  ]);

  // Fetch all vote questions for these episodes in one query
  const episodeIds = episodes.map((e) => e._id);
  const voteQuestions = await VoteQuestion.find({ episodeId: { $in: episodeIds } })
    .select('episodeId question choices closeAt openAt winningChoiceIndex')
    .lean();

  const vqByEpId = new Map<string, typeof voteQuestions[number]>();
  for (const vq of voteQuestions) {
    vqByEpId.set(vq.episodeId.toString(), vq);
  }

  // Optional: check which questions the authenticated user has already voted on
  const userId = tryGetUserId(req);
  const votedVQIds = new Set<string>();
  if (userId && voteQuestions.length > 0) {
    const vqIds = voteQuestions.map((vq) => vq._id);
    const userVotes = await Vote.find({
      voteQuestionId: { $in: vqIds },
      userId: new Types.ObjectId(userId),
    })
      .select('voteQuestionId')
      .lean();
    for (const v of userVotes) {
      votedVQIds.add(v.voteQuestionId.toString());
    }
  }

  const now = new Date();

  function getVoteData(ep: typeof episodes[number]): ReturnType<typeof fmtEpisode>['voteState'] extends string
    ? any
    : never {
    const vq = vqByEpId.get(ep._id.toString());
    if (!vq) return { state: 'none', closeAt: null, winnerLabel: null, winnerChoiceIndex: null };

    const isClosed = vq.closeAt <= now || vq.winningChoiceIndex != null;

    if (isClosed) {
      const winnerIdx = vq.winningChoiceIndex ?? null;
      const winnerLabel =
        winnerIdx != null ? (vq.choices[winnerIdx] as any)?.title ?? null : null;
      return {
        state: 'closed',
        closeAt: vq.closeAt.toISOString(),
        winnerLabel,
        winnerChoiceIndex: winnerIdx,
      };
    }

    const hasVoted = userId ? votedVQIds.has(vq._id.toString()) : false;
    return {
      state: hasVoted ? 'voted' : 'available',
      closeAt: vq.closeAt.toISOString(),
      winnerLabel: null,
      winnerChoiceIndex: null,
    };
  }

  const bySeasonId = new Map<string, typeof episodes>();
  for (const ep of episodes) {
    const key = ep.seasonId.toString();
    if (!bySeasonId.has(key)) bySeasonId.set(key, []);
    bySeasonId.get(key)!.push(ep);
  }

  res.json({
    seasons: seasons.map((s) => ({
      id: s._id.toString(),
      number: s.number,
      title: s.title ?? null,
      description: s.description ?? null,
      episodes: (bySeasonId.get(s._id.toString()) ?? []).map((ep) =>
        fmtEpisode(ep, getVoteData(ep)),
      ),
    })),
  });
}));

export default router;
