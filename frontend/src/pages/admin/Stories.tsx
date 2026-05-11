import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Plus, Pencil, Trash2, Eye, Upload, Image as ImageIcon, Search } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter, MODAL_CANCEL_CLS, MODAL_PRIMARY_CLS } from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import { useAdminCountsStore } from '@/store/adminCountsStore';

interface Story {
  id: string;
  title: string;
  slug: string;
  channelId: string;
  channelName: string;
  status: string;
  publishedAt: string | null;
  overview?: string;
  sortOrder?: number;
  coverImageUrl?: string;
}

interface Channel { id: string; name: string; }

interface FormState { 
  channelId: string; 
  title: string; 
  slug: string; 
  overview: string; 
  status: string; 
  coverImageUrl: string;
}

const emptyForm: FormState = { 
  channelId: '', 
  title: '', 
  slug: '', 
  overview: '', 
  status: 'draft', 
  coverImageUrl: '' 
};

const inputCls = 'w-full rounded-xl border border-white/[0.05] bg-admin-bg px-4 h-14 text-sm text-white placeholder:text-white/20 transition-all focus:border-brand-cyan/50 focus:bg-admin-bg/80 focus:outline-none';
const selectCls = `${inputCls} cursor-pointer appearance-none`;

function StoryFormModal({ 
  mode, 
  story, 
  channels, 
  onSave, 
  onCancel, 
  saving 
}: {
  mode: 'create' | 'edit';
  story?: Story;
  channels: Channel[];
  onSave: (data: FormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(story ? {
    channelId: story.channelId,
    title: story.title,
    slug: story.slug,
    overview: story.overview || '',
    status: story.status,
    coverImageUrl: story.coverImageUrl || ''
  } : emptyForm);

  const [isDragging, setIsDragging] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(story?.coverImageUrl || null);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = mode === 'edit';

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageSrc(result);
      setForm(prev => ({ ...prev, coverImageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleSave = () => {
    setSubmitted(true);
    if (!form.channelId || !form.title || !form.overview || !imageSrc) return;
    
    const finalSlug = form.slug || form.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
    onSave({ ...form, slug: finalSlug });
  };

  return (
    <Modal onClose={onCancel} labelId="story-modal-title" maxWidth="max-w-[560px]">
      <ModalHeader
        title={isEdit ? 'Edit Story' : 'New Story'}
        subtitle={isEdit ? 'Update your story details and settings.' : 'Create a new immersive story experience.'}
        titleId="story-modal-title"
        onClose={onCancel}
      />

      <ModalBody>
        <div className="space-y-6 py-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Channel */}
          <div className="col-span-2">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-white/40">Channel *</label>
            <div className="relative">
              <select
                value={form.channelId}
                onChange={(e) => setForm({ ...form, channelId: e.target.value })}
                className={selectCls}
              >
                <option value="" className="bg-[#0b0e14]">Select channel...</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0b0e14]">{c.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/20">
                <Plus size={16} className="rotate-45" />
              </div>
            </div>
            {submitted && !form.channelId && <p className="mt-1.5 text-xs font-medium text-red-400/80">Channel is required.</p>}
          </div>

          {/* Title */}
          <div className="col-span-2">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-white/40">Story Title *</label>
            <input
              type="text"
              placeholder="e.g. The Midnight Express"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputCls}
            />
            {submitted && !form.title && <p className="mt-1.5 text-xs font-medium text-red-400/80">Title is required.</p>}
          </div>

          {/* Description (Overview) */}
          <div className="col-span-2">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-white/40">Description *</label>
            <textarea
              placeholder="A short, compelling summary of the story..."
              value={form.overview}
              onChange={(e) => setForm({ ...form, overview: e.target.value })}
              className={`${inputCls} h-32 py-4 resize-none`}
            />
            {submitted && !form.overview && <p className="mt-1.5 text-xs font-medium text-red-400/80">Description is required.</p>}
          </div>

          {/* Status */}
          <div className="col-span-2">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-white/40">Status</label>
            <div className="relative">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={selectCls}
              >
                {['draft', 'published', 'archived'].map((s) => (
                  <option key={s} value={s} className="bg-[#0b0e14] capitalize">{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Cover Image Upload */}
        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-white/40">Cover Image *</label>
          <div className="relative">
            {imageSrc ? (
              <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-[20px] border border-white/10">
                <img src={imageSrc} alt="Preview" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => { setImageSrc(null); setForm(p => ({ ...p, coverImageUrl: '' })); }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-110"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed transition-all duration-200 ${
                  isDragging ? 'border-brand-cyan bg-brand-cyan/10' : submitted && !imageSrc ? 'border-red-500/20 bg-red-500/5 hover:border-red-500/40' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${isDragging ? 'bg-brand-cyan text-black' : 'bg-white/[0.03] text-white/20'}`}>
                  <Upload size={24} />
                </div>
                <div className="text-center px-6">
                  <p className={`text-sm font-bold ${isDragging ? 'text-brand-cyan' : 'text-white'}`}>Drag & drop or click to upload</p>
                  <p className="mt-1.5 text-xs text-white/30">PNG, JPG, WebP — up to 5 MB</p>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
          </div>
          {submitted && !imageSrc && <p className="mt-2 text-xs font-medium text-red-400/80">Cover image is required.</p>}
        </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <button type="button" onClick={onCancel} className={MODAL_CANCEL_CLS}>
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={MODAL_PRIMARY_CLS}
        >
          {saving ? (
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              <span>{isEdit ? 'Saving...' : 'Creating...'}</span>
            </div>
          ) : (
            isEdit ? 'Save Changes' : 'Create Story'
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
}

function StoryThumbnail({ url, title }: { url?: string; title: string }) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return (
      <img
        src={url}
        alt={title}
        className="h-12 w-20 rounded-lg object-cover border border-white/5 shadow-lg shadow-black/20"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="flex h-12 w-20 items-center justify-center rounded-lg bg-white/5 border border-white/5 text-white/20">
      <ImageIcon size={20} />
    </div>
  );
}

const statusBadge = (s: string) => {
  const cls = s === 'published' ? 'bg-emerald-500/10 text-emerald-400' :
    s === 'archived' ? 'bg-white/5 text-white/30' : 'bg-amber-500/10 text-amber-400';
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${cls}`}>{s}</span>;
};

export default function AdminStories() {
  const [searchParams] = useSearchParams();
  const [stories, setStories] = useState<Story[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | string>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Story | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState(searchParams.get('channelId') ?? '');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  const { counts, fetchCounts } = useAdminCountsStore();

  const load = () => {
    const params = new URLSearchParams();
    if (channelFilter) params.set('channelId', channelFilter);
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const q = params.toString() ? `?${params.toString()}` : '';

    if (!initializedRef.current) setLoading(true);

    Promise.all([
      api.get<{ stories: Story[] }>(`/admin/stories${q}`),
      api.get<{ channels: Channel[] }>('/admin/channels'),
    ])
      .then(([sr, cr]) => { setStories(sr.data.stories); setChannels(cr.data.channels); })
      .catch(() => toast('Failed to load stories', 'error'))
      .finally(() => {
        setLoading(false);
        initializedRef.current = true;
      });
  };

  useEffect(() => { fetchCounts(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [channelFilter, search, statusFilter]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setSearch(value), 300);
  };

  const triggerSidebarRefresh = () => window.dispatchEvent(new Event('refresh-stats'));

  const handleSave = async (data: FormState) => {
    setSaving(true);
    try {
      if (modal === 'create') {
        await api.post('/admin/stories', data);
        toast('Story created successfully!');
      } else {
        await api.patch(`/admin/stories/${modal}`, data);
        toast('Story updated successfully!');
      }
      setModal(null);
      load();
      fetchCounts();
      triggerSidebarRefresh();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to save story', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/stories/${deleteTarget.id}`);
      toast('Story deleted successfully!');
      setDeleteTarget(null);
      load();
      fetchCounts();
      triggerSidebarRefresh();
    } catch {
      toast('Failed to delete story', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="flex h-40 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
    </div>
  );

  const editingStory = modal && modal !== 'create' ? stories.find((s) => s.id === modal) : null;
  const total = counts?.total ?? 0;

  return (
    <>
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display-l font-bold text-white tracking-tight">Stories</h1>
          <p className="text-admin-text-secondary font-medium opacity-70 mt-1">{total} stor{total !== 1 ? 'ies' : 'y'}</p>
        </div>
        <button type="button" onClick={() => setModal('create')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-cyan px-4 py-2.5 text-sm font-bold text-black hover:opacity-90 transition-opacity sm:w-auto">
          <Plus size={16} /> New Story
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search stories..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-9 pr-4 text-sm text-white placeholder:text-white/30 transition-all focus:border-brand-cyan/50 focus:bg-white/[0.05] focus:outline-none"
          />
        </div>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="h-10 min-w-[140px] cursor-pointer appearance-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-white/70 transition-all focus:border-brand-cyan/50 focus:outline-none"
        >
          <option value="" className="bg-[#0b0e14]">All Channels</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id} className="bg-[#0b0e14]">{c.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 min-w-[120px] cursor-pointer appearance-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-white/70 transition-all focus:border-brand-cyan/50 focus:outline-none"
        >
          <option value="" className="bg-[#0b0e14]">All Statuses</option>
          {['draft', 'published', 'archived'].map((s) => (
            <option key={s} value={s} className="bg-[#0b0e14]">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead className="border-b border-white/[0.06] bg-white/[0.02]">
            <tr>
              {['Title', 'Channel', 'Status', ''].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-admin-text-secondary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {stories.map((s) => (
              <tr key={s.id} className="group hover:bg-white/[0.03] transition-colors">
                <td className="px-5 py-5">
                  <div className="flex items-center gap-4">
                    <StoryThumbnail url={s.coverImageUrl} title={s.title} />
                    <span className="font-bold text-[15px] text-white tracking-tight">{s.title}</span>
                  </div>
                </td>
                <td className="px-5 py-5 text-[13px] font-medium text-admin-text-secondary opacity-80">{s.channelName}</td>
                <td className="px-5 py-5">{statusBadge(s.status)}</td>
                <td className="px-5 py-5">
                  <div className="flex items-center gap-2 justify-end">
                    <Link to={`/admin/stories/${s.id}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-admin-text-secondary hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all border border-transparent hover:border-brand-cyan/20"><Eye size={18} /></Link>
                    <button onClick={() => setModal(s.id)} className="flex h-9 w-9 items-center justify-center rounded-xl text-admin-text-secondary hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/20"><Pencil size={18} /></button>
                    <button onClick={() => setDeleteTarget(s)} className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {stories.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-16 text-center text-admin-text-secondary opacity-40 font-medium tracking-wide italic">
                {search || statusFilter || channelFilter ? 'No stories match your filters.' : 'No stories found. Create your first one to get started.'}
              </td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

    </div>

    {modal && (
      <StoryFormModal
        mode={modal === 'create' ? 'create' : 'edit'}
        story={editingStory || undefined}
        channels={channels}
        onSave={handleSave}
        onCancel={() => setModal(null)}
        saving={saving}
      />
    )}

    {deleteTarget && (
      <ConfirmModal
        title="Delete Story?"
        message={<>Delete <strong className="text-white">{deleteTarget.title}</strong>? This action cannot be undone.</>}
        confirmLabel="Delete Story"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
        loading={deleting}
      />
    )}
    </>
  );
}
