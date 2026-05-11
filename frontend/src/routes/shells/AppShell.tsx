import { Component, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Outlet, NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, BookOpen, User, Bell, Crown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useNotificationStore } from '@/store/notificationStore';
import { useBreadcrumbStore } from '@/store/breadcrumbStore';
import { api } from '@/lib/api';
import type { AuthUser } from '@/store/authStore';
import { getAvatarInitial } from '@/lib/avatarInitial';
import Logo from '@/components/ui/Logo';
import Breadcrumb from '@/components/ui/Breadcrumb';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-lg font-bold text-white">Something went wrong loading this page.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="rounded-full bg-brand-cyan px-6 py-2.5 text-sm font-bold text-black"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const TABS = [
  { to: '/home', label: 'Home', Icon: Home },
  { to: '/channels', label: 'Channels', Icon: LayoutGrid },
  { to: '/library', label: 'Library', Icon: BookOpen },
  { to: '/profile', label: 'Profile', Icon: User },
] as const;

const ROOT_TABS = ['/home', '/channels', '/library', '/profile', '/notifications'];

const ROOT_TAB_LABELS: Record<string, string> = {
  '/home': 'Home',
  '/channels': 'Channels',
  '/library': 'Library',
  '/profile': 'Profile',
  '/notifications': 'Notifications',
};

const DETAIL_LABELS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^\/stories\/[^/]+$/, label: 'Story' },
  { pattern: /^\/channels\/[^/]+$/, label: 'Channel' },
  { pattern: /^\/episodes\/[^/]+\/read$/, label: 'Reading' },
  { pattern: /^\/episodes\/[^/]+\/listen$/, label: 'Listening' },
  { pattern: /^\/episodes\/[^/]+\/vote-success$/, label: 'Vote Success' },
  { pattern: /^\/episodes\/[^/]+\/vote$/, label: 'Vote' },
  { pattern: /^\/subscribe$/, label: 'Subscribe' },
  { pattern: /^\/notify-me\/[^/]+$/, label: 'Get Notified' },
];

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const showMobileTabBar = TABS.some((t) => t.to === pathname);

  const { user, accessToken, isHydrated, setSession, clearSession, setHydrated } =
    useAuthStore();

  const {
    unreadCount,
    setUnreadCount,
    incrementUnreadCount,
    resetUnreadCount,
    setLatestSSENotification,
  } = useNotificationStore();

  const { hasPaidSubscription } = useSubscription();

  const [hydrating, setHydrating] = useState(!isHydrated && !!accessToken);
  const sseRef = useRef<EventSource | null>(null);

  // ── Breadcrumb / origin-tab tracking ──────────────────────────
  const [originTab, setOriginTab] = useState('/home');
  const originTabRef = useRef('/home');
  const { setTrail } = useBreadcrumbStore();

  useEffect(() => {
    if (ROOT_TABS.includes(pathname)) {
      originTabRef.current = pathname;
      setOriginTab(pathname);
      setTrail([{ label: ROOT_TAB_LABELS[pathname], path: pathname }]);
    } else {
      const defaultLabel =
        DETAIL_LABELS.find(({ pattern }) => pattern.test(pathname))?.label ?? '';
      setTrail([
        { label: ROOT_TAB_LABELS[originTabRef.current] ?? 'Home', path: originTabRef.current },
        { label: defaultLabel, path: pathname },
      ]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, setTrail]);

  function isTabActive(to: string): boolean {
    if (pathname === to) return true;
    if (to === '/channels' && pathname.startsWith('/channels/')) return true;
    if (!ROOT_TABS.includes(pathname) && originTab === to) return true;
    return false;
  }

  // ── Session hydration ──────────────────────────────────────────
  useEffect(() => {
    if (isHydrated || !accessToken) {
      setHydrating(false);
      return;
    }
    api
      .get<{ user: AuthUser }>('/me')
      .then(({ data }) => setSession(data.user, accessToken))
      .catch(() => clearSession())
      .finally(() => {
        setHydrating(false);
        setHydrated();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Initial unread count + SSE lifecycle ───────────────────────
  useEffect(() => {
    if (!isHydrated || !user) return;

    // Fetch initial badge count.
    api.get<{ count: number }>('/notifications/unread-count')
      .then(({ data }) => setUnreadCount(data.count))
      .catch(() => {});

    // Open SSE stream. Auth uses Bearer token in localStorage so we pass it as
    // a query param — EventSource does not support custom request headers.
    const token = localStorage.getItem('storyuu.access_token');
    if (!token) return;

    // Guard against React StrictMode double-invocation: if a connection already
    // exists from a previous run of this effect, skip creating another one.
    if (sseRef.current) return;

    const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';
    const url = `${baseURL}/notifications/stream?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url, { withCredentials: true });
    sseRef.current = source;

    // On open (and every auto-reconnect), re-fetch unread count to catch any
    // notifications that arrived while the connection was down.
    let initialOpen = true;
    source.onopen = () => {
      console.log('[SSE-Client] Connected');
      if (initialOpen) {
        initialOpen = false;
        return; // count already fetched above
      }
      api.get<{ count: number }>('/notifications/unread-count')
        .then(({ data }) => setUnreadCount(data.count))
        .catch(() => {});
    };

    source.onerror = () => {
      console.log('[SSE-Client] Error / reconnecting');
    };

    source.addEventListener('notification', (event) => {
      try {
        console.log('[SSE-Client] Notification received');
        const notification = JSON.parse(event.data);
        incrementUnreadCount();
        setLatestSSENotification(notification);
      } catch {
        // Malformed event — ignore.
      }
    });

    // EventSource auto-reconnects on failure — no manual retry needed.

    return () => {
      source.close();
      sseRef.current = null;
    };
  // Re-run when user logs in or out.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, user?.id]);

  // Close SSE and reset badge on logout.
  useEffect(() => {
    if (isHydrated && !user) {
      sseRef.current?.close();
      sseRef.current = null;
      resetUnreadCount();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (hydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
      </div>
    );
  }

  const initials = user ? getAvatarInitial(user) : '';

  return (
    <div className="flex min-h-screen bg-bg-primary text-white">
      {/* ── DESKTOP / TABLET SIDEBAR ─────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[#1E222B] bg-[#0B0E14] md:flex md:w-[72px] lg:w-64 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
        {/* Logo */}
        <div className="flex h-20 shrink-0 items-center justify-center lg:justify-start lg:px-8 mt-2">
          <Logo variant="hori-tag" className="hidden h-10 lg:block opacity-90 transition-opacity hover:opacity-100" />
          <Logo variant="mark" className="h-10 lg:hidden opacity-90 transition-opacity hover:opacity-100" />
        </div>

        {/* Nav links */}
        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-6 mt-4">
          <span className="hidden lg:block px-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#5F716F] mb-2">Main Menu</span>
          {TABS.map(({ to, label, Icon }) => {
            const active = isTabActive(to);
            return (
              <Link
                key={to}
                to={to}
                className={`group relative flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300 ${
                  active
                    ? 'bg-gradient-to-r from-brand-cyan/10 to-transparent text-brand-cyan shadow-sm'
                    : 'text-[#949BAA] hover:bg-white/5 hover:text-white hover:translate-x-1'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 h-1/2 w-1 -translate-y-1/2 rounded-r-full bg-brand-cyan shadow-[0_0_8px_theme(colors.brand.cyan)]" />
                )}
                <Icon size={20} strokeWidth={active ? 2.5 : 1.75} className={`shrink-0 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className={`hidden text-[14px] lg:block tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
              </Link>
            );
          })}

          <span className="hidden lg:block px-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#5F716F] mt-6 mb-2">Preferences</span>
          {/* Notifications link with unread badge */}
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `group relative flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-brand-cyan/10 to-transparent text-brand-cyan shadow-sm'
                  : 'text-[#949BAA] hover:bg-white/5 hover:text-white hover:translate-x-1'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-1/2 w-1 -translate-y-1/2 rounded-r-full bg-brand-cyan shadow-[0_0_8px_theme(colors.brand.cyan)]" />
                )}
                <div className="relative shrink-0">
                  <Bell size={20} strokeWidth={isActive ? 2.5 : 1.75} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className={`hidden flex-1 text-[14px] lg:block tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>Notifications</span>
                {/* Pill badge visible on desktop wide sidebar */}
                {unreadCount > 0 && (
                  <span className="hidden lg:flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none ml-auto">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        </nav>

        {/* Subscription upsell / user info */}
        <div className="shrink-0 p-4 lg:p-6 pb-8">
          {!hasPaidSubscription && (
            <NavLink
              to="/subscribe"
              className="group relative mb-4 flex items-center justify-center lg:justify-start gap-3 rounded-xl bg-gradient-to-r from-brand-cyan/10 via-brand-cyan/5 to-transparent border border-brand-cyan/20 px-4 py-3.5 transition-all hover:border-brand-cyan/40 hover:shadow-[0_0_20px_rgba(7,194,239,0.15)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <Crown size={18} className="shrink-0 text-brand-cyan" strokeWidth={2.5} />
              <span className="hidden text-[13px] font-bold tracking-wide text-brand-cyan lg:block">
                Go Premium
              </span>
            </NavLink>
          )}

          {user ? (
            <NavLink
              to="/profile"
              className="group flex items-center justify-center lg:justify-start gap-4 rounded-xl px-2 lg:px-4 py-3 transition-colors hover:bg-white/5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-orange overflow-hidden transition-transform group-hover:scale-105">
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  : <span className="text-[14px] font-bold text-black">{initials}</span>
                }
              </div>
              <div className="hidden min-w-0 flex-1 lg:block">
                <p className="truncate text-[14px] font-bold text-white tracking-wide">{user.firstName || user.email}</p>
                <p className="truncate text-[12px] text-[#5F716F] font-medium mt-0.5">{user.email}</p>
              </div>
            </NavLink>
          ) : (
            <Link
              to="/login"
              className="group flex items-center justify-center lg:justify-start gap-4 rounded-xl px-2 lg:px-4 py-3 transition-colors hover:bg-white/5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-neutral-400 shadow-lg transition-transform group-hover:scale-105">
                <User size={18} />
              </div>
              <div className="hidden min-w-0 flex-1 lg:block">
                <p className="truncate text-[14px] font-bold text-white tracking-wide">Guest Reader</p>
                <p className="truncate text-[12px] text-brand-cyan font-bold mt-0.5">Sign In</p>
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col md:ml-[72px] lg:ml-64 transition-all duration-300">
        {/* ── MOBILE TOP HEADER ── visible only on mobile (<md) ── */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#1E222B] bg-[#0B0E14]/95 px-4 backdrop-blur-sm md:hidden">
          <Logo variant="hori-tag" className="h-7 opacity-90" />
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#949BAA] transition-colors hover:bg-white/10 hover:text-white"
          >
            <Bell size={22} strokeWidth={1.75} />
            <UnreadBadge count={unreadCount} />
          </button>
        </header>

        <main className={`flex-1 ${showMobileTabBar ? 'pb-24 md:pb-0' : ''}`}>
          <ErrorBoundary>
            <Breadcrumb />
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* ── MOBILE BOTTOM TAB BAR ────────────────────────────── */}
      {showMobileTabBar && (
        <nav className="fixed inset-x-6 bottom-6 z-50 rounded-[32px] bg-[#5F716F] md:hidden shadow-xl shadow-black/40">
          <ul className="flex h-16 items-center justify-around px-4">
            {TABS.map(({ to, Icon }) => (
              <li key={to} className="flex h-full items-center">
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center justify-center rounded-full p-2 transition-colors ${
                      isActive ? 'text-white' : 'text-white/60 hover:text-white/80'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 1.75} />
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
