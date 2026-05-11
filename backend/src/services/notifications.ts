import type { Response } from 'express';
import { Types } from 'mongoose';
import { Notification } from '../models/Notification.js';
import { ReadingProgress } from '../models/ReadingProgress.js';

// ---------------------------------------------------------------------------
// SSE connection registry
//
// Keyed by userId (string). Each user may have multiple open tabs/devices,
// each holding its own Response. We store them in a Set per userId.
//
// SINGLE-INSTANCE ASSUMPTION: This registry lives in Node process memory.
// If you deploy multiple backend instances, a notification fired on instance A
// will not reach a user connected to instance B. Cross-instance fan-out via
// Redis pub/sub is a future concern — out of scope for current deployment.
// ---------------------------------------------------------------------------

const sseClients = new Map<string, Set<Response>>();

export function registerSSEClient(userId: string, res: Response): void {
  const key = userId.toString();
  if (!sseClients.has(key)) sseClients.set(key, new Set());
  sseClients.get(key)!.add(res);
  console.log(`[SSE] Client registered userId=${key} connections=${sseClients.get(key)!.size}`);
}

export function unregisterSSEClient(userId: string, res: Response): void {
  const key = userId.toString();
  const set = sseClients.get(key);
  if (!set) return;
  set.delete(res);
  const remaining = set.size;
  if (remaining === 0) sseClients.delete(key);
  console.log(`[SSE] Client unregistered userId=${key} connections=${remaining}`);
}

export function sendNotificationToUser(userId: string, notification: object): void {
  const key = userId.toString();
  const set = sseClients.get(key);
  if (!set || set.size === 0) return;
  const payload = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
  let sent = 0;
  for (const res of set) {
    try {
      res.write(payload);
      // Flush through compression/proxy buffering if the middleware exposes flush().
      (res as any).flush?.();
      sent++;
    } catch {
      // Client disconnected mid-write; the close handler will clean up.
    }
  }
  console.log(`[SSE] Fanned out userId=${key} sent=${sent}/${set.size}`);
}

// ---------------------------------------------------------------------------
// Implicit-follower query
//
// A user is considered to "follow" a story if they have a ReadingProgress
// record for any episode of that story whose updatedAt falls within the last
// IMPLICIT_FOLLOWER_WINDOW_DAYS days.
//
// 30 days was chosen to include episodic readers who binge every few weeks
// while excluding users who read one chapter long ago and disengaged. The
// window is rolling (relative to now), not calendar-month based.
//
// Edge case — brand-new stories: the inaugural episode produces no followers
// because no one has engaged yet. Readers who pick up Episode 1 will be
// notified about Episode 2 and beyond. This is intentional — notifications
// are a reward for engagement, not a broadcast to the whole platform.
//
// Performance note: for very popular stories (10k+ active readers), the
// distinct query may slow down. Cache or a denormalised StoryFollowerCache
// collection would help at that scale — deferred.
// ---------------------------------------------------------------------------

const IMPLICIT_FOLLOWER_WINDOW_DAYS = 30;

async function getImplicitFollowers(storyId: Types.ObjectId): Promise<Types.ObjectId[]> {
  const cutoff = new Date(Date.now() - IMPLICIT_FOLLOWER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  // distinct returns raw values from MongoDB; cast to ObjectId for downstream use.
  const userIds = await ReadingProgress.distinct('userId', {
    storyId,
    updatedAt: { $gte: cutoff },
  }) as Types.ObjectId[];
  return userIds;
}

// ---------------------------------------------------------------------------
// Notification creation helpers
// ---------------------------------------------------------------------------

function fmtNotification(doc: any) {
  return {
    id: doc._id.toString(),
    type: doc.type,
    title: doc.title,
    body: doc.body ?? '',
    imageUrl: doc.imageUrl ?? null,
    data: doc.data ?? {},
    readAt: doc.readAt,
    createdAt: doc.createdAt,
  };
}

/**
 * Trigger 1 — new episode published on a story implicit-followers are tracking.
 */
export async function createNewEpisodeNotifications(episode: {
  _id: Types.ObjectId;
  storyId: Types.ObjectId;
  title: string;
  number: number;
  coverImageUrl?: string | null;
}, story: {
  _id: Types.ObjectId;
  title: string;
  coverImageUrl?: string | null;
}): Promise<void> {
  console.log('[Notification Trigger] new_episode fired episode=%s story=%s', episode._id.toString(), story._id.toString());
  const followers = await getImplicitFollowers(story._id);
  console.log('[Notification Trigger] new_episode followers=%d', followers.length);
  if (followers.length === 0) return;

  const imageUrl = episode.coverImageUrl ?? story.coverImageUrl ?? null;
  const docs = followers.map((userId) => ({
    userId,
    type: 'new_episode',
    title: `New episode in ${story.title}`,
    body: `Episode ${episode.number}: ${episode.title}`,
    imageUrl,
    data: {
      storyId: story._id.toString(),
      episodeId: episode._id.toString(),
    },
    readAt: null,
  }));

  const created = await Notification.insertMany(docs);
  for (const doc of created) {
    sendNotificationToUser(doc.userId.toString(), fmtNotification(doc));
  }
}

/**
 * Trigger 2 — voting opened (fires alongside Trigger 1 when episode has a vote question).
 */
export async function createVotingOpenedNotifications(episode: {
  _id: Types.ObjectId;
  storyId: Types.ObjectId;
  title: string;
  coverImageUrl?: string | null;
}, story: {
  _id: Types.ObjectId;
  title: string;
  coverImageUrl?: string | null;
}, voteQuestionId: Types.ObjectId): Promise<void> {
  const followers = await getImplicitFollowers(story._id);
  if (followers.length === 0) return;

  const imageUrl = episode.coverImageUrl ?? story.coverImageUrl ?? null;
  const docs = followers.map((userId) => ({
    userId,
    type: 'voting_opened',
    title: `Voting is open for ${episode.title}`,
    body: 'Help shape the story — vote on what happens next',
    imageUrl,
    data: {
      storyId: story._id.toString(),
      episodeId: episode._id.toString(),
      voteQuestionId: voteQuestionId.toString(),
    },
    readAt: null,
  }));

  const created = await Notification.insertMany(docs);
  for (const doc of created) {
    sendNotificationToUser(doc.userId.toString(), fmtNotification(doc));
  }
}

/**
 * Trigger 3 — voting closing soon (called by the vote scheduler ~24h before closeAt).
 */
export async function createVotingClosingSoonNotifications(episode: {
  _id: Types.ObjectId;
  storyId: Types.ObjectId;
  title: string;
  coverImageUrl?: string | null;
}, story: {
  _id: Types.ObjectId;
  title: string;
  coverImageUrl?: string | null;
}, voteQuestionId: Types.ObjectId): Promise<void> {
  const followers = await getImplicitFollowers(story._id);
  if (followers.length === 0) return;

  const imageUrl = episode.coverImageUrl ?? story.coverImageUrl ?? null;
  const docs = followers.map((userId) => ({
    userId,
    type: 'voting_closing_soon',
    title: 'Voting closes soon',
    body: `Less than 24 hours left to vote on ${episode.title}`,
    imageUrl,
    data: {
      storyId: story._id.toString(),
      episodeId: episode._id.toString(),
      voteQuestionId: voteQuestionId.toString(),
    },
    readAt: null,
  }));

  const created = await Notification.insertMany(docs);
  for (const doc of created) {
    sendNotificationToUser(doc.userId.toString(), fmtNotification(doc));
  }
}

/**
 * Trigger 4 — voting results announced (called by the vote scheduler after closeAt).
 */
export async function createVotingResultsNotifications(episode: {
  _id: Types.ObjectId;
  storyId: Types.ObjectId;
  title: string;
  coverImageUrl?: string | null;
}, story: {
  _id: Types.ObjectId;
  title: string;
  coverImageUrl?: string | null;
}, voteQuestionId: Types.ObjectId, winningChoiceTitle: string, winningChoiceIndex: number): Promise<void> {
  const followers = await getImplicitFollowers(story._id);
  if (followers.length === 0) return;

  const imageUrl = episode.coverImageUrl ?? story.coverImageUrl ?? null;
  const docs = followers.map((userId) => ({
    userId,
    type: 'voting_results',
    title: `Voting results are in for ${episode.title}`,
    body: `The community chose: "${winningChoiceTitle}"`,
    imageUrl,
    data: {
      storyId: story._id.toString(),
      episodeId: episode._id.toString(),
      voteQuestionId: voteQuestionId.toString(),
      winningChoiceTitle,
      winningChoiceIndex,
    },
    readAt: null,
  }));

  const created = await Notification.insertMany(docs);
  for (const doc of created) {
    sendNotificationToUser(doc.userId.toString(), fmtNotification(doc));
  }
}
