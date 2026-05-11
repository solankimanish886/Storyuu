import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Trash2, Copy, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import ChangeUserStatusModal from './ChangeUserStatusModal';
import DeleteUserModal from './DeleteUserModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: 'active' | 'blocked';
  isEmailVerified: boolean;
  isFoundingMember: boolean;
  suspendedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string | null;
  avatarUrl: string | null;
}

interface SubscriptionData {
  plan: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

interface VoteEntry {
  id: string;
  choiceIndex: number;
  choiceTitle: string;
  createdAt: string;
  question: { id: string; text: string } | null;
  episode: { id: string; title: string } | null;
  story: { id: string; title: string } | null;
}

interface ActivityEntry {
  id: string;
  mode: 'read' | 'listen';
  completedAt: string | null;
  updatedAt: string;
  episode: { id: string; title: string; number: number } | null;
  story: { id: string; title: string; coverImageUrl: string | null } | null;
  channel: { id: string; name: string } | null;
}

type Tab = 'profile' | 'subscription' | 'activity' | 'votes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!withTime) return date;
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}

function roleBadge(role: string) {
  const cls =
    role === 'superadmin' ? 'bg-status-error/10 text-status-error' :
    role === 'admin' ? 'bg-brand-cyan/10 text-brand-cyan' :
    'bg-white/[0.06] text-white/50';
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{role}</span>;
}

function statusBadge(status: 'active' | 'blocked') {
  return status === 'blocked'
    ? <span className="rounded-full bg-status-error/10 px-2.5 py-0.5 text-xs font-semibold text-status-error">Blocked</span>
    : <span className="rounded-full bg-status-success/10 px-2.5 py-0.5 text-xs font-semibold text-status-success">Active</span>;
}

function fullName(u: Pick<UserDetail, 'firstName' | 'lastName'>) {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || '(no name)';
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-white/30">{label}</span>
      <span className="text-sm text-white">{value ?? '—'}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="ml-1.5 inline-flex items-center text-white/30 hover:text-white transition-colors"
      title="Copy"
    >
      {copied ? <Check size={12} className="text-status-success" /> : <Copy size={12} />}
    </button>
  );
}

function Spinner() {
  return <div className="flex h-20 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" /></div>;
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-admin-text-secondary opacity-60">{message}</p>;
}

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm mt-4">
      <p className="text-admin-text-secondary opacity-70">Page {page} of {pages}</p>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}
          className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-white disabled:opacity-30 hover:bg-white/[0.08] transition-colors text-xs">
          Previous
        </button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}
          className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-white disabled:opacity-30 hover:bg-white/[0.08] transition-colors text-xs">
          Next
        </button>
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function ProfileTab({ user }: { user: UserDetail }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover shrink-0" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-orange">
              <span className="text-xl font-bold text-black">{user.firstName?.[0]?.toUpperCase() ?? '?'}</span>
            </div>
          )}
          <div>
            <p className="font-bold text-white text-base">{fullName(user)}</p>
            <p className="text-sm text-admin-text-secondary mt-0.5">{user.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              {roleBadge(user.role)}
              {statusBadge(user.status)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <KV label="Signup date" value={formatDate(user.createdAt, true)} />
        <KV label="Last active" value={user.lastActiveAt ? formatDate(user.lastActiveAt, true) : 'Not tracked'} />
        <KV label="Email verified" value={user.isEmailVerified ? 'Yes' : 'No'} />
        <KV label="Founding member" value={user.isFoundingMember ? 'Yes' : 'No'} />
      </div>
    </div>
  );
}

function SubscriptionTab({ userId }: { userId: string }) {
  const [sub, setSub] = useState<SubscriptionData | null | 'loading'>('loading');

  useEffect(() => {
    api.get<{ user: unknown; subscription: SubscriptionData | null }>(`/superadmin/users/${userId}`)
      .then(({ data }) => setSub(data.subscription))
      .catch(() => setSub(null));
  }, [userId]);

  if (sub === 'loading') return <Spinner />;
  if (!sub) return <EmptyState message="This user does not have a subscription." />;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <KV label="Plan" value={sub.plan} />
        <KV label="Subscription status" value={sub.status} />
        <KV label="Period start" value={formatDate(sub.currentPeriodStart)} />
        <KV label="Period end" value={formatDate(sub.currentPeriodEnd)} />
        {sub.cancelAtPeriodEnd && (
          <div className="rounded-lg bg-status-error/10 border border-status-error/20 px-3 py-2">
            <p className="text-xs text-status-error">Cancels at period end</p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/30">Stripe Customer ID</span>
          <span className="font-mono text-xs text-white/70 break-all">
            {sub.stripeCustomerId ?? '—'}
            {sub.stripeCustomerId && <CopyButton text={sub.stripeCustomerId} />}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/30">Stripe Subscription ID</span>
          <span className="font-mono text-xs text-white/70 break-all">
            {sub.stripeSubscriptionId ?? '—'}
            {sub.stripeSubscriptionId && <CopyButton text={sub.stripeSubscriptionId} />}
          </span>
        </div>
      </div>
      <div className="sm:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/30 mb-4">Payment History</h3>
        <EmptyState message="Payment history via Stripe is not yet integrated." />
      </div>
    </div>
  );
}

function ActivityTab({ userId }: { userId: string }) {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: number) => {
    setLoading(true);
    api.get<{ activity: ActivityEntry[]; total: number; pages: number }>(`/superadmin/users/${userId}/activity?page=${p}`)
      .then(({ data }) => { setActivity(data.activity); setTotal(data.total); setPages(data.pages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { load(1); }, [load]);

  if (loading) return <Spinner />;
  if (!activity.length) return <EmptyState message="No reading activity tracked yet." />;

  return (
    <div>
      <p className="text-xs text-admin-text-secondary opacity-60 mb-3">{total} episodes accessed</p>
      <div className="flex flex-col divide-y divide-white/[0.04] rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        {activity.map((a) => (
          <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
            {a.story?.coverImageUrl && (
              <img src={a.story.coverImageUrl} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {a.episode ? `Ep ${a.episode.number}: ${a.episode.title}` : 'Unknown episode'}
              </p>
              <p className="text-xs text-admin-text-secondary mt-0.5 truncate">
                {a.story?.title ?? 'Unknown story'}
                {a.channel && <span className="text-white/30"> · {a.channel.name}</span>}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-white/40 capitalize">{a.mode}</span>
              {a.completedAt && <p className="text-xs text-status-success mt-0.5">Completed</p>}
              <p className="text-xs text-white/30 mt-0.5">{formatDate(a.updatedAt)}</p>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} pages={pages} onPage={(p) => { setPage(p); load(p); }} />
    </div>
  );
}

function VotesTab({ userId }: { userId: string }) {
  const [votes, setVotes] = useState<VoteEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: number) => {
    setLoading(true);
    api.get<{ votes: VoteEntry[]; total: number; pages: number }>(`/superadmin/users/${userId}/votes?page=${p}`)
      .then(({ data }) => { setVotes(data.votes); setTotal(data.total); setPages(data.pages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { load(1); }, [load]);

  if (loading) return <Spinner />;
  if (!votes.length) return <EmptyState message="This user has not cast any votes yet." />;

  return (
    <div>
      <p className="text-xs text-admin-text-secondary opacity-60 mb-3">{total} votes cast</p>
      <div className="flex flex-col divide-y divide-white/[0.04] rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        {votes.map((v) => (
          <div key={v.id} className="px-5 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-admin-text-secondary truncate">
                  {v.story?.title ?? 'Unknown story'}
                  {v.episode && <span className="text-white/30"> · {v.episode.title}</span>}
                </p>
                <p className="text-sm text-white/70 mt-1 line-clamp-2">
                  {v.question?.text ?? 'Unknown question'}
                </p>
                <p className="mt-1 text-xs text-brand-cyan font-semibold">
                  Chose: &ldquo;{v.choiceTitle}&rdquo;
                </p>
              </div>
              <p className="text-xs text-white/30 shrink-0 mt-0.5">{formatDate(v.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} pages={pages} onPage={(p) => { setPage(p); load(p); }} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [statusModal, setStatusModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';
  // Action buttons are hidden for superadmin targets (covers self)
  const canAct = !isSuperAdmin;

  const loadUser = useCallback(() => {
    if (!id) return;
    api.get<{ user: UserDetail }>(`/superadmin/users/${id}`)
      .then(({ data }) => setUser(data.user))
      .catch(() => navigate('/admin/users'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => { loadUser(); }, [loadUser]);

  async function handleStatusConfirm(newStatus: 'active' | 'blocked') {
    if (!user) return;
    await api.patch(`/superadmin/users/${user.id}/status`, { status: newStatus });
    toast(`User ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully.`, 'success');
    setStatusModal(false);
    loadUser();
  }

  async function handleDeleteConfirm() {
    if (!user) return;
    await api.delete(`/superadmin/users/${user.id}`);
    toast('User deleted.', 'success');
    navigate('/admin/users');
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'subscription', label: 'Subscription' },
    { key: 'activity', label: 'Activity' },
    { key: 'votes', label: 'Votes' },
  ];

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
            title="Back to Users"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-start gap-3">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-orange">
                <span className="text-base font-bold text-black">{user.firstName?.[0]?.toUpperCase() ?? '?'}</span>
              </div>
            )}
            <div>
              <h1 className="text-display-s font-bold text-white tracking-tight leading-tight">{fullName(user)}</h1>
              <p className="text-sm text-admin-text-secondary mt-0.5">{user.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {roleBadge(user.role)}
                {statusBadge(user.status)}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons — hidden for superadmin targets */}
        {canAct && (
          <div className="flex items-center gap-2 sm:mt-1 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusModal(true)}
              className="flex items-center gap-2 rounded-xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-2 text-xs font-semibold text-brand-cyan hover:bg-brand-cyan/20 transition-colors"
            >
              <ShieldCheck size={14} /> Change Status
            </button>
            <button
              type="button"
              onClick={() => setDeleteModal(true)}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={14} /> Delete User
            </button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max gap-0 border-b border-white/[0.06]">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-5 py-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                activeTab === t.key
                  ? 'text-white'
                  : 'text-admin-text-secondary hover:text-white'
              }`}
            >
              {t.label}
              {activeTab === t.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-cyan" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'profile' && <ProfileTab user={user} />}
        {activeTab === 'subscription' && <SubscriptionTab userId={user.id} />}
        {activeTab === 'activity' && <ActivityTab userId={user.id} />}
        {activeTab === 'votes' && <VotesTab userId={user.id} />}
      </div>

      {/* Modals */}
      {statusModal && (
        <ChangeUserStatusModal
          userName={fullName(user)}
          userEmail={user.email}
          currentStatus={user.status}
          onConfirm={handleStatusConfirm}
          onCancel={() => setStatusModal(false)}
        />
      )}
      {deleteModal && (
        <DeleteUserModal
          userName={fullName(user)}
          userEmail={user.email}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModal(false)}
        />
      )}
    </div>
  );
}
