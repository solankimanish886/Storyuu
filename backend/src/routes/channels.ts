import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Channel } from '../models/Channel.js';
import { Story } from '../models/Story.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

function fmtChannel(c: any) {
  return {
    id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
    coverImageUrl: c.coverImageUrl ?? null,
    sortOrder: c.sortOrder ?? 0,
    storyCount: c.storyCount ?? 0,
  };
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
    followersCount: s.followersCount ?? 0,
    sortOrder: s.sortOrder ?? 0,
  };
}

// GET / — list all published channels with published story counts
// Query params: ?sort=latest (newest first by createdAt), ?limit=N
router.get('/', asyncHandler(async (req, res) => {
  const sortLatest = req.query.sort === 'latest';
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 0;

  const pipeline: any[] = [
    { $match: { isPublished: true } },
    { $sort: sortLatest ? { createdAt: -1 } : { sortOrder: 1, createdAt: 1 } },
    {
      $lookup: {
        from: 'stories',
        let: { cid: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$channelId', '$$cid'] },
                  { $eq: ['$status', 'published'] },
                ],
              },
            },
          },
          { $count: 'n' },
        ],
        as: '_sc',
      },
    },
    {
      $addFields: {
        storyCount: { $ifNull: [{ $arrayElemAt: ['$_sc.n', 0] }, 0] },
      },
    },
    { $project: { _sc: 0 } },
  ];

  if (limit > 0) pipeline.push({ $limit: limit });

  const channels = await Channel.aggregate(pipeline);

  res.json({ channels: channels.map(fmtChannel) });
}));

// GET /:slug — channel detail + its published stories
router.get('/:slug', asyncHandler(async (req, res) => {
  const channel = await Channel.findOne({ slug: req.params.slug, isPublished: true }).lean();
  if (!channel) throw new HttpError(404, 'Channel not found.');

  const stories = await Story.find({ channelId: channel._id, status: 'published' })
    .sort({ sortOrder: 1, publishedAt: -1 })
    .lean();

  res.json({
    channel: fmtChannel({ ...channel, storyCount: stories.length }),
    stories: stories.map(fmtStory),
  });
}));

// GET /:slug/stories — published stories in a channel
router.get('/:slug/stories', asyncHandler(async (req, res) => {
  const channel = await Channel.findOne({ slug: req.params.slug, isPublished: true }).lean();
  if (!channel) throw new HttpError(404, 'Channel not found.');

  const stories = await Story.find({ channelId: channel._id, status: 'published' })
    .sort({ sortOrder: 1, publishedAt: -1 })
    .lean();

  res.json({ stories: stories.map(fmtStory) });
}));

export default router;
