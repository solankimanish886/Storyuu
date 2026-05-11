import { useState, useRef, useEffect } from 'react';
import { ImageIcon, Check } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter, MODAL_LABEL_CLS, MODAL_CANCEL_CLS, MODAL_PRIMARY_CLS } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useEpisodeContentMetrics } from '@/hooks/useEpisodeContentMetrics';

// ---------------------------------------------------------------------------
// Constants & shared styles
// ---------------------------------------------------------------------------

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;   // 5 MB

const inputCls =
  'w-full rounded-xl border border-white/[0.05] bg-admin-bg px-4 h-12 text-sm text-white placeholder:text-white/20 transition-all focus:border-brand-cyan/50 focus:outline-none';

const labelCls = MODAL_LABEL_CLS;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type YesNo = 'yes' | 'no';

export interface FormState {
  title: string;
  body: string;
  disableVoting: YesNo;
  isLastEpisode: YesNo;
  voteQuestion: string;
  optionATitle: string;
  optionADesc: string;
  optionBTitle: string;
  optionBDesc: string;
  optionCTitle: string;
  optionCDesc: string;
  readingTimeMinutes: string;
  listeningTimeMinutes: string;
  status: string;
  coverImageDataUrl: string;
}

export interface FormErrors {
  title?: string;
  body?: string;
  voteQuestion?: string;
  optionATitle?: string;
  optionADesc?: string;
  optionBTitle?: string;
  optionBDesc?: string;
  optionCTitle?: string;
  optionCDesc?: string;
}

type TouchedFields = Partial<Record<keyof FormErrors, boolean>>;

const defaultForm: FormState = {
  title: '',
  body: '',
  disableVoting: 'no',
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
// Validation (exported separately for use by EditEpisodeModal)
// ---------------------------------------------------------------------------

export function validateAddEpisode(form: FormState): FormErrors {
  const errors: FormErrors = {};

  const title = form.title.trim();
  if (!title) {
    errors.title = 'Episode name is required.';
  } else if (title.length < 3) {
    errors.title = 'Name must be at least 3 characters.';
  } else if (title.length > 120) {
    errors.title = 'Name must be 120 characters or fewer.';
  }

  const plainText = form.body.replace(/<[^>]*>/g, '').trim();
  if (!plainText) {
    errors.body = 'Episode content is required.';
  } else if (plainText.length < 50) {
    errors.body = `Content must be at least 50 characters (currently ${plainText.length}).`;
  }

  if (form.disableVoting === 'no') {
    if (!form.voteQuestion.trim()) {
      errors.voteQuestion = 'A voting question is required when voting is enabled.';
    } else if (form.voteQuestion.length > 200) {
      errors.voteQuestion = 'Voting question must be 200 characters or fewer.';
    }

    const requiredMsg = 'This field is required when voting is enabled.';
    if (!form.optionATitle.trim()) errors.optionATitle = requiredMsg;
    if (!form.optionADesc.trim())  errors.optionADesc  = requiredMsg;
    if (!form.optionBTitle.trim()) errors.optionBTitle = requiredMsg;
    if (!form.optionBDesc.trim())  errors.optionBDesc  = requiredMsg;
    if (!form.optionCTitle.trim()) errors.optionCTitle = requiredMsg;
    if (!form.optionCDesc.trim())  errors.optionCDesc  = requiredMsg;
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isFormDirty(form: FormState): boolean {
  return (
    form.title !== '' ||
    form.body !== '' ||
    form.voteQuestion !== '' ||
    form.optionATitle !== '' ||
    form.optionADesc !== '' ||
    form.optionBTitle !== '' ||
    form.optionBDesc !== '' ||
    form.optionCTitle !== '' ||
    form.optionCDesc !== '' ||
    form.coverImageDataUrl !== ''
  );
}

// ---------------------------------------------------------------------------
// YesNoToggle sub-component
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
// FileDropZone sub-component
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
// OptionBlock sub-component
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
  const titleId = `ep-opt-${letter.toLowerCase()}-title`;
  const descId  = `ep-opt-${letter.toLowerCase()}-desc`;
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
// AddEpisodeModal
// ---------------------------------------------------------------------------

export interface AddEpisodeModalProps {
  seasonId: string;
  seasonNumber: number;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddEpisodeModal({
  seasonId,
  seasonNumber,
  onClose,
  onCreated,
}: AddEpisodeModalProps) {
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  const [saving, setSaving] = useState(false);

  const [coverDragging, setCoverDragging] = useState(false);
  const [coverError, setCoverError] = useState('');
  const [isReadingManuallyEdited, setIsReadingManuallyEdited] = useState(false);
  const [isListeningManuallyEdited, setIsListeningManuallyEdited] = useState(false);
  const [debouncedBody, setDebouncedBody] = useState('');

  const coverRef = useRef<HTMLInputElement>(null);

  // Debounce body for metric calculation
  useEffect(() => {
    const t = setTimeout(() => setDebouncedBody(form.body), 500);
    return () => clearTimeout(t);
  }, [form.body]);

  const metrics = useEpisodeContentMetrics(debouncedBody);

  // Auto-fill time fields when metrics change (unless manually overridden)
  useEffect(() => {
    setForm((f) => ({
      ...f,
      ...(!isReadingManuallyEdited && { readingTimeMinutes: metrics.readingTime > 0 ? String(metrics.readingTime) : '' }),
      ...(!isListeningManuallyEdited && { listeningTimeMinutes: metrics.listeningTime > 0 ? String(metrics.listeningTime) : '' }),
    }));
  }, [metrics, isReadingManuallyEdited, isListeningManuallyEdited]);

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
    if (isFormDirty(form) && !confirm('Discard unsaved changes?')) return;
    onClose();
  }

  async function handleSubmit() {
    // Mark all validatable fields as touched and run full validation
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
        readingTimeMinutes: Number(form.readingTimeMinutes) || 1,
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

      await api.post(`/admin/seasons/${seasonId}/episodes`, payload);

      toast('Episode created');
      onCreated();
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      if (status === 413) {
        toast('File too large — reduce the image size and retry.', 'error');
      } else if (status === 401 || status === 403) {
        toast('Session expired. Please log in again.', 'error');
      } else {
        toast('Failed to create episode. Please try again.', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  const votingOn = form.disableVoting === 'no';

  return (
    <Modal onClose={handleClose} labelId="add-ep-title" maxWidth="max-w-[600px]">

      <ModalHeader
        title="Add New Episode"
        subtitle={`Season ${seasonNumber}`}
        titleId="add-ep-title"
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

        {/* Voting toggle — positive framing */}
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

        {/* Reading Time / Listening Time — auto-calculated from content, manually overridable */}
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
              Adding…
            </span>
          ) : (
            'Add Episode'
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
}
