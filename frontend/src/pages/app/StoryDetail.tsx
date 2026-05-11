import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Eye, Headphones, Lock, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { useSubscription } from '@/hooks/useSubscription';
import { useBreadcrumb } from '@/hooks/useBreadcrumb';
import CoverImage from '@/components/content/CoverImage';
import EpisodeRow from '@/components/content/EpisodeRow';
import EmptyState from '@/components/content/EmptyState';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Story {
  id: string;
  title: string;
  overview: string | null;
  coverImageUrl: string | null;
  channel: { name: string; slug: string } | null;
}

type VoteState = 'none' | 'available' | 'voted' | 'closed';

interface EpisodeItem {
  id: string;
  number: number;
  title: string;
  readTimeMinutes: number;
  audioDurationSeconds: number;
  listeningTimeMinutes: number;
  voteState: VoteState;
  voteCloseAt: string | null;
  voteWinnerLabel: string | null;
}

interface SeasonItem {
  id: string;
  number: number;
  title: string | null;
  episodes: EpisodeItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCountdown(closeAt: string, now: Date): string {
  const diff = new Date(closeAt).getTime() - now.getTime();
  if (diff <= 0) return 'Voting closed';
  const totalMins = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours >= 24 * 7) {
    const d = new Date(closeAt);
    return `Voting closes ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    return `Voting closes in ${days}d ${remH}h`;
  }
  return `Voting closes in ${hours}h ${mins}m`;
}

// ---------------------------------------------------------------------------
// VoteBadge
// ---------------------------------------------------------------------------

function VoteBadge({ state }: { state: 'available' | 'voted' | 'closed' }) {
  if (state === 'available') {
    return (
      <span className="inline-flex items-center rounded-full bg-brand-orange px-3 py-[5px] text-[11px] font-bold leading-none text-white shadow-sm">
        Voting Available
      </span>
    );
  }
  if (state === 'voted') {
    return (
      <span className="inline-flex items-center rounded-full border border-brand-cyan px-3 py-[5px] text-[11px] font-bold leading-none text-brand-cyan shadow-sm">
        You Voted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#3D3D4A] px-3 py-[5px] text-[11px] font-bold leading-none text-white shadow-sm">
      Voting Closed
    </span>
  );
}

// ---------------------------------------------------------------------------
// MobileEpisodeCard
// ---------------------------------------------------------------------------

interface CardProps {
  episode: EpisodeItem;
  isLocked: boolean;
  isExpanded: boolean;
  now: Date;
  onToggle: () => void;
  onRead: () => void;
  onListen: () => void;
}

function MobileEpisodeCard({
  episode: ep,
  isLocked,
  isExpanded,
  now,
  onToggle,
  onRead,
  onListen,
}: CardProps) {
  const expandedRef = useRef<HTMLDivElement>(null);
  const showBadge = ep.voteState !== 'none';
  const hasListeningTime = ep.listeningTimeMinutes > 0;

  // Scroll expanded card into view
  useEffect(() => {
    if (isExpanded && expandedRef.current) {
      setTimeout(() => {
        expandedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }, [isExpanded]);

  return (
    <div className={`flex flex-col relative ${showBadge ? 'mt-3' : ''}`}>
      {/* Voting badge — overlaps the top of the card */}
      {showBadge && (
        <div className="absolute -top-3 left-3 z-10">
          <VoteBadge state={ep.voteState as 'available' | 'voted' | 'closed'} />
        </div>
      )}

      {/* Card face */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Episode ${ep.number}: ${ep.title}. Voting: ${ep.voteState}`}
        aria-expanded={isExpanded}
        className={`w-full text-left bg-[#E8F3FA] border border-[#C8DEF0] px-4 transition-all duration-200 ${
          showBadge ? 'pt-5 pb-3.5' : 'py-3.5'
        } ${isExpanded ? 'rounded-t-[14px] border-b-0' : 'rounded-[14px]'} ${
          isLocked ? 'opacity-60' : 'active:opacity-80'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Left: episode label + title */}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-[#7A8FA8] mb-0.5 leading-none">
              Episode {ep.number}
            </p>
            <p className={`text-[14px] font-bold leading-snug ${isLocked ? 'text-[#6A7D90]' : 'text-[#0E1E2E]'}`}>
              {ep.title}
            </p>
          </div>

          {/* Right: metadata (always visible; locked cards use card-level opacity-60) */}
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <div className="flex items-center gap-1 text-[11px] font-medium text-[#5A7080]">
              <Eye size={11} strokeWidth={2} />
              <span>{ep.readTimeMinutes}m</span>
            </div>
            {hasListeningTime && (
              <div className="flex items-center gap-1 text-[11px] font-medium text-[#5A7080]">
                <Headphones size={11} strokeWidth={2} />
                <span>{ep.listeningTimeMinutes}m</span>
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Expanded panel */}
      {isExpanded && !isLocked && (
        <div
          ref={expandedRef}
          className="rounded-b-[14px] border border-t-0 border-[#C8DEF0] bg-[#E8F3FA] px-4 pb-4 pt-3"
        >
          {/* Majority vote recap */}
          {ep.voteWinnerLabel && (
            <div className="mb-3">
              <p className="text-[14px] font-bold text-[#0E1E2E] mb-1">
                Majority vote : &ldquo;{ep.voteWinnerLabel}&rdquo;
              </p>
              <p className="text-[13px] leading-relaxed text-[#4A6070]">
                The community has spoken. The story continues in the direction chosen by the majority.
              </p>
            </div>
          )}

          {/* Countdown for open votes */}
          {(ep.voteState === 'available' || ep.voteState === 'voted') && ep.voteCloseAt && (
            <p
              aria-live="polite"
              className="mb-3 text-[12px] font-medium text-[#7A8FA8]"
            >
              {formatCountdown(ep.voteCloseAt, now)}
            </p>
          )}

          {/* CTAs */}
          <div className="flex min-[360px]:flex-row flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={onRead}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-cyan py-3 text-[14px] font-bold text-white shadow-md shadow-brand-cyan/20 transition-all active:scale-[0.97]"
            >
              <BookOpen size={14} />
              Start Reading
            </button>
            <button
              type="button"
              onClick={onListen}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-cyan py-3 text-[14px] font-bold text-white shadow-md shadow-brand-cyan/20 transition-all active:scale-[0.97]"
            >
              <Headphones size={14} />
              Listen to Audio
            </button>
          </div>
        </div>
      )}

      {/* Locked expanded state */}
      {isExpanded && isLocked && (
        <div className="rounded-b-[14px] border border-t-0 border-[#C8DEF0] bg-[#E8F3FA] px-4 pb-4 pt-3">
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <Lock size={18} className="text-[#7A8FA8]" />
            <p className="text-[13px] font-medium text-[#4A6070]">
              Subscribe to unlock this episode.
            </p>
            <button
              type="button"
              onClick={onRead}
              className="rounded-full bg-brand-cyan px-6 py-2.5 text-[13px] font-bold text-white"
            >
              Go Premium
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function EpisodeSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-[62px] animate-pulse rounded-[14px] bg-[#E8F3FA]/50" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// StoryDetail
// ---------------------------------------------------------------------------

export default function StoryDetail() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const { isActive } = useSubscription();

  const [story, setStory] = useState<Story | null>(null);
  const [seasons, setSeasons] = useState<SeasonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useBreadcrumb(story?.title);

  // Mobile-specific state
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [expandedEpId, setExpandedEpId] = useState<string | null>(null);
  const [seasonSheetOpen, setSeasonSheetOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Desktop state
  const [openSeasons, setOpenSeasons] = useState<Set<string>>(new Set());

  // Single shared timer for all countdowns (updates every 60s)
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!storyId) return;
    Promise.all([
      api.get<{ story: Story }>(`/stories/${storyId}`),
      api.get<{ seasons: SeasonItem[] }>(`/stories/${storyId}/episodes`),
    ])
      .then(([storyRes, episodesRes]) => {
        setStory(storyRes.data.story);
        const seenSeasons = episodesRes.data.seasons;
        setSeasons(seenSeasons);
        if (seenSeasons.length > 0) {
          setSelectedSeasonId(seenSeasons[0].id);
          setOpenSeasons(new Set([seenSeasons[0].id]));
        }
      })
      .catch(() => setError('Story not found.'))
      .finally(() => setLoading(false));
  }, [storyId]);

  function toggleSeason(id: string) {
    setOpenSeasons((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleEpisodeAction(episodeId: string, mode: 'read' | 'listen', isLocked: boolean) {
    if (isLocked) {
      navigate('/subscribe');
      return;
    }
    navigate(`/episodes/${episodeId}/${mode}`);
  }

  function handleToggleEpisode(epId: string) {
    setExpandedEpId((prev) => (prev === epId ? null : epId));
  }

  const allEpisodeIds = seasons.flatMap((s) => s.episodes.map((e) => e.id));
  const freeEpisodeId = allEpisodeIds[0] ?? null;
  const activeSeason = seasons.find((s) => s.id === selectedSeasonId) ?? seasons[0] ?? null;

  if (loading) return <Spinner />;

  if (error || !story) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1 text-sm text-neutral-400 hover:text-white"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <p className="text-neutral-400">{error || 'Story not found.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary md:bg-[#0B0E14] relative">

      {/* =====================================================
          MOBILE VIEW  (< md)
         ===================================================== */}
      <div className="md:hidden">

        {/* Hero */}
        <div className="relative h-[280px] w-full overflow-hidden">
          {story.coverImageUrl ? (
            <img
              src={story.coverImageUrl}
              alt={story.title}
              className="h-full w-full object-cover object-center"
              loading="eager"
            />
          ) : (
            <div className="h-full w-full bg-[#1A1A2E]" />
          )}
          {/* Subtle bottom fade to page bg */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg-primary to-transparent pointer-events-none" />

          {/* Back button */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="absolute left-4 top-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-sm"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Page body */}
        <div className="px-5 pt-5 pb-10">

          {/* Story title */}
          <h1 className="mb-4 text-[22px] font-bold leading-tight text-white">
            {story.title}
          </h1>

          {/* Season selector pill */}
          {seasons.length > 0 && (
            <div className="mb-5">
              <button
                type="button"
                onClick={() => setSeasonSheetOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/70 px-4 py-2 text-[13px] font-bold text-brand-cyan"
              >
                {activeSeason?.title ?? `Season ${activeSeason?.number ?? 1}`}
                <ChevronDown size={13} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* Episode list */}
          {loading ? (
            <EpisodeSkeleton />
          ) : !activeSeason || activeSeason.episodes.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500">
              No episodes published yet for this season.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {activeSeason.episodes.map((ep) => {
                const isLocked = !isActive && ep.id !== freeEpisodeId;
                return (
                  <MobileEpisodeCard
                    key={ep.id}
                    episode={ep}
                    isLocked={isLocked}
                    isExpanded={expandedEpId === ep.id}
                    now={now}
                    onToggle={() => handleToggleEpisode(ep.id)}
                    onRead={() => handleEpisodeAction(ep.id, 'read', isLocked)}
                    onListen={() => handleEpisodeAction(ep.id, 'listen', isLocked)}
                  />
                );
              })}
            </div>
          )}

          {/* Upsell banner for unsubscribed readers */}
          {!isActive && allEpisodeIds.length > 1 && (
            <div className="mt-10 flex flex-col items-center gap-4 rounded-3xl border border-brand-cyan/20 bg-brand-cyan/5 px-6 py-7 text-center backdrop-blur-sm">
              <Lock size={26} className="text-brand-cyan" />
              <p className="text-[17px] font-bold text-white">Subscribe to unlock everything</p>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Get unlimited access to every story, episode, and exclusive community voting.
              </p>
              <button
                type="button"
                onClick={() => navigate('/subscribe')}
                className="mt-1 w-full rounded-full bg-brand-cyan py-3.5 text-sm font-bold text-black"
              >
                Go Premium Now
              </button>
            </div>
          )}
        </div>

        {/* Season bottom-sheet */}
        {seasonSheetOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSeasonSheetOpen(false)}
            />
            <div className="relative rounded-t-[24px] bg-bg-surface px-5 pt-4 pb-8 max-h-[65vh] overflow-y-auto">
              {/* Drag handle */}
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
              <h3 className="mb-4 text-base font-bold text-white">Select Season</h3>
              <div className="flex flex-col gap-2">
                {seasons.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedSeasonId(s.id);
                      setSeasonSheetOpen(false);
                      setExpandedEpId(null);
                    }}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-colors ${
                      s.id === selectedSeasonId
                        ? 'border border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan'
                        : 'bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="font-bold text-[14px]">
                      {s.title ?? `Season ${s.number}`}
                    </span>
                    <span className="ml-auto text-xs text-white/40">
                      {s.episodes.length} ep{s.episodes.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          DESKTOP VIEW  (≥ md) — unchanged
         ===================================================== */}
      <div className="hidden md:block">
        {/* Cinematic header background */}
        <div className="absolute top-0 left-0 right-0 h-[60vh] overflow-hidden z-0">
          <div className="absolute inset-0 bg-[#0B0E14] z-0" />
          {story.coverImageUrl && (
            <div className="absolute inset-0 z-0 opacity-20 blur-3xl animate-fade-in-up" style={{ animationDuration: '2s' }}>
              <img src={story.coverImageUrl} alt="" className="h-full w-full object-cover scale-110" />
            </div>
          )}
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/80 to-transparent" />
        </div>

        <div className="mx-auto max-w-[1440px] px-8 lg:px-12 py-12 relative z-10">
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="group inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-cyan transition-all hover:text-white"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-cyan/30 bg-brand-cyan/10 transition-colors group-hover:bg-brand-cyan group-hover:text-black">
                <ChevronLeft size={16} />
              </div>
              Back to Stories
            </button>
          </div>

          <div className="flex flex-row items-start gap-12 lg:gap-16">
            <div className="w-[300px] shrink-0 animate-fade-in-up" style={{ animationDuration: '0.8s' }}>
              <div className="overflow-hidden rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/5 bg-[#161923] relative group">
                <CoverImage
                  src={story.coverImageUrl}
                  alt={story.title}
                  aspect="portrait"
                  className="rounded-none transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>

            <div className="flex flex-col flex-1 pt-4 animate-fade-in-up" style={{ animationDuration: '0.8s', animationDelay: '0.2s', animationFillMode: 'both' }}>
              <div className="flex items-center gap-4 mb-4">
                {story.channel && (
                  <span className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand-cyan">
                    {story.channel.name} Original
                  </span>
                )}
              </div>

              <h1 className="text-5xl lg:text-7xl font-extrabold text-white tracking-tight drop-shadow-lg mb-8">
                {story.title}
              </h1>

              {story.overview && (
                <p className="text-xl leading-relaxed text-[#949BAA] font-light max-w-3xl mb-10">
                  {story.overview}
                </p>
              )}

              <div className="flex items-center gap-4">
                {seasons[0]?.episodes[0] && (
                  <button
                    type="button"
                    onClick={() => handleEpisodeAction(
                      seasons[0].episodes[0].id,
                      'read',
                      !isActive && seasons[0].episodes[0].id !== freeEpisodeId,
                    )}
                    className="flex items-center gap-4 rounded-full bg-brand-cyan px-10 py-4 text-base font-bold text-black transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(7,194,239,0.5)]"
                  >
                    Start Reading First Episode
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-20 max-w-5xl animate-fade-in-up" style={{ animationDuration: '0.8s', animationDelay: '0.4s', animationFillMode: 'both' }}>
            <h2 className="mb-10 text-3xl font-extrabold text-white tracking-tight flex items-center gap-4">
              All Episodes
              <span className="text-sm font-bold text-neutral-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                {allEpisodeIds.length} Available
              </span>
            </h2>

            {seasons.length === 0 ? (
              <EmptyState title="No episodes yet" description="Episodes are coming soon." />
            ) : (
              <div className="flex flex-col gap-8">
                {seasons.map((season) => {
                  const isOpen = openSeasons.has(season.id);
                  return (
                    <div key={season.id} className="overflow-hidden rounded-[32px] border border-white/5 bg-[#12141D]/60 backdrop-blur-xl transition-all hover:bg-[#161923]/80">
                      <button
                        type="button"
                        onClick={() => toggleSeason(season.id)}
                        className="group flex w-full items-center justify-between px-10 py-8 text-left"
                      >
                        <div className="flex items-center gap-6">
                          <span className="text-3xl font-bold text-white transition-colors group-hover:text-brand-cyan">
                            {season.title ?? `Season ${season.number}`}
                          </span>
                        </div>
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-white/5 border border-white/5 transition-all duration-500 ${isOpen ? 'rotate-180 bg-brand-cyan/20 border-brand-cyan/30' : ''}`}>
                          <ChevronDown size={24} className={isOpen ? 'text-brand-cyan' : 'text-white'} />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-white/5 p-6 flex flex-col gap-3">
                          {season.episodes.map((ep) => {
                            const isLocked = !isActive && ep.id !== freeEpisodeId;
                            return (
                              <EpisodeRow
                                key={ep.id}
                                episode={ep}
                                isLocked={isLocked}
                                onRead={() => handleEpisodeAction(ep.id, 'read', isLocked)}
                                onListen={ep.audioDurationSeconds > 0 ? () => handleEpisodeAction(ep.id, 'listen', isLocked) : undefined}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
