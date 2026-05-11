import { useState, useEffect } from 'react';
import { Outlet, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutList,
  FileText,
  Users,
  CreditCard,
  Eye,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore, type AuthUser } from '@/store/authStore';
import { useAdminCountsStore } from '@/store/adminCountsStore';
import { api } from '@/lib/api';
import Logo from '@/components/ui/Logo';
import { useToast } from '@/components/ui/Toast';

const NAV_GROUPS = [
  {
    title: 'WORKSPACE',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', Icon: Home, superAdminOnly: false },
      { to: '/admin/channels', label: 'Channels', Icon: LayoutList, count: 3, superAdminOnly: false },
      { to: '/admin/stories', label: 'Stories', Icon: FileText, count: 12, superAdminOnly: false },
    ]
  },
  {
    title: 'AUDIENCE',
    items: [
      { to: '/admin/users', label: 'Users', Icon: Users, superAdminOnly: true },
      { to: '/admin/revenue', label: 'Revenue', Icon: CreditCard, superAdminOnly: true },
    ]
  },
  {
    title: 'ACCOUNT',
    items: [
      { to: '/admin/settings', label: 'Settings', Icon: Eye, superAdminOnly: false },
    ]
  }
];

export default function AdminShell() {
  const { user, accessToken, isHydrated, setSession, clearSession, setHydrated } = useAuthStore();
  const { counts, fetchCounts } = useAdminCountsStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [hydrating, setHydrating] = useState(!isHydrated && !!accessToken);
  const [stats, setStats] = useState<{ totalChannels?: number; publishedStories?: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  }, []);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'superadmin')) {
      api.get('/admin/dashboard')
        .then(({ data }) => setStats(data.stats))
        .catch(() => {});
      fetchCounts();
    }
  }, [user]);

  useEffect(() => {
    const handler = () => {
      if (user && (user.role === 'admin' || user.role === 'superadmin')) {
        api.get('/admin/dashboard')
          .then(({ data }) => setStats(data.stats))
          .catch(() => {});
        fetchCounts();
      }
    };
    window.addEventListener('refresh-stats', handler);
    return () => window.removeEventListener('refresh-stats', handler);
  }, [user]);

  // Show admin_notice toast after redirect from a restricted route
  useEffect(() => {
    const notice = sessionStorage.getItem('storyuu.admin_notice');
    if (notice) {
      sessionStorage.removeItem('storyuu.admin_notice');
      toast(notice, 'error');
    }
  }, [location.pathname]);

  // Close sidebar on route change (mobile)
  function closeSidebar() {
    setSidebarOpen(false);
  }

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore error
    } finally {
      clearSession();
      navigate('/login');
    }
  }

  if (hydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-admin-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return <Navigate to="/home" replace />;
  }

  const initials = user.firstName?.[0]?.toUpperCase() ?? '?';

  function AvatarCircle({ size = 9 }: { size?: number }) {
    const cls = `flex h-${size} w-${size} shrink-0 items-center justify-center rounded-full overflow-hidden`;
    if (user!.avatarUrl) {
      return (
        <div className={cls}>
          <img src={user!.avatarUrl} alt="" className="h-full w-full object-cover" />
        </div>
      );
    }
    return (
      <div className={`${cls} bg-brand-orange`}>
        <span className="text-sm font-bold text-black">{initials}</span>
      </div>
    );
  }

  const sidebarContent = (
    <>
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between px-6 lg:h-24">
        <Logo variant="hori-tag" className="h-8 lg:h-10" />
        <button
          type="button"
          onClick={closeSidebar}
          className="lg:hidden p-1.5 rounded-md text-[#6A7181] hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 flex flex-col gap-6 overflow-y-auto px-6 py-2 scrollbar-hide">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.superAdminOnly || user!.role === 'superadmin'
          );
          if (visibleItems.length === 0) return null;
          return (
          <div key={group.title} className="flex flex-col gap-3">
            <h3 className="text-[11px] font-semibold tracking-[0.08em] text-[#6A7181] uppercase">
              {group.title}
            </h3>
            <div className="flex flex-col gap-1">
              {visibleItems.map((item) => {
                let dynamicCount = item.count;
                if (item.label === 'Channels' && stats?.totalChannels !== undefined) {
                  dynamicCount = stats.totalChannels;
                } else if (item.label === 'Stories' && counts?.total !== undefined) {
                  dynamicCount = counts.total;
                }

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-lg py-2 transition-all duration-200 ${
                        isActive
                          ? 'text-white font-medium'
                          : 'text-admin-text-secondary hover:text-white'
                      }`
                    }
                  >
                    <item.Icon size={18} strokeWidth={1.5} className="shrink-0" />
                    <span className="flex-1 text-[14px]">{item.label}</span>

                    {dynamicCount !== undefined && (
                      <span className="text-[11px] font-medium text-admin-text-secondary bg-admin-border px-2 py-0.5 rounded-full">
                        {dynamicCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* Profile Card / Footer */}
      <div className="mt-auto p-6">
        <div className="relative group bg-admin-surface-alt border border-admin-border/50 rounded-xl p-3 flex items-center gap-3 transition-all">
          <AvatarCircle size={9} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate text-white leading-tight">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-[11px] font-medium text-admin-active">
              {user.role === 'superadmin' ? 'Super Admin' : 'Admin'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md text-[#6A7181] hover:text-white transition-all"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-admin-bg text-admin-text-primary font-sans selection:bg-brand-cyan/30">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — always visible on lg+, drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-admin-border bg-admin-surface transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">

        {/* Mobile top bar */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-admin-border bg-admin-surface px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-admin-text-secondary hover:text-white hover:bg-white/10 transition-all"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <Logo variant="hori-tag" className="h-7" />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
