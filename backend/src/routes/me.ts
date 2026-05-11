import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import { stub, asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { Story } from '../models/Story.js';
import { Episode } from '../models/Episode.js';
import { ReadingProgress } from '../models/ReadingProgress.js';
import { Season } from '../models/Season.js';
import { VoteQuestion } from '../models/VoteQuestion.js';
import { HttpError } from '../middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/avatars');

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${req.auth!.userId}${ext}`);
  },
});

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new HttpError(400, 'Only JPEG, PNG, and WebP images are allowed.') as unknown as null, false);
  },
});

const router = Router();
router.use(requireAuth);

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
  };
}

function fmtEpisode(e: any) {
  return {
    id: e._id.toString(),
    storyId: e.storyId.toString(),
    seasonId: e.seasonId.toString(),
    number: e.number,
    title: e.title,
    readTimeMinutes: e.readTimeMinutes ?? 5,
    audioDurationSeconds: e.audioDurationSeconds ?? 0,
  };
}

// GET / — hydrate session
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth!.userId).lean();
    if (!user) throw new HttpError(404, 'User not found.');

    const sub = await Subscription.findOne({ userId: user._id }).sort({ createdAt: -1 }).lean();
    const subscriptionStatus = sub ? (sub.status as string) : 'none';

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isFoundingMember: user.isFoundingMember,
        subscriptionStatus,
        avatarUrl: user.avatarUrl ?? null,
        createdAt: (user as any).createdAt,
      },
    });
  }),
);

// PUT / — update name fields
router.put(
  '/',
  asyncHandler(async (req, res) => {
    const { firstName, lastName } = req.body as { firstName?: string; lastName?: string };
    const set: Record<string, string> = {};
    if (firstName !== undefined) set.firstName = String(firstName).trim();
    if (lastName !== undefined) set.lastName = String(lastName).trim();
    if (!Object.keys(set).length) return res.json({ success: true });

    const user = await User.findByIdAndUpdate(req.auth!.userId, { $set: set }, { new: true }).lean();
    if (!user) throw new HttpError(404, 'User not found.');

    res.json({ user: { firstName: user.firstName ?? '', lastName: user.lastName ?? '' } });
  }),
);

// POST /avatar — upload and persist avatar for the authenticated user
router.post(
  '/avatar',
  (req, res, next) => {
    uploadAvatar.single('avatar')(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return next(new HttpError(400, 'File too large. Maximum size is 5 MB.'));
      }
      if (err) return next(err);
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'No file uploaded.');

    const protocol = req.protocol;
    const host = req.get('host') ?? 'localhost:4000';
    const avatarUrl = `${protocol}://${host}/uploads/avatars/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.auth!.userId,
      { $set: { avatarUrl } },
      { new: true },
    ).lean();
    if (!user) throw new HttpError(404, 'User not found.');

    res.json({ avatarUrl });
  }),
);

// POST /password — change password (verify current, set new)
router.post(
  '/password',
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      throw new HttpError(400, 'currentPassword and newPassword are required.');
    }

    if (newPassword.length < 8) {
      throw new HttpError(400, 'New password must be at least 8 characters.');
    }
    if (!/[A-Z]/.test(newPassword)) {
      throw new HttpError(400, 'New password must contain at least one uppercase letter.');
    }
    if (!/[0-9]/.test(newPassword)) {
      throw new HttpError(400, 'New password must contain at least one number.');
    }

    const user = await User.findById(req.auth!.userId).select('+passwordHash').lean();
    if (!user) throw new HttpError(404, 'User not found.');

    if (!user.passwordHash) {
      throw new HttpError(400, 'This account uses social login and does not have a password.');
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) throw new HttpError(400, 'Current password is incorrect.');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(req.auth!.userId, {
      $set: { passwordHash },
      $inc: { tokenVersion: 1 },
    });

    res.json({ success: true });
  }),
);

router.put('/preferences', stub('§8.3.2 — reader preferences', 4));

// GET /library — stories with reading progress within the last 30 days (implicit-follow window),
// enriched with current episode + season, sorted by most recent activity first.
router.get(
  '/library',
  asyncHandler(async (req, res) => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const progresses = await ReadingProgress.find({
      userId: req.auth!.userId,
      updatedAt: { $gte: cutoff },
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (!progresses.length) return res.json({ stories: [] });

    const storyIds = [...new Set(progresses.map((p) => p.storyId.toString()))];
    const stories = await Story.find({ _id: { $in: storyIds }, status: 'published' }).lean();

    const latestProgress = new Map<string, (typeof progresses)[0]>();
    for (const p of progresses) {
      const key = p.storyId.toString();
      if (!latestProgress.has(key)) latestProgress.set(key, p);
    }

    const episodeIds = [...latestProgress.values()].map((p) => p.episodeId);
    const [episodes, ] = await Promise.all([
      Episode.find({ _id: { $in: episodeIds } }).lean(),
    ]);
    const seasonIds = [...new Set(episodes.map((e) => (e as any).seasonId.toString()))];
    const seasons = await Season.find({ _id: { $in: seasonIds } }).lean();

    const episodeMap = new Map(episodes.map((e) => [e._id.toString(), e]));
    const seasonMap = new Map(seasons.map((s) => [s._id.toString(), s]));

    res.json({
      stories: stories
        .map((s) => {
          const prog = latestProgress.get(s._id.toString());
          if (!prog) return null;
          const ep = episodeMap.get(prog.episodeId.toString());
          const season = ep ? seasonMap.get((ep as any).seasonId.toString()) : null;
          return {
            id: s._id.toString(),
            title: s.title,
            coverImageUrl: (s as any).coverImageUrl ?? null,
            currentEpisode: ep
              ? {
                  id: ep._id.toString(),
                  number: (ep as any).number,
                  title: (ep as any).title,
                  hasAudio: ((ep as any).audioDurationSeconds ?? 0) > 0,
                  seasonName: (season as any)?.title ?? '',
                }
              : null,
            progress: {
              mode: prog.mode,
              completedAt: prog.completedAt ?? null,
              updatedAt: (prog as any).updatedAt,
            },
          };
        })
        .filter(Boolean),
    });
  }),
);

// GET /continue — most recent in-progress episode
router.get(
  '/continue',
  asyncHandler(async (req, res) => {
    const latest = await ReadingProgress.findOne({
      userId: req.auth!.userId,
      completedAt: null,
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (!latest) return res.json({ episode: null });

    const [episode, story] = await Promise.all([
      Episode.findById(latest.episodeId).lean(),
      Story.findById(latest.storyId).lean(),
    ]);
    if (!episode || !story) return res.json({ episode: null });

    let voteCloseAt: string | null = null;
    if ((episode as any).voteQuestionId) {
      const vq = await VoteQuestion.findById((episode as any).voteQuestionId).lean();
      if (vq && vq.closeAt > new Date()) {
        voteCloseAt = vq.closeAt.toISOString();
      }
    }

    res.json({
      episode: {
        ...fmtEpisode(episode),
        story: fmtStory(story),
        voteCloseAt,
        progress: {
          position: latest.position,
          mode: latest.mode,
          updatedAt: (latest as any).updatedAt,
        },
      },
    });
  }),
);

// GET /recommendations — published stories not yet followed, ranked by popularity
router.get(
  '/recommendations',
  asyncHandler(async (req, res) => {
    const progresses = await ReadingProgress.find({ userId: req.auth!.userId }).select('storyId').lean();
    const startedStoryIds = progresses.map(p => p.storyId.toString());

    const stories = await Story.find({
      status: 'published',
      _id: { $nin: startedStoryIds },
    })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ stories: stories.map(fmtStory) });
  }),
);

export default router;
