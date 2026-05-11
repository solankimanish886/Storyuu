import { useState, useRef, useEffect } from 'react';
import { ImageIcon, Check, AlertTriangle } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter, MODAL_LABEL_CLS, MODAL_CANCEL_CLS, MODAL_PRIMARY_CLS } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { validateAddEpisode } from './AddEpisodeModal';
import type { FormState, FormErrors } from './AddEpisodeModal';
import { useEpisodeContentMetrics } from '@/hooks/useEpisodeContentMetrics';

// ---------------------------------------------------------------------------
// Constants & shared styles
// ---------------------------------------------------------------------------

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const inputCls =
  'w-full rounded-xl border border-white/[0.05] bg-admin-bg px-4 h-12 text-sm text-white placeholder:text-white/20 transition-all focus:border-brand-cyan/50 focus:outline-none';

const labelCls = MODAL_LABEL_CLS;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type YesNo = 'yes' | 'no';

type TouchedFields = Partial<Record<keyof FormErrors, boolean>>;

interface EpisodeFull {
  title: string;
  body: string;
  coverImageUrl?: string;
  readTimeMinutes: number;
  audioDurationSeconds: number;
  status: string;
  voteQuestionId: null | {
    question: string;
    choices: { title: string; description: string }[];
  };
}

interface EpisodeGetResponse {
  episode: EpisodeFull;
  voteQuestionTotalVotes: number;
}

const defaultForm: FormState = {
  title: '',
  body: '',
  disableVoting: 'yes',
  isLastEpisode: 'no',
  voteQuestion: '',
  optionATitle: '',
  optionADesc: '',
  optionBTitle: '',
  optionBDesc: '',
  optionCTitle: '',
  optionCDesc: '',
  readingTimeMinutes: '',
  listeningTimeMinutes: '',
  status: 'draft',
  coverImageDataUrl: '',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isFormDirty(form: FormState, initial: FormState): boolean {
  return (
    form.title !== initial.title ||
    form.body !== initial.body ||
    form.voteQuestion !== initial.voteQuestion ||
    form.disableVoting !== initial.disableVoting ||
    form.optionATitle !== initial.optionATitle ||
    form.optionADesc !== initial.optionADesc ||
    form.optionBTitle !== initial.optionBTitle ||
    form.optionBDesc !== initial.optionBDesc ||
    form.optionCTitle !== initial.optionCTitle ||
    form.optionCDesc !== initial.optionCDesc ||
    form.coverImageDataUrl !== initial.coverImageDataUrl
  );
}

// ---------------------------------------------------------------------------
// YesNoToggle
// ---------------------------------------------------------------------------

function YesNoToggle({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: YesNo;
  onChange: (v: YesNo) => void;
}) {
  return (
    <div>
      <p id={`${id}-label`} className="mb-3 text-[11px] font-bold uppercase tracking-wider text-white/40">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex items-center gap-8">
        {(['yes', 'no'] as YesNo[]).map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-2.5 select-none">
            <input
              type="radio"
              name={id}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="sr-only"
            />
            <div
              aria-hidden="true"
              className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all duration-200 ${
                value === opt
                  ? 'border-brand-cyan bg-brand-cyan shadow-[0_0_8px_rgba(7,194,239,0.35)]'
                  : 'border-white/20 bg-white/[0.03]'
              }`}
            >
              {value === opt && <Check size={11} strokeWidth={3} className="text-black" />}
            </div>
            <span
              className={`text-sm font-medium transition-colors ${
                value === opt ? 'text-white' : 'text-white/40'
              }`}
            >
              {opt === 'yes' ? 'Yes' : 'No'}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FileDropZone
// ---------------------------------------------------------------------------

function FileDropZone({
  accept,
  onFile,
  dragging,
  onDragChange,
  children,
  inputRef,
}: {
  accept: string;
  onFile: (f: File) => void;
  dragging: boolean;
  onDragChange: (v: boolean) => void;
  children: React.ReactNode;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); onDragChange(true); }}
      onDragLeave={() => onDragChange(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDragChange(false);
        if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
      }}
      className={`relative flex h-36 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 ${
        dragging
          ? 'border-brand-cyan bg-brand-cyan/10'
          : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
      }`}
    >
      {children}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// OptionBlock
// ---------------------------------------------------------------------------

const OPTION_LETTERS = ['A', 'B', 'C'] as const;
type OptionLetter = typeof OPTION_LETTERS[number];
type OptionTitleKey = 'optionATitle' | 'optionBTitle' | 'optionCTitle';
type OptionDescKey  = 'optionADesc'  | 'optionBDesc'  | 'optionCDesc';

const OPTION_KEYS: Record<OptionLetter, { titleKey: OptionTitleKey; descKey: OptionDescKey }> = {
  A: { titleKey: 'optionATitle', descKey: 'optionADesc' },
  B: { titleKey: 'optionBTitle', descKey: 'optionBDesc' },
  C: { titleKey: 'optionCTitle', descKey: 'optionCDesc' },
};

function OptionBlock({
  letter,
  titleValue,
  descValue,
  titleError,
  descError,
  onTitleChange,
  onDescChange,
  onTitleBlur,
  onDescBlur,
}: {
  letter: OptionLetter;
  titleValue: string;
  descValue: string;
  titleError?: string;
  descError?: string;
  onTitleChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onTitleBlur: () => void;
  onDescBlur: () => void;
}) {
  const titleId = `edit-ep-opt-${letter.toLowerCase()}-title`;
  const descId  = `edit-ep-opt-${letter.toLowerCase()}-desc`;
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">
        Option {letter} <span className="text-red-500">*</span>
      </p>
      <div>
        <input
          id={titleId}
          type="text"
          value={titleValue}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          placeholder={letter === 'A' ? 'e.g., Chasing Shadows' : 'Option title'}
          aria-describedby={titleError ? `${titleId}-err` : undefined}
          className={`${inputCls} ${titleError ? 'border-rose-500/50' : ''}`}
        />
        {titleError && (
          <p id={`${titleId}-err`} role="alert" className="mt-1.5 text-xs text-rose-400">
            {titleError}
          </p>
        )}
      </div>
      <div>
        <textarea
          id={descId}
          value={descValue}
          onChange={(e) => onDescChange(e.target.value)}
          onBlur={onDescBlur}
          placeholder="Describe what happens if readers choose this option"
          rows={3}
          aria-describedby={descError ? `${descId}-err` : undefined}
          className={`${inputCls} h-auto py-3 leading-relaxed resize-none ${descError ? 'border-rose-500/50' : ''}`}
        />
        {descError && (
          <p id={`${descId}-err`} role="alert" className="mt-1.5 text-xs text-rose-400">
            {descError}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditEpisodeModal
// ---------------------------------------------------------------------------

export interface EditEpisodeModalProps {
  episodeId: string;
  seasonNumber: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditEpisodeModal({
  episodeId,
  seasonNumber,
  onClose,
  onSaved,
}: EditEpisodeModalProps) {
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(defaultForm);
  const [initialForm, setInitialForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [voteQuestionTotalVotes, setVoteQuestionTotalVotes] = useState(0);

  const [coverDragging, setCoverDragging] = useState(false);
  const [coverError, setCoverError] = useState('');
  const [isReadingManuallyEdited, setIsReadingManuallyEdited] = useState(false);
  const [isListeningManuallyEdited, setIsListeningManuallyEdited] = useState(false);
  const [debouncedBody, setDebouncedBody] = useState('');

  const coverRef = useRef<HTMLInputElement>(null);

  const metrics = useEpisodeContentMetrics(debouncedBody);

  // Debounce body for metric calculation
  useEffect(() => {
    const t = setTimeout(() => setDebouncedBody(form.body), 500);
    return () => clearTimeout(t);
  }, [form.body]);

  // Auto-fill time fields when metrics change (unless manually overridden)
  useEffect(() => {
    if (metrics.readingTime === 0 && metrics.listeningTime === 0) return;
    setForm((f) => ({
      ...f,
      ...(!isReadingManuallyEdited && { readingTimeMinutes: String(metrics.readingTime) }),
      ...(!isListeningManuallyEdited && { listeningTimeMinutes: String(metrics.listeningTime) }),
    }));
  }, [metrics, isReadingManuallyEdited, isListeningManuallyEdited]);

  useEffect(() => {
    api.get<EpisodeGetResponse>(`/admin/episodes/${episodeId}`)
      .then(({ data }) => {
        const ep = data.episode;
        const vq = ep.voteQuestionId;
        const choices = vq?.choices ?? [];
        setVoteQuestionTotalVotes(data.voteQuestionTotalVotes ?? 0);

        const savedListeningTime = ep.audioDurationSeconds > 0
          ? String(Math.max(1, Math.round(ep.audioDurationSeconds / 60)))
          : '';
        const loaded: FormState = {
          title: ep.title,
          body: ep.body,
          disableVoting: vq ? 'no' : 'yes',
          isLastEpisode: 'no',
          voteQuestion: vq?.question ?? '',
          optionATitle: choices[0]?.title ?? '',
          optionADesc: choices[0]?.description ?? '',
          optionBTitle: choices[1]?.title ?? '',
          optionBDesc: choices[1]?.description ?? '',
          optionCTitle: choices[2]?.title ?? '',
          optionCDesc: choices[2]?.description ?? '',
          readingTimeMinutes: String(ep.readTimeMinutes ?? 5),
          listeningTimeMinutes: savedListeningTime,
          status: ep.status ?? 'draft',
          coverImageDataUrl: ep.coverImageUrl ?? '',
        };
        setForm(loaded);
        setInitialForm(loaded);
        if (ep.readTimeMinutes) setIsReadingManuallyEdited(true);
        if (savedListeningTime) setIsListeningManuallyEdited(true);
      })
      .catch(() => toast('Failed to load episode data.', 'error'))
      .finally(() => setLoading(false));
  }, [episodeId]);

  // Live-validate only touched fields
  useEffect(() => {
    if (Object.keys(touched).length === 0) return;
    const all = validateAddEpisode(form);
    const next: FormErrors = {};
    (Object.keys(touched) as (keyof FormErrors)[]).forEach((k) => {
      if (touched[k]) next[k] = all[k];
    });
    setErrors(next);
  }, [form, touched]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function touch(key: keyof FormErrors) {
    setTouched((t) => ({ ...t, [key]: true }));
  }

  function handleReadingTimeChange(val: string) {
    patch('readingTimeMinutes', val);
    setIsReadingManuallyEdited(val !== '');
  }

  function handleListeningTimeChange(val: string) {
    patch('listeningTimeMinutes', val);
    setIsListeningManuallyEdited(val !== '');
  }

  async function handleCoverFile(file: File) {
    setCoverError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setCoverError('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setCoverError('Image must be 5 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => patch('coverImageDataUrl', e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleClose() {
    if (isFormDirty(form, initialForm) && !confirm('Discard unsaved changes?')) return;
    onClose();
  }

  async function handleSubmit() {
    setTouched({
      title: true, body: true, voteQuestion: true,
      optionATitle: true, optionADesc: true,
      optionBTitle: true, optionBDesc: true,
      optionCTitle: true, optionCDesc: true,
    });
    const allErrors = validateAddEpisode(form);
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        body: form.body,
        votingEnabled: form.disableVoting === 'no',
        isLastEpisodeOfSeason: form.isLastEpisode === 'yes',
        readingTimeMinutes: Number(form.readingTimeMinutes) || 5,
        listeningTimeMinutes: Number(form.listeningTimeMinutes) || 1,
        status: form.status,
      };

      if (form.disableVoting === 'no' && form.voteQuestion.trim()) {
        payload.voteQuestion = {
          question: form.voteQuestion.trim(),
          options: [
            { title: form.optionATitle.trim(), description: form.optionADesc.trim() },
            { title: form.optionBTitle.trim(), description: form.optionBDesc.trim() },
            { title: form.optionCTitle.trim(), description: form.optionCDesc.trim() },
          ],
        };
      }
      if (form.coverImageDataUrl) {
        payload.coverImageUrl = form.coverImageDataUrl;
      }

      await api.patch(`/admin/episodes/${episodeId}`, payload);
      toast('Episode saved');
      onSaved();
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      if (status === 413) {
        toast('File too large — reduce the image size and retry.', 'error');
      } else if (status === 401 || status === 403) {
        toast('Session expired. Please log in again.', 'error');
      } else {
        toast('Failed to save episode. Please try again.', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  const votingOn = form.disableVoting === 'no';

  if (loading) {
    return (
      <Modal onClose={onClose} labelId="edit-ep-title" maxWidth="max-w-[600px]">
        <ModalHeader
          title="Edit Episode"
          subtitle={`Season ${seasonNumber}`}
          titleId="edit-ep-title"
          onClose={onClose}
        />
        <ModalBody>
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
          </div>
        </ModalBody>
      </Modal>
    );
  }

  return (
    <Modal onClose={handleClose} labelId="edit-ep-title" maxWidth="max-w-[600px]">

      <ModalHeader
        title="Edit Episode"
        subtitle={`Season ${seasonNumber}`}
        titleId="edit-ep-title"
        onClose={handleClose}
      />

      <ModalBody>
        <div className="space-y-6 py-4">

        {/* Name */}
        <div>
          <label htmlFor="ep-title" className={labelCls}>Name <span className="text-red-500">*</span></label>
          <input
            id="ep-title"
            type="text"
            value={form.title}
            onChange={(e) => patch('title', e.target.value)}
            onBlur={() => touch('title')}
            placeholder="Episode Name"
            maxLength={120}
            aria-describedby={errors.title ? 'ep-title-err' : undefined}
            className={`${inputCls} ${errors.title ? 'border-rose-500/50' : ''}`}
          />
          {errors.title && (
            <p id="ep-title-err" role="alert" className="mt-1.5 text-xs text-rose-400">
              {errors.title}
            </p>
          )}
        </div>

        {/* Content */}
        <div>
          <label htmlFor="ep-body" className={labelCls}>Content <span className="text-red-500">*</span></label>
          <p className="mb-2 text-[11px] text-white/20">
            Write the episode body. Formatting options will be available soon.
          </p>
          <textarea
            id="ep-body"
            value={form.body}
            onChange={(e) => patch('body', e.target.value)}
            onBlur={() => touch('body')}
            placeholder="Write Episode Content"
            rows={8}
            aria-describedby={errors.body ? 'ep-body-err' : undefined}
            className={`${inputCls} h-auto py-3 leading-relaxed resize-none ${
              errors.body ? 'border-rose-500/50' : ''
            }`}
          />
          {errors.body && (
            <p id="ep-body-err" role="alert" className="mt-1.5 text-xs text-rose-400">
              {errors.body}
            </p>
          )}
        </div>

        {/* Voting toggle */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">
            Enable voting on this episode
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={votingOn}
            onClick={() => patch('disableVoting', votingOn ? 'yes' : 'no')}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              votingOn ? 'bg-brand-cyan' : 'bg-white/10 border border-white/10'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              votingOn ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Last episode toggle */}
        <YesNoToggle
          id="last-episode"
          label={`Is this the last episode of Season ${seasonNumber}?`}
          value={form.isLastEpisode}
          onChange={(v) => patch('isLastEpisode', v)}
        />

        {/* Voting fields — hidden when voting is off */}
        {votingOn && (
          <div className="space-y-4">

            {/* Warning banner when votes already cast */}
            {voteQuestionTotalVotes > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-yellow-400" />
                <p className="text-sm text-yellow-300">
                  This episode has {voteQuestionTotalVotes} vote{voteQuestionTotalVotes !== 1 ? 's' : ''} already
                  cast. Changing option text will not invalidate existing votes, but the new text will be shown
                  to all users going forward.
                </p>
              </div>
            )}

            {/* Voting Question */}
            <div>
              <label htmlFor="ep-vote-q" className={labelCls}>Voting Question <span className="text-red-500">*</span></label>
              <input
                id="ep-vote-q"
                type="text"
                value={form.voteQuestion}
                onChange={(e) => patch('voteQuestion', e.target.value)}
                onBlur={() => touch('voteQuestion')}
                placeholder="Voting Question"
                maxLength={200}
                aria-describedby={errors.voteQuestion ? 'ep-vote-q-err' : undefined}
                className={`${inputCls} ${errors.voteQuestion ? 'border-rose-500/50' : ''}`}
              />
              {errors.voteQuestion && (
                <p id="ep-vote-q-err" role="alert" className="mt-1.5 text-xs text-rose-400">
                  {errors.voteQuestion}
                </p>
              )}
            </div>

            {/* Option blocks A, B, C */}
            {OPTION_LETTERS.map((letter) => {
              const { titleKey, descKey } = OPTION_KEYS[letter];
              return (
                <OptionBlock
                  key={letter}
                  letter={letter}
                  titleValue={form[titleKey]}
                  descValue={form[descKey]}
                  titleError={errors[titleKey]}
                  descError={errors[descKey]}
                  onTitleChange={(v) => patch(titleKey, v)}
                  onDescChange={(v) => patch(descKey, v)}
                  onTitleBlur={() => touch(titleKey)}
                  onDescBlur={() => touch(descKey)}
                />
              );
            })}
          </div>
        )}

        {/* Reading Time / Listening Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ep-read-time" className={labelCls}>Reading Time</label>
            <input
              id="ep-read-time"
              type="text"
              value={form.readingTimeMinutes}
              onChange={(e) => handleReadingTimeChange(e.target.value)}
              placeholder="Auto-calculated"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="ep-listen-time" className={labelCls}>Listening Time</label>
            <input
              id="ep-listen-time"
              type="text"
              value={form.listeningTimeMinutes}
              onChange={(e) => handleListeningTimeChange(e.target.value)}
              placeholder="Auto-calculated"
              className={inputCls}
            />
          </div>
        </div>

        {/* Episode Status */}
        <div>
          <label htmlFor="ep-status" className={labelCls}>Episode Status</label>
          <select
            id="ep-status"
            value={form.status}
            onChange={(e) => patch('status', e.target.value)}
            className={`${inputCls} cursor-pointer appearance-none`}
          >
            {(['draft', 'published'] as const).map((s) => (
              <option key={s} value={s} className="bg-[#0b0e14] capitalize">{s}</option>
            ))}
          </select>
        </div>

        {/* Episode Cover Image */}
        <div>
          <label className={labelCls}>Episode Cover Image</label>
          <FileDropZone
            accept="image/jpeg,image/png,image/webp"
            onFile={handleCoverFile}
            dragging={coverDragging}
            onDragChange={setCoverDragging}
            inputRef={coverRef}
          >
            {form.coverImageDataUrl ? (
              <img
                src={form.coverImageDataUrl}
                className="h-full w-full object-cover"
                alt="Cover preview"
              />
            ) : (
              <>
                <ImageIcon size={22} className="text-white/20" />
                <p className="px-2 text-center text-[11px] font-medium text-white/30">
                  Click here to add image
                </p>
              </>
            )}
          </FileDropZone>
          {coverError && (
            <p role="alert" className="mt-1.5 text-xs text-rose-400">{coverError}</p>
          )}
        </div>

        </div>
      </ModalBody>

      <ModalFooter>
        <button
          type="button"
          onClick={handleClose}
          className={MODAL_CANCEL_CLS}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className={MODAL_PRIMARY_CLS}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              Saving…
            </span>
          ) : (
            'Save Changes'
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
}
