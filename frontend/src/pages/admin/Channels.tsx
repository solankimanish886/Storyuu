import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { AlertTriangle, Plus, Pencil, Trash2, X, Upload } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter, MODAL_INPUT_CLS, MODAL_CANCEL_CLS, MODAL_PRIMARY_CLS, MODAL_DESTRUCTIVE_CLS } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  isPublished: boolean;
  storyCount: number;
  sortOrder: number;
}

interface SaveData {
  name: string;
  description: string;
  imageFile: File | null;
  imageSrc: string; // current display URL; '' if cleared
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const inputCls = MODAL_INPUT_CLS;

// ---------------------------------------------------------------------------
// Channel Form Modal  (create + edit unified)
// ---------------------------------------------------------------------------

function ChannelFormModal({
  mode,
  channel,
  onSave,
  onCancel,
  saving,
  existingNames = [],
}: {
  mode: 'create' | 'edit';
  channel?: Channel;
  onSave: (data: SaveData) => void;
  onCancel: () => void;
  saving: boolean;
  existingNames?: string[];
}) {
  const isEdit = mode === 'edit';
  const initialName = channel?.name ?? '';
  const initialDesc = channel?.description ?? '';
  const initialImageUrl = channel?.coverImageUrl ?? '';

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDesc);
  const [imageSrc, setImageSrc] = useState(initialImageUrl);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  const titleId = isEdit ? 'edit-channel-title' : 'create-channel-title';

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const isDirty = isEdit
    ? name.trim() !== initialName.trim() ||
      description.trim() !== initialDesc.trim() ||
      imageSrc !== initialImageUrl
    : true;

  const isNameUnique = !existingNames
    .filter(n => n.toLowerCase() !== initialName.toLowerCase())
    .includes(name.trim().toLowerCase());

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be 5MB or less.');
      return;
    }
    setError(null);
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setImageFile(file);
    setImageSrc(url);
  }

  function clearImage() {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setImageFile(null);
    setImageSrc('');
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleSave() {
    setSubmitted(true);
    setError(null);

    if (!name.trim() || !description.trim() || !imageSrc) return;
    if (!isNameUnique) {
      setError('A channel with this name already exists.');
      return;
    }
    if (!isDirty) return;

    onSave({ name: name.trim(), description: description.trim(), imageFile, imageSrc });
  }

  return (
    <Modal onClose={onCancel} labelId={titleId} maxWidth="max-w-[480px]">
      <ModalHeader
        title={isEdit ? 'Edit Channel' : 'Create Channel'}
        subtitle={isEdit ? "Update this channel's identity and appearance." : 'Add a new genre-based collection to your library.'}
        titleId={titleId}
        onClose={onCancel}
      />

      <ModalBody>
        <div className="flex flex-col gap-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-[13px] font-medium text-red-400 border border-red-500/20">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <label
              htmlFor={`${mode}-channel-name`}
              className="text-[11px] font-bold uppercase tracking-wider text-white/40"
            >
              Channel Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              id={`${mode}-channel-name`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              placeholder="e.g. Mystery & Thriller"
              className={`${inputCls} ${submitted && (!name.trim() || !isNameUnique) ? 'border-red-500/50 focus:border-red-500' : ''}`}
            />
            {submitted && !name.trim() && (
              <p className="text-[12px] font-medium text-red-400">Channel name is required.</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label
              htmlFor={`${mode}-channel-desc`}
              className="text-[11px] font-bold uppercase tracking-wider text-white/40"
            >
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id={`${mode}-channel-desc`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of what this channel is about…"
              rows={3}
              className={`${inputCls} h-auto py-3 resize-none ${submitted && !description.trim() ? 'border-red-500/50 focus:border-red-500' : ''}`}
            />
            {submitted && !description.trim() && (
              <p className="text-[12px] font-medium text-red-400">Description is required.</p>
            )}
          </div>

          {/* Cover Image */}
          <div className="space-y-2 pb-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">
              Cover Image <span className="text-red-500">*</span>
            </p>

            {imageSrc ? (
              <div className="group relative h-48 w-full overflow-hidden rounded-[12px] border border-white/[0.08]">
                <img src={imageSrc} alt="Cover preview" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur-md transition-all hover:bg-red-500 hover:text-white"
                  aria-label="Remove cover image"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
                className={`flex h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed transition-all duration-200 ${
                  isDragging
                    ? 'border-brand-cyan bg-brand-cyan/10'
                    : submitted && !imageSrc
                      ? 'border-red-500/20 bg-red-500/5 hover:border-red-500/40'
                      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                  isDragging ? 'bg-brand-cyan text-black' : 'bg-white/[0.03] text-white/20'
                }`}>
                  <Upload size={24} />
                </div>
                <div className="text-center px-6">
                  <p className={`text-sm font-bold ${isDragging ? 'text-brand-cyan' : 'text-white'}`}>
                    Drag & drop or click to upload
                  </p>
                  <p className="mt-1.5 text-xs text-white/30">PNG, JPG, WebP — up to 5 MB</p>
                </div>
              </div>
            )}
            {submitted && !imageSrc && (
              <p className="text-xs font-medium text-red-400/80">Cover image is required.</p>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="hidden"
            />
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <button
          type="button"
          onClick={onCancel}
          className={MODAL_CANCEL_CLS}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || (!isDirty && isEdit)}
          className={MODAL_PRIMARY_CLS}
        >
          {saving ? (
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              <span>{isEdit ? 'Saving...' : 'Creating...'}</span>
            </div>
          ) : (
            isEdit ? 'Save Changes' : 'Create Channel'
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirmation Modal
// ---------------------------------------------------------------------------

function DeleteConfirmModal({
  channel,
  onConfirm,
  onCancel,
  deleting,
}: {
  channel: Channel;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <Modal onClose={onCancel} labelId="delete-modal-title" maxWidth="max-w-[420px]">
      <ModalHeader
        title="Delete Channel?"
        titleId="delete-modal-title"
        onClose={onCancel}
      />

      <ModalBody>
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-5 flex h-[56px] w-[56px] items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle size={28} className="text-red-500" strokeWidth={2} />
          </div>

          <p className="text-[14px] leading-relaxed text-white/50">
            You're about to delete <span className="font-bold text-white">{channel.name}</span>. This will hide all its stories from readers. This action can be reversed by a Super Admin within 30 days.
          </p>

          {channel.storyCount > 0 && (
            <div className="mt-5 w-full rounded-lg bg-red-500/10 p-4 text-left text-[13px] font-medium text-red-400 border border-red-500/20">
              <div className="flex gap-2">
                <span className="shrink-0 text-red-500">⚠️</span>
                <p>This channel contains <span className="font-bold text-white">{channel.storyCount} published stor{channel.storyCount === 1 ? 'y' : 'ies'}</span> with active subscribers.</p>
              </div>
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className={`${MODAL_CANCEL_CLS} disabled:opacity-50`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className={MODAL_DESTRUCTIVE_CLS}
        >
          {deleting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          ) : (
            <Trash2 size={18} />
          )}
          {deleting ? 'Deleting...' : 'Delete Channel'}
        </button>
      </ModalFooter>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | string>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Channel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  function load() {
    api
      .get<{ channels: Channel[] }>('/admin/channels')
      .then(({ data }) => setChannels(data.channels))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(data: SaveData) {
    if (!data.name) return;
    setSaving(true);
    try {
      let coverImageUrl: string | undefined;
      if (data.imageFile) {
        coverImageUrl = await fileToDataUrl(data.imageFile);
      }
      const slug = toSlug(data.name) || `channel-${Date.now()}`;
      const { data: res } = await api.post<{ channel: any }>('/admin/channels', {
        name: data.name,
        slug,
        description: data.description || undefined,
        coverImageUrl,
      });
      const created: Channel = {
        id: res.channel._id ?? res.channel.id,
        name: res.channel.name,
        slug: res.channel.slug,
        description: res.channel.description ?? null,
        coverImageUrl: res.channel.coverImageUrl ?? null,
        isPublished: res.channel.isPublished ?? false,
        storyCount: 0,
        sortOrder: res.channel.sortOrder ?? 0,
      };
      setChannels((prev) => [...prev, created]);
      setModal(null);
      toast('Channel created successfully!');
    } catch {
      toast('Failed to create channel', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id: string, data: SaveData) {
    setSaving(true);
    try {
      const original = channels.find((c) => c.id === id);
      const patch: Record<string, unknown> = {
        name: data.name,
        description: data.description || undefined,
      };

      if (data.imageFile) {
        patch.coverImageUrl = await fileToDataUrl(data.imageFile);
      } else if (data.imageSrc === '' && original?.coverImageUrl) {
        patch.coverImageUrl = null;
      }

      await api.patch(`/admin/channels/${id}`, patch);
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === id
            ? {
                ...ch,
                name: data.name,
                description: data.description || null,
                ...(patch.coverImageUrl !== undefined && {
                  coverImageUrl: patch.coverImageUrl as string | null,
                }),
              }
            : ch,
        ),
      );
      setModal(null);
      toast('Channel updated successfully!');
    } catch {
      toast('Failed to update channel', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/channels/${confirmDelete.id}`);
      setChannels((prev) => prev.filter((ch) => ch.id !== confirmDelete.id));
      setConfirmDelete(null);
      toast('Channel deleted successfully!');
    } catch {
      toast('Failed to delete channel', 'error');
    } finally {
      setDeleting(false);
    }
  }

  const editingChannel = modal && modal !== 'create' ? channels.find((c) => c.id === modal) : null;

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
      </div>
    );
  }

  return (
    <>
    <div className="animate-fade-in-up space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display-l font-bold tracking-tight text-white">Channels</h1>
          <p className="mt-1 font-medium text-admin-text-secondary opacity-70">
            {channels.length} channel{channels.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal('create')}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-cyan px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 sm:w-auto"
        >
          <Plus size={16} /> New Channel
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="border-b border-white/[0.06] bg-white/[0.02]">
            <tr>
              {['Name', 'Description', 'Stories', ''].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-admin-text-secondary"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {channels.map((ch) => (
              <tr key={ch.id} className="transition-colors hover:bg-white/[0.03]">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {ch.coverImageUrl ? (
                      <img
                        src={ch.coverImageUrl}
                        alt={ch.name}
                        className="h-8 w-8 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-bold text-white/30">
                        {ch.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="font-semibold text-white">{ch.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-[13px] text-admin-text-secondary">
                  <div className="max-w-[300px] truncate">
                    {ch.description || 'No description provided.'}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-admin-text-secondary">{ch.storyCount}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setModal(ch.id)}
                      className="text-admin-text-secondary transition-colors hover:text-white"
                      aria-label={`Edit ${ch.name}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(ch)}
                      className="text-status-error transition-opacity hover:opacity-70"
                      aria-label={`Delete ${ch.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {channels.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-10 text-center text-admin-text-secondary opacity-60"
                >
                  No channels yet. Create your first one!
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

    </div>

    {/* Modals moved outside the transformed container to fix fixed positioning */}
    {modal === 'create' && (
        <ChannelFormModal
          mode="create"
          existingNames={channels.map(c => c.name)}
          onSave={handleCreate}
          onCancel={() => setModal(null)}
          saving={saving}
        />
      )}
      {editingChannel && (
        <ChannelFormModal
          mode="edit"
          channel={editingChannel}
          existingNames={channels.map(c => c.name)}
          onSave={(data) => handleEdit(editingChannel.id, data)}
          onCancel={() => setModal(null)}
          saving={saving}
        />
      )}
      {confirmDelete && (
        <DeleteConfirmModal
          channel={confirmDelete}
          onConfirm={handleDelete}
          onCancel={() => !deleting && setConfirmDelete(null)}
          deleting={deleting}
        />
      )}
    </>
  );
}
