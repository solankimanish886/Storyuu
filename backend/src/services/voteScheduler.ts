import { VoteQuestion } from '../models/VoteQuestion.js';
import { Episode } from '../models/Episode.js';
import { Story } from '../models/Story.js';
import { Vote } from '../models/Vote.js';
import {
  createVotingClosingSoonNotifications,
  createVotingResultsNotifications,
} from './notifications.js';
import { logger } from '../config/logger.js';

// ---------------------------------------------------------------------------
// Vote scheduler
//
// Runs every hour to handle two triggers:
//   1. voting_closing_soon — 23–25h before closeAt (one send per VoteQuestion)
//   2. voting_results      — after closeAt, once winner is known (one send per VoteQuestion)
//
// Each VoteQuestion carries boolean flags to prevent duplicate sends.
// Tie-breaking rule: if multiple choices are tied, the lowest choiceIndex wins
// (Option A beats B beats C). This is documented here because it affects user
// perception of fairness and should not be changed silently.
// ---------------------------------------------------------------------------

async function processClosingSoon(): Promise<void> {
  const now = new Date();
  // Window: closeAt is between 23h and 25h from now
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const voteQuestions = await VoteQuestion.find({
    closeAt: { $gt: windowStart, $lte: windowEnd },
    closingSoonNotificationSent: false,
  }).lean();

  for (const vq of voteQuestions) {
    try {
      const episode = await Episode.findById(vq.episodeId).lean();
      if (!episode) continue;
      const story = await Story.findById((episode as any).storyId).lean();
      if (!story) continue;

      await createVotingClosingSoonNotifications(
        episode as any,
        story as any,
        vq._id,
      );

      await VoteQuestion.findByIdAndUpdate(vq._id, {
        $set: { closingSoonNotificationSent: true },
      });
    } catch (err) {
      logger.error({ err, voteQuestionId: vq._id }, '[scheduler] voting_closing_soon failed');
    }
  }
}

async function processResults(): Promise<void> {
  const now = new Date();

  const voteQuestions = await VoteQuestion.find({
    closeAt: { $lte: now },
    resultsNotificationSent: false,
  }).lean();

  for (const vq of voteQuestions) {
    try {
      // Compute winner if not already set.
      let winningChoiceIndex = vq.winningChoiceIndex ?? null;
      if (winningChoiceIndex === null) {
        const choices = (vq as any).choices as Array<{ title: string }>;
        const voteCounts = new Array<number>(choices.length).fill(0);

        const votes = await Vote.find({ voteQuestionId: vq._id }).select('choiceIndex').lean();
        for (const v of votes) {
          const idx = (v as any).choiceIndex;
          if (idx >= 0 && idx < voteCounts.length) {
            voteCounts[idx]++;
          }
        }

        // Find max vote count; lowest index wins ties.
        let maxVotes = -1;
        for (let i = 0; i < voteCounts.length; i++) {
          if (voteCounts[i] > maxVotes) {
            maxVotes = voteCounts[i];
            winningChoiceIndex = i;
          }
        }

        if (winningChoiceIndex === null) winningChoiceIndex = 0;

        await VoteQuestion.findByIdAndUpdate(vq._id, {
          $set: { winningChoiceIndex },
        });
      }

      const choices = (vq as any).choices as Array<{ title: string }>;
      const winningChoiceTitle = choices[winningChoiceIndex]?.title ?? 'Unknown';

      const episode = await Episode.findById(vq.episodeId).lean();
      if (!episode) continue;
      const story = await Story.findById((episode as any).storyId).lean();
      if (!story) continue;

      await createVotingResultsNotifications(
        episode as any,
        story as any,
        vq._id,
        winningChoiceTitle,
        winningChoiceIndex,
      );

      await VoteQuestion.findByIdAndUpdate(vq._id, {
        $set: { resultsNotificationSent: true },
      });
    } catch (err) {
      logger.error({ err, voteQuestionId: vq._id }, '[scheduler] voting_results failed');
    }
  }
}

export function startVoteScheduler(): void {
  const run = async () => {
    try {
      await processClosingSoon();
    } catch (err) {
      logger.error({ err }, '[scheduler] processClosingSoon error');
    }
    try {
      await processResults();
    } catch (err) {
      logger.error({ err }, '[scheduler] processResults error');
    }
  };

  // Run once shortly after startup, then every hour.
  setTimeout(run, 5_000);
  setInterval(run, 60 * 60 * 1000);
}
