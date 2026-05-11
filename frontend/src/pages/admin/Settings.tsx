import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { getAvatarInitial } from '@/lib/avatarInitial';
import RichTextEditor from '@/components/ui/RichTextEditor';

// ── Shared field styles ───────────────────────────────────────────────────────
const INPUT =
  'w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan focus:outline-none transition-all';
const LABEL = 'block text-xs font-semibold uppercase tracking-wider text-admin-text-secondary mb-1.5';
const SECTION = 'rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8';

type LegalType = 'terms' | 'privacy' | 'cookies';
const LEGAL_TABS: { key: LegalType; label: string }[] = [
  { key: 'terms', label: 'Terms of Service' },
  { key: 'privacy', label: 'Privacy Policy' },
  { key: 'cookies', label: 'Cookie Policy' },
];

interface LegalDoc {
  content: string;
  updatedAt: string;
  updatedBy: { firstName: string; lastName?: string } | null;
}

// ── Password strength ─────────────────────────────────────────────────────────
function passwordStrength(pw: string): { label: string; color: string; pct: number } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: 'bg-status-error', pct: 25 };
  if (score === 2) return { label: 'Fair', color: 'bg-status-warning', pct: 50 };
  if (score === 3) return { label: 'Good', color: 'bg-brand-cyan', pct: 75 };
  return { label: 'Strong', color: 'bg-green-400', pct: 100 };
}

// ── Avatar section ────────────────────────────────────────────────────────────
function AvatarSection({
  avatarUrl,
  initials,
  onUploaded,
}: {
  avatarUrl: string | null | undefined;
  initials: string;
  onUploaded: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, or WebP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5 MB.');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await api.post<{ avatarUrl: string }>('/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(data.avatarUrl);
    } catch {
      setError('Upload failed. Please try again.');
      setPreview(avatarUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-orange overflow-hidden border-2 border-white/10">
          {preview
            ? <img src={preview} alt="" className="h-full w-full object-cover" />
            : <span className="text-2xl font-bold text-black">{initials}</span>
          }
        </div>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          <Camera size={15} />
          Change Avatar
        </button>
        <p className="text-xs text-admin-text-secondary">JPEG, PNG, WebP · max 5 MB</p>
        {error && <p className="text-xs text-status-error">{error}</p>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminSettings() {
  const { user, updateUser } = useAuthStore();
  const isSuperAdmin = user?.role === 'superadmin';

  const initials = user ? getAvatarInitial(user) : '?';

  // ── Profile section state
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState('');

  // ── Password section state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [currentPwError, setCurrentPwError] = useState('');

  // ── Legal section state
  const [activeTab, setActiveTab] = useState<LegalType>('terms');
  const [docs, setDocs] = useState<Partial<Record<LegalType, LegalDoc>>>({});
  const [dirtyDocs, setDirtyDocs] = useState<Partial<Record<LegalType, string>>>({});
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [docSuccess, setDocSuccess] = useState(false);
  const [docError, setDocError] = useState('');

  // Load legal doc when tab changes — superadmin only
  useEffect(() => {
    if (!isSuperAdmin) return;
    if (docs[activeTab] !== undefined) return;
    setLoadingDoc(true);
    api
      .get<LegalDoc & { type: string }>(`/admin/legal/${activeTab}`)
      .then(({ data }) => {
        setDocs((prev) => ({ ...prev, [activeTab]: data }));
      })
      .catch(() => {})
      .finally(() => setLoadingDoc(false));
  }, [activeTab]);

  function handleTabChange(tab: LegalType) {
    const isDirty = dirtyDocs[activeTab] !== undefined && dirtyDocs[activeTab] !== docs[activeTab]?.content;
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return;
      setDirtyDocs((prev) => { const n = { ...prev }; delete n[activeTab]; return n; });
    }
    setDocSuccess(false);
    setDocError('');
    setActiveTab(tab);
  }

  function handleEditorChange(html: string) {
    setDirtyDocs((prev) => ({ ...prev, [activeTab]: html }));
    setDocSuccess(false);
  }

  const currentDocContent = dirtyDocs[activeTab] ?? docs[activeTab]?.content ?? '';

  // ── Save profile name
  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) { setNameError('Name is required.'); return; }
    setNameLoading(true);
    setNameError('');
    setNameSuccess(false);
    try {
      await api.put('/me', { firstName: firstName.trim(), lastName: lastName.trim() });
      if (user) updateUser({ ...user, firstName: firstName.trim(), lastName: lastName.trim() });
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch {
      setNameError('Failed to save. Please try again.');
    } finally {
      setNameLoading(false);
    }
  }

  // ── Save password
  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setCurrentPwError('');
    setPwError('');
    setConfirmError('');
    setPwSuccess(false);

    if (newPw !== confirmPw) { setConfirmError('Passwords do not match.'); return; }
    if (newPw.length < 8) { setPwError('Must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(newPw)) { setPwError('Must contain at least one uppercase letter.'); return; }
    if (!/[0-9]/.test(newPw)) { setPwError('Must contain at least one number.'); return; }

    setPwLoading(true);
    try {
      await api.post('/me/password', { currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err: any) {
      const msg: string = err?.response?.data?.error ?? 'Failed to change password.';
      if (msg.toLowerCase().includes('current')) setCurrentPwError(msg);
      else setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  }

  // ── Save legal doc
  async function saveDoc() {
    setSavingDoc(true);
    setDocError('');
    setDocSuccess(false);
    try {
      const content = dirtyDocs[activeTab] ?? docs[activeTab]?.content ?? '';
      const { data } = await api.put<LegalDoc & { type: string }>(`/admin/legal/${activeTab}`, { content });
      setDocs((prev) => ({ ...prev, [activeTab]: data }));
      setDirtyDocs((prev) => { const n = { ...prev }; delete n[activeTab]; return n; });
      setDocSuccess(true);
      setTimeout(() => setDocSuccess(false), 3000);
    } catch {
      setDocError('Failed to save. Please try again.');
    } finally {
      setSavingDoc(false);
    }
  }

  const strength = newPw ? passwordStrength(newPw) : null;

  return (
    <div className="space-y-8 animate-fade-in-up max-w-3xl">
      {/* Page header */}
      <div>
        <h1 className="text-display-l font-bold text-white tracking-tight">Settings</h1>
        <p className="text-admin-text-secondary font-medium opacity-70 mt-1">
          {isSuperAdmin ? 'Profile, security, and platform policies.' : 'Profile and security settings.'}
        </p>
      </div>

      {/* ── Section 1: Profile ───────────────────────────────────────────────── */}
      <section className={SECTION}>
        <h2 className="text-lg font-bold text-white mb-6">Profile</h2>

        <AvatarSection
          avatarUrl={user?.avatarUrl}
          initials={initials}
          onUploaded={(url) => { if (user) updateUser({ ...user, avatarUrl: url }); }}
        />

        <form onSubmit={saveName} className="mt-8 space-y-5">
          <div>
            <label className={LABEL}>Name *</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className={INPUT}
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className={INPUT}
              />
            </div>
            {nameError && <p className="mt-1.5 text-xs text-status-error">{nameError}</p>}
          </div>

          <div>
            <label className={LABEL}>Email</label>
            <input
              type="text"
              value={user?.email ?? ''}
              readOnly
              className={`${INPUT} cursor-not-allowed opacity-50`}
            />
            <p className="mt-1 text-xs text-admin-text-secondary">Read-only — contact support to change your email.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={nameLoading}
              className="flex items-center gap-2 rounded-lg bg-brand-cyan px-5 py-2.5 text-sm font-bold text-black transition-all hover:opacity-90 disabled:opacity-50"
            >
              {nameLoading
                ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                : nameSuccess ? <Check size={14} /> : null
              }
              {nameSuccess ? 'Saved!' : 'Save Profile'}
            </button>
          </div>
        </form>
      </section>

      {/* ── Section 2: Change Password ───────────────────────────────────────── */}
      <section className={SECTION}>
        <h2 className="text-lg font-bold text-white mb-6">Change Password</h2>

        {pwSuccess && (
          <div className="mb-5 flex items-center gap-2 rounded-lg bg-green-400/10 border border-green-400/20 px-4 py-3 text-sm text-green-400">
            <Check size={14} /> Password updated successfully.
          </div>
        )}

        <form onSubmit={savePassword} className="space-y-5">
          <div>
            <label className={LABEL}>Current Password *</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={(e) => { setCurrentPw(e.target.value); setCurrentPwError(''); }}
                placeholder="••••••••"
                className={`${INPUT} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {currentPwError && <p className="mt-1.5 text-xs text-status-error">{currentPwError}</p>}
          </div>

          <div>
            <label className={LABEL}>New Password *</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => { setNewPw(e.target.value); setPwError(''); }}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                className={`${INPUT} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {strength && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${strength.pct}%` }} />
                </div>
                <span className={`text-xs font-medium ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
              </div>
            )}
            {pwError && <p className="mt-1.5 text-xs text-status-error">{pwError}</p>}
          </div>

          <div>
            <label className={LABEL}>Confirm New Password *</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPw}
                onChange={(e) => { setConfirmPw(e.target.value); setConfirmError(''); }}
                placeholder="••••••••"
                className={`${INPUT} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {confirmError && <p className="mt-1.5 text-xs text-status-error">{confirmError}</p>}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={pwLoading || !currentPw || !newPw || !confirmPw}
              className="flex items-center gap-2 rounded-lg bg-brand-cyan px-5 py-2.5 text-sm font-bold text-black transition-all hover:opacity-90 disabled:opacity-50"
            >
              {pwLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />}
              Update Password
            </button>
          </div>
        </form>
      </section>

      {/* ── Section 3: Legal Documents — superadmin only ────────────────────── */}
      {isSuperAdmin && <section className={SECTION}>
        <h2 className="text-lg font-bold text-white mb-1">Legal Documents</h2>
        <p className="text-sm text-admin-text-secondary mb-6">
          These documents are published publicly at <code className="text-brand-cyan">/legal/*</code>.
        </p>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-white/5 p-1 mb-6">
          {LEGAL_TABS.map(({ key, label }) => {
            const dirty = dirtyDocs[key] !== undefined && dirtyDocs[key] !== docs[key]?.content;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors relative ${
                  activeTab === key
                    ? 'bg-white/10 text-white'
                    : 'text-admin-text-secondary hover:text-white'
                }`}
              >
                {label}
                {dirty && (
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-brand-cyan" />
                )}
              </button>
            );
          })}
        </div>

        {/* Editor area */}
        {loadingDoc ? (
          <div className="space-y-3 rounded-xl border border-white/10 p-5">
            <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
          </div>
        ) : (
          <RichTextEditor
            key={activeTab}
            content={currentDocContent}
            onChange={handleEditorChange}
          />
        )}

        {/* Save row */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={saveDoc}
            disabled={savingDoc || loadingDoc}
            className="flex items-center gap-2 rounded-lg bg-brand-cyan px-5 py-2.5 text-sm font-bold text-black transition-all hover:opacity-90 disabled:opacity-50"
          >
            {savingDoc
              ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              : docSuccess ? <Check size={14} /> : null
            }
            {docSuccess ? 'Saved!' : 'Save Document'}
          </button>

          {docError && <p className="text-xs text-status-error">{docError}</p>}

          {docs[activeTab]?.updatedAt && (
            <p className="ml-auto text-xs text-admin-text-secondary">
              Last saved{' '}
              {new Date(docs[activeTab]!.updatedAt).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
              {docs[activeTab]?.updatedBy && (
                <> by {docs[activeTab]!.updatedBy!.firstName} {docs[activeTab]!.updatedBy!.lastName ?? ''}</>
              )}
            </p>
          )}
        </div>
      </section>}
    </div>
  );
}
