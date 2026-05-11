import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ShieldCheck, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import ChangeUserStatusModal from './ChangeUserStatusModal';
import DeleteUserModal from './DeleteUserModal';

interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isFoundingMember: boolean;
  status: 'active' | 'blocked';
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const roleBadge = (role: string) => {
  const cls =
    role === 'superadmin' ? 'bg-status-error/10 text-status-error' :
    role === 'admin' ? 'bg-brand-cyan/10 text-brand-cyan' :
    'bg-white/[0.06] text-white/50';
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{role}</span>;
};

const statusBadge = (status: 'active' | 'blocked') =>
  status === 'blocked'
    ? <span className="rounded-full bg-status-error/10 px-2.5 py-0.5 text-xs font-semibold text-status-error">Blocked</span>
    : <span className="rounded-full bg-status-success/10 px-2.5 py-0.5 text-xs font-semibold text-status-success">Active</span>;

function fullName(u: UserItem) {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || '(no name)';
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const limit = 25;

  const [statusTarget, setStatusTarget] = useState<UserItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((p: number, q: string) => {
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    if (q) params.set('search', q);
    api.get<{ users: UserItem[]; total: number; pages: number }>(`/superadmin/users?${params}`)
      .then(({ data }) => { setUsers(data.users); setTotal(data.total); setPages(data.pages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [limit]);

  // Initial load
  useEffect(() => { load(1, ''); }, [load]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      load(1, value);
    }, 300);
  }

  function goPage(p: number) {
    setPage(p);
    load(p, search);
  }

  // A user cannot be acted upon if they are a superadmin (covers self + other superadmins)
  function canAct(u: UserItem) {
    return u.role !== 'superadmin';
  }

  async function handleStatusConfirm(u: UserItem, newStatus: 'active' | 'blocked') {
    await api.patch(`/superadmin/users/${u.id}/status`, { status: newStatus });
    toast(`User ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully.`, 'success');
    setStatusTarget(null);
    load(page, search);
  }

  async function handleDeleteConfirm(u: UserItem) {
    await api.delete(`/superadmin/users/${u.id}`);
    toast('User deleted.', 'success');
    setDeleteTarget(null);
    load(page, search);
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display-l font-bold text-white tracking-tight">Users</h1>
          <p className="text-admin-text-secondary font-medium opacity-70 mt-1">{total.toLocaleString()} total users</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-brand-cyan focus:outline-none transition-colors sm:w-64"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-white/[0.06] bg-white/[0.02]">
              <tr>
                {['Name / Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-admin-text-secondary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-white">
                      {fullName(u)}
                      {u.isFoundingMember && <span className="ml-2 text-[10px] text-brand-orange font-bold">FOUNDING</span>}
                    </p>
                    <p className="text-xs text-admin-text-secondary mt-0.5">{u.email}</p>
                  </td>
                  <td className="px-5 py-3.5">{roleBadge(u.role)}</td>
                  <td className="px-5 py-3.5">{statusBadge(u.status)}</td>
                  <td className="px-5 py-3.5 text-xs text-admin-text-secondary">{formatDate(u.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    {canAct(u) ? (
                      <div className="flex items-center gap-3">
                        <button
                          title="View"
                          type="button"
                          onClick={() => navigate(`/admin/users/${u.id}`)}
                          className="text-admin-text-secondary hover:text-white transition-colors"
                        ><Eye size={15} /></button>
                        <button
                          title="Change Status"
                          type="button"
                          onClick={() => setStatusTarget(u)}
                          className="text-brand-cyan hover:opacity-70 transition-opacity"
                        ><ShieldCheck size={15} /></button>
                        <button
                          title="Delete"
                          type="button"
                          onClick={() => setDeleteTarget(u)}
                          className="text-red-500 hover:opacity-70 transition-opacity"
                        ><Trash2 size={15} /></button>
                      </div>
                    ) : (
                      <span className="text-xs text-white/20">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-admin-text-secondary opacity-60">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="flex sm:hidden flex-col gap-3">
        {users.length === 0 && (
          <p className="py-10 text-center text-admin-text-secondary opacity-60">No users found.</p>
        )}
        {users.map((u) => (
          <div key={u.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-3">
              <p className="font-semibold text-white text-sm">
                {fullName(u)}
                {u.isFoundingMember && <span className="ml-2 text-[10px] text-brand-orange font-bold">FOUNDING</span>}
              </p>
              <p className="text-xs text-admin-text-secondary mt-0.5">{u.email}</p>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {roleBadge(u.role)}
              {statusBadge(u.status)}
            </div>
            <p className="text-xs text-admin-text-secondary mb-3">Joined {formatDate(u.createdAt)}</p>
            {canAct(u) && (
              <div className="flex items-center gap-3 border-t border-white/[0.06] pt-3">
                <button
                  title="View"
                  type="button"
                  onClick={() => navigate(`/admin/users/${u.id}`)}
                  className="flex items-center gap-1.5 text-xs text-admin-text-secondary hover:text-white transition-colors"
                ><Eye size={13} /> View</button>
                <button
                  title="Change Status"
                  type="button"
                  onClick={() => setStatusTarget(u)}
                  className="flex items-center gap-1.5 text-xs text-brand-cyan hover:opacity-70 transition-opacity"
                ><ShieldCheck size={13} /> Change Status</button>
                <button
                  title="Delete"
                  type="button"
                  onClick={() => setDeleteTarget(u)}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:opacity-70 transition-opacity"
                ><Trash2 size={13} /> Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-admin-text-secondary opacity-70">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
              className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-1.5 text-white disabled:opacity-30 hover:bg-white/[0.08] transition-colors"
            >Previous</button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => goPage(page + 1)}
              className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-1.5 text-white disabled:opacity-30 hover:bg-white/[0.08] transition-colors"
            >Next</button>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {statusTarget && (
        <ChangeUserStatusModal
          userName={fullName(statusTarget)}
          userEmail={statusTarget.email}
          currentStatus={statusTarget.status}
          onConfirm={(newStatus) => handleStatusConfirm(statusTarget, newStatus)}
          onCancel={() => setStatusTarget(null)}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteUserModal
          userName={fullName(deleteTarget)}
          userEmail={deleteTarget.email}
          onConfirm={() => handleDeleteConfirm(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
