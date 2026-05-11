import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import GuestHero from '@/components/auth/GuestHero';
import { RefreshCw } from 'lucide-react';
import emptyLibraryHero from '@/assets/5 1 (1).png';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LibraryItem {
  id: string;
  title: string;
  coverImageUrl: string | null;
  currentEpisode: {
    id: string;
    number: number;
    title: string;
    hasAudio: boolean;
    seasonName: string; // season title only, e.g. "Awakening Shadows"
  } | null;
  progress: {
    mode: 'read' | 'listen';
    completedAt: string | null;
    updatedAt: string;
  };
}

interface Channel {
  id: string;
  name: string;
  slug: string;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function LibrarySkeleton() {
  return (
    <div className="px-5 pt-6" style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}>
      <div className="h-7 w-44 rounded-lg bg-white/[0.06] animate-pulse mb-4" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`flex gap-4 py-4 animate-pulse ${i < 2 ? 'border-b border-white/[0.06]' : ''}`}>
          <div className="h-[88px] w-[88px] shrink-0 rounded-[14px] bg-white/[0.06]" />
          <div className="flex flex-1 flex-col gap-2 justify-center">
            <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
            <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
            <div className="h-3 w-2/5 rounded bg-white/[0.04]" />
            <div className="mt-2 flex gap-3">
              <div className="h-9 flex-1 rounded-[10px] bg-white/[0.06]" />
              <div className="h-9 flex-1 rounded-[10px] bg-white/[0.06]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function LibraryError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <p className="text-sm text-neutral-400">Failed to load your library.</p>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white"
      >
        <RefreshCw size={14} /> Try again
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state — matches design Image A
// ---------------------------------------------------------------------------

function LibraryEmptyState() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    api.get<{ channels: Channel[] }>('/channels?sort=latest&limit=3').then(({ data }) => {
      setChannels(data.channels);
    }).catch(() => {});
  }, []);

  return (
    <div
      className="flex flex-col bg-[#0B0E14]"
      style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}
    >
      {/* Hero illustration — edge-to-edge, square aspect ratio */}
      <div className="relative w-full aspect-square overflow-hidden">
        <img
          src={emptyLibraryHero}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-top"
        />
        {/* Fade illustration into page background at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0E14]/20 via-transparent to-[#0B0E14] pointer-events-none" />
        {/* "No Open Books" overlaid top-left */}
        <h1 className="absolute left-5 top-6 text-[22px] font-bold text-white drop-shadow-lg">
          No Open Books
        </h1>
      </div>

      {/* Body */}
      <div className="flex flex-col items-center px-5 pt-6 pb-4 text-center">
        <h2 className="text-[20px] font-bold text-white leading-snug mb-3">
          Start your reading with an<br />entertaining story
        </h2>
        <p className="text-[15px] text-[#949BAA] mb-6">
          Choose from one of our three channels
        </p>

        <div className="flex w-full flex-col gap-3">
          {channels.length > 0 ? (
            channels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => navigate(`/channels/${ch.slug}`)}
                className="w-full rounded-xl border-[1.5px] border-brand-cyan bg-transparent py-[14px] text-[15px] font-semibold text-brand-cyan transition-all active:opacity-70"
              >
                {ch.name}
              </button>
            ))
          ) : (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-[54px] w-full animate-pulse rounded-xl bg-white/[0.04]" />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Populated state — matches design Image B
// ---------------------------------------------------------------------------

function LibraryCard({ item, isLast }: { item: LibraryItem; isLast: boolean }) {
  const navigate = useNavigate();
  const ep = item.currentEpisode;

  return (
    <div className={`flex gap-4 py-4 ${!isLast ? 'border-b border-white/[0.06]' : ''}`}>
      {/* Cover — 88×88, 14px radius */}
      <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[14px] bg-[#1E2130]">
        {item.coverImageUrl ? (
          <img
            src={item.coverImageUrl}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#1E2130] to-[#252840]" />
        )}
      </div>

      {/* Text + CTAs */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-[18px] font-bold text-white leading-snug">
          {item.title}
        </p>
        {ep && (
          <>
            <p className="text-[14px] text-[#949BAA]">Episode {ep.number}</p>
            {ep.seasonName ? (
              <p className="text-[14px] text-[#949BAA]">{ep.seasonName}</p>
            ) : null}
          </>
        )}

        {ep && (
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => navigate(`/episodes/${ep.id}/read`)}
              className="flex flex-1 items-center justify-center rounded-[10px] bg-brand-cyan px-6 py-[10px] text-[14px] font-bold text-[#0A0A14] transition-all active:scale-95"
            >
              Read
            </button>
            <button
              type="button"
              onClick={() => navigate(`/episodes/${ep.id}/listen`)}
              className="flex flex-1 items-center justify-center rounded-[10px] bg-brand-cyan px-6 py-[10px] text-[14px] font-bold text-[#0A0A14] transition-all active:scale-95"
            >
              Listen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LibraryPopulated({ items }: { items: LibraryItem[] }) {
  return (
    <div
      className="flex flex-col px-5 pt-6 bg-[#0B0E14] min-h-screen"
      style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}
    >
      <h1 className="text-[22px] font-bold text-white mb-2">Your Open Books</h1>
      {items.map((item, i) => (
        <LibraryCard key={item.id} item={item} isLast={i === items.length - 1} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop view — unchanged design, season label fix applied
// ---------------------------------------------------------------------------

function LibraryDesktop({ items }: { items: LibraryItem[] }) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="h-14 w-14 rounded-2xl border border-white/10 flex items-center justify-center bg-white/[0.03]">
          <span className="text-2xl">📚</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">No open books yet</h2>
          <p className="text-[#949BAA]">Start reading a story to add it here.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/channels')}
          className="rounded-full bg-brand-cyan px-8 py-3 text-sm font-bold text-black"
        >
          Browse Channels
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-10">
        <h1 className="text-5xl font-extrabold text-white tracking-tight mb-2">Your Open Books</h1>
        <p className="text-[#949BAA] text-lg font-light">Continue where you left off.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {items.map((item, i) => {
          const ep = item.currentEpisode;
          return (
            <div
              key={item.id}
              className="group relative flex gap-6 rounded-[24px] bg-[#12141D]/80 backdrop-blur-xl border border-white/5 p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:bg-[#161923] hover:border-brand-cyan/20 overflow-hidden"
              style={{ animation: `fadeInUp 0.6s ease-out ${0.2 + i * 0.1}s both` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-brand-cyan/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

              <div className="w-24 shrink-0 relative overflow-hidden rounded-[16px] shadow-lg">
                {item.coverImageUrl ? (
                  <img src={item.coverImageUrl} className="h-full w-full object-cover aspect-[2/3] transition-transform duration-700 group-hover:scale-110" alt="" />
                ) : (
                  <div className="h-full w-full aspect-[2/3] bg-gradient-to-br from-[#161923] to-[#1A1A22]" />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-between py-2 relative z-10">
                <div>
                  <h3 className="line-clamp-1 text-xl font-extrabold text-white transition-colors duration-300 group-hover:text-brand-cyan tracking-tight">
                    {item.title}
                  </h3>
                  {ep && (
                    <p className="mt-1 text-sm text-[#949BAA]">
                      Episode {ep.number}{ep.seasonName ? ` · ${ep.seasonName}` : ''}
                    </p>
                  )}
                </div>

                {ep && (
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/episodes/${ep.id}/read`)}
                      className="flex items-center gap-2 rounded-xl bg-brand-cyan px-6 py-2.5 text-sm font-bold text-black transition-all hover:scale-105"
                    >
                      Read Now
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/episodes/${ep.id}/listen`)}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-white/10"
                    >
                      Listen
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Library page
// ---------------------------------------------------------------------------

export default function Library() {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function fetchLibrary() {
    setLoading(true);
    setError(false);
    api
      .get<{ stories: LibraryItem[] }>('/me/library')
      .then(({ data }) => setItems(data.stories))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) return;
    fetchLibrary();
  }, [user]);

  if (!user) {
    return (
      <GuestHero
        title="Hey, Guest Reader!"
        description="Sign up to create your personal library and track your progress through the Storyuuniverse."
      />
    );
  }

  // ── Mobile (< md) ──
  const mobileView = (
    <div className="md:hidden">
      {loading ? (
        <LibrarySkeleton />
      ) : error ? (
        <LibraryError onRetry={fetchLibrary} />
      ) : items.length === 0 ? (
        <LibraryEmptyState />
      ) : (
        <LibraryPopulated items={items} />
      )}
    </div>
  );

  // ── Desktop (≥ md) ──
  const desktopView = (
    <div className="hidden md:block mx-auto max-w-[1440px] px-8 py-16 lg:px-12 min-h-[90vh] animate-fade-in-up">
      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
        </div>
      ) : error ? (
        <LibraryError onRetry={fetchLibrary} />
      ) : (
        <LibraryDesktop items={items} />
      )}
    </div>
  );

  return (
    <div className="bg-[#0B0E14] min-h-screen">
      {mobileView}
      {desktopView}
    </div>
  );
}
