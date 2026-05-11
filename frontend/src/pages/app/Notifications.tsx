import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BookOpen, Vote, Trophy, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/store/notificationStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  imageUrl: string | null;
  data: {
    storyId?: string;
    episodeId?: string;
    voteQuestionId?: string;
    winningChoiceTitle?: string;
    winningChoiceIndex?: number;
  };
  readAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function notificationRoute(n: Notification): string {
  const { episodeId } = n.data;
  if (!episodeId) return '/notifications';
  switch (n.type) {
    case 'new_episode':
      return `/episodes/${episodeId}/read`;
    case 'voting_opened':
    case 'voting_closing_soon':
      return `/episodes/${episodeId}/vote`;
    case 'voting_results':
      // VoteSuccess page shows results; falls back to episode with ?results=1 if needed.
      return `/episodes/${episodeId}/vote-success`;
    default:
      return '/notifications';
  }
}

function TypeIcon({ type }: { type: string }) {
  const cls = 'shrink-0';
  switch (type) {
    case 'new_episode':
      return <BookOpen size={18} className={`${cls} text-brand-cyan`} />;
    case 'voting_opened':
    case 'voting_closing_soon':
      return <Vote size={18} className={`${cls} text-brand-orange`} />;
    case 'voting_results':
      return <Trophy size={18} className={`${cls} text-yellow-400`} />;
    default:
      return <Bell size={18} className={`${cls} text-neutral-400`} />;
  }
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-border-subtle/50 bg-bg-surface/60 p-4">
      <div className="h-16 w-16 shrink-0 rounded-lg bg-bg-surface-alt animate-pulse" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-4 w-3/4 rounded bg-bg-surface-alt animate-pulse" />
        <div className="h-3 w-full rounded bg-bg-surface-alt animate-pulse" />
        <div className="h-3 w-1/3 rounded bg-bg-surface-alt animate-pulse" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notification card
// ---------------------------------------------------------------------------

function NotificationCard({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const navigate = useNavigate();
  const isUnread = notification.readAt === null;

  const handleClick = () => {
    if (isUnread) onRead(notification.id);
    const route = notificationRoute(notification);
    if (route !== '/notifications') navigate(route);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group w-full rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
        isUnread
          ? 'border-brand-cyan/20 bg-bg-surface shadow-sm'
          : 'border-border-subtle/40 bg-bg-surface/50 hover:border-border-subtle hover:bg-bg-surface'
      }`}
    >
      {/* Unread left accent */}
      {isUnread && (
        <span className="pointer-events-none absolute inset-y-0 left-0 w-0.5 rounded-l-xl bg-brand-cyan" />
      )}

      <div className="relative flex items-start gap-4">
        {/* Thumbnail */}
        {notification.imageUrl ? (
          <img
            src={notification.imageUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg object-cover md:h-20 md:w-20"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-bg-surface-alt md:h-20 md:w-20">
            <TypeIcon type={notification.type} />
          </div>
        )}

        {/* Text */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className={`text-sm font-semibold leading-snug ${isUnread ? 'text-white' : 'text-neutral-300'}`}>
              {notification.title}
            </p>
            <span className={`shrink-0 text-xs ${isUnread ? 'text-brand-cyan' : 'text-neutral-600'}`}>
              {relativeTime(notification.createdAt)}
            </span>
          </div>
          <p className={`mt-1 text-sm leading-relaxed ${isUnread ? 'text-neutral-300' : 'text-neutral-500'}`}>
            {notification.body}
          </p>

          {/* Image-fallback icon row + unread dot */}
          {notification.imageUrl && (
            <div className="mt-2 flex items-center gap-1.5">
              <TypeIcon type={notification.type} />
              {isUnread && (
                <span className="ml-auto h-2 w-2 rounded-full bg-brand-cyan shadow-[0_0_6px_rgba(7,194,239,0.8)]" />
              )}
            </div>
          )}
          {!notification.imageUrl && isUnread && (
            <div className="mt-2 flex justify-end">
              <span className="h-2 w-2 rounded-full bg-brand-cyan shadow-[0_0_6px_rgba(7,194,239,0.8)]" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const {
    decrementUnreadCount,
    resetUnreadCount,
    latestSSENotification,
    setLatestSSENotification,
  } = useNotificationStore();

  // ── Initial fetch ───────────────────────────────────────────────
  useEffect(() => {
    api.get<{ notifications: Notification[]; totalPages: number; unreadCount: number }>(
      `/notifications?page=1&limit=${PAGE_SIZE}`,
    )
      .then(({ data }) => {
        setNotifications(data.notifications);
        setTotalPages(data.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── SSE prepend ─────────────────────────────────────────────────
  useEffect(() => {
    if (!latestSSENotification) return;
    // Prepend to list only if not already present (by id).
    setNotifications((prev) => {
      if (prev.some((n) => n.id === latestSSENotification.id)) return prev;
      return [latestSSENotification as unknown as Notification, ...prev];
    });
    setLatestSSENotification(null);
  }, [latestSSENotification, setLatestSSENotification]);

  // ── Load more ───────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const { data } = await api.get<{ notifications: Notification[]; totalPages: number }>(
        `/notifications?page=${nextPage}&limit=${PAGE_SIZE}`,
      );
      setNotifications((prev) => [...prev, ...data.notifications]);
      setPage(nextPage);
      setTotalPages(data.totalPages);
    } catch {
      // Silent
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, page, totalPages]);

  // ── Mark one read ───────────────────────────────────────────────
  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    decrementUnreadCount();
    api.patch(`/notifications/${id}/read`).catch(() => {});
  };

  // ── Mark all read ───────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    resetUnreadCount();
    try {
      await api.post('/notifications/read-all');
    } catch {
      // Silent
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => n.readAt === null).length;

  // ── Loading skeleton ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-16">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Go back"
            >
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
            <div className="h-8 w-40 rounded-lg bg-bg-surface animate-pulse" />
          </div>
          <div className="h-8 w-28 rounded-full bg-bg-surface animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────
  if (notifications.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-16">
        <div className="mb-12 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Go back"
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </button>
          <h1 className="text-2xl font-bold text-white md:text-4xl">Notifications</h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bg-surface border border-border-subtle/40">
            <Bell size={32} className="text-neutral-500" />
          </div>
          <p className="text-xl font-bold text-white">No notifications yet</p>
          <p className="max-w-sm text-sm text-neutral-500">
            When you follow stories, we'll let you know about new episodes and voting.
          </p>
        </div>
      </div>
    );
  }

  // ── List ────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-16">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between md:mb-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Go back"
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </button>
          <h1 className="text-2xl font-bold text-white md:text-4xl">Notifications</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-brand-cyan/20 border border-brand-cyan/30 px-2.5 py-0.5 text-xs font-bold text-brand-cyan">
              {unreadCount} new
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0 || markingAll}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {markingAll ? 'Marking…' : 'Mark all as read'}
        </button>
      </div>

      {/* Cards */}
      <div className="relative space-y-3">
        {notifications.map((n) => (
          <NotificationCard key={n.id} notification={n} onRead={handleMarkRead} />
        ))}
      </div>

      {/* Load more */}
      {page < totalPages && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
