import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Headphones, Sun, Moon } from 'lucide-react';
import { api } from '@/lib/api';
import { useBreadcrumb } from '@/hooks/useBreadcrumb';

interface VoteStatusData {
  voteQuestion: { userChoiceIndex: number | null } | null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Episode {
  id: string;
  title: string;
  body: string;
  number?: number;
  voteQuestion?: { id: string; isOpen: boolean } | null;
}

interface ProgressPayload {
  progress: { position: number; mode: string; completedAt?: string } | null;
}

type Theme = 'dark' | 'light';
type FontSizeKey = 'xs' | 'sm' | 'base' | 'lg' | 'xl';
type Spacing = 'small' | 'medium' | 'large';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_THEME = 'storyuu.reader.theme';
const LS_FONT = 'storyuu.reader.fontSize';
const LS_LINE = 'storyuu.reader.lineSpacing';
const LS_LETTER = 'storyuu.reader.letterSpacing';

const FONT_KEYS: FontSizeKey[] = ['xs', 'sm', 'base', 'lg', 'xl'];
const SPACING_KEYS: Spacing[] = ['small', 'medium', 'large'];

const BODY_FONT: Record<FontSizeKey, string> = {
  xs: 'text-[13px]',
  sm: 'text-[15px]',
  base: 'text-[17px]',
  lg: 'text-[19px]',
  xl: 'text-[21px]',
};
const BTN_FONT: Record<FontSizeKey, string> = {
  xs: 'text-[10px]',
  sm: 'text-[12px]',
  base: 'text-[14px]',
  lg: 'text-[16px]',
  xl: 'text-[18px]',
};
const LINE_CLS: Record<Spacing, string> = {
  small: 'leading-[1.55]',
  medium: 'leading-[1.85]',
  large: 'leading-[2.2]',
};
const LETTER_CLS: Record<Spacing, string> = {
  small: 'tracking-[-0.01em]',
  medium: 'tracking-[0.02em]',
  large: 'tracking-[0.06em]',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLS<T extends string>(key: string, allowed: T[], fallback: T): T {
  const v = localStorage.getItem(key);
  return allowed.includes(v as T) ? (v as T) : fallback;
}

// ≡ Aa settings icon
function SettingsIcon() {
  return (
    <span className="flex flex-col items-start gap-[2.5px]">
      <span className="flex items-end gap-[1.5px] leading-none">
        <span className="font-black text-[8px] leading-none">A</span>
        <span className="font-black text-[12px] leading-none">a</span>
      </span>
      <span className="flex flex-col gap-[1.5px]">
        <span className="block h-[1.5px] w-[14px] rounded-full bg-current" />
        <span className="block h-[1.5px] w-[14px] rounded-full bg-current" />
        <span className="block h-[1.5px] w-[10px] rounded-full bg-current" />
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Reader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error402, setError402] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [voteChecking, setVoteChecking] = useState(false);

  useBreadcrumb(episode?.title);

  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => getLS(LS_THEME, ['dark', 'light'] as Theme[], 'dark'));
  const [fontSize, setFontSize] = useState<FontSizeKey>(() => getLS(LS_FONT, FONT_KEYS, 'base'));
  const [lineSpacing, setLineSpacing] = useState<Spacing>(() => getLS(LS_LINE, SPACING_KEYS, 'medium'));
  const [letterSpacing, setLetterSpacing] = useState<Spacing>(() => getLS(LS_LETTER, SPACING_KEYS, 'small'));

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<{ episode: Episode }>(`/episodes/${id}`)
      .then(async ({ data }) => {
        setEpisode(data.episode);
        // Record engagement on open — required for the implicit-follow model
        // (getImplicitFollowers queries ReadingProgress by storyId + updatedAt).
        // Scroll-based saves only fire after 2s of inactivity, so short episodes
        // or quick visits would never create a record without this initial ping.
        api.post(`/episodes/${id}/progress`, { position: 0, mode: 'read' }).catch(() => {});
        try {
          const { data: pd } = await api.get<ProgressPayload>(`/episodes/${id}/progress`);
          const prog = pd.progress;
          if (prog?.position && prog.position > 0) {
            requestAnimationFrame(() => window.scrollTo({ top: prog.position, behavior: 'auto' }));
          }
          if (prog?.completedAt) setCompleted(true);
        } catch {
          // no prior progress
        }
      })
      .catch((err) => {
        if (err?.response?.status === 402) setError402(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleScroll = useCallback(() => {
    if (!id) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      api.post(`/episodes/${id}/progress`, { position: Math.round(window.scrollY), mode: 'read' }).catch(() => {});
    }, 2000);
  }, [id]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [handleScroll]);

  function toggleTheme() {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem(LS_THEME, next);
      return next;
    });
  }

  function pickFont(k: FontSizeKey) {
    localStorage.setItem(LS_FONT, k);
    setFontSize(k);
  }
  function pickLine(k: Spacing) {
    localStorage.setItem(LS_LINE, k);
    setLineSpacing(k);
  }
  function pickLetter(k: Spacing) {
    localStorage.setItem(LS_LETTER, k);
    setLetterSpacing(k);
  }

  async function handleBack() {
    if (!completed && id) {
      try {
        await api.post(`/episodes/${id}/progress`, { position: 0, mode: 'read', completed: true });
      } catch {
        // silent
      }
    }
    navigate(-1);
  }

  async function handleVoteClick() {
    if (!id || voteChecking) return;
    setVoteChecking(true);
    try {
      const [{ data }] = await Promise.all([
        api.get<VoteStatusData>(`/episodes/${id}/vote`),
        new Promise((r) => setTimeout(r, 200)),
      ]);
      if (data.voteQuestion?.userChoiceIndex !== null && data.voteQuestion?.userChoiceIndex !== undefined) {
        navigate(`/episodes/${id}/vote-success`, { state: { votedSuccessfully: true } });
      } else {
        navigate(`/episodes/${id}/vote`);
      }
    } catch {
      navigate(`/episodes/${id}/vote`);
    } finally {
      setVoteChecking(false);
    }
  }

  const isDark = theme === 'dark';

  // Theme token map
  const T = {
    page: isDark ? 'bg-[#141416] text-white' : 'bg-white text-[#141416]',
    toolbar: isDark
      ? 'bg-[#141416]/95 border-white/[0.08]'
      : 'bg-white/95 border-black/[0.08]',
    settingsPanel: isDark
      ? 'bg-[#1C1C20] border-white/[0.08]'
      : 'bg-[#F5F5F7] border-black/[0.08]',
    backBtn: isDark
      ? 'border-white/[0.15] text-white/70 hover:bg-white/[0.08]'
      : 'border-black/[0.15] text-black/70 hover:bg-black/[0.08]',
    iconBtn: isDark
      ? 'text-white/55 hover:text-white hover:bg-white/[0.08]'
      : 'text-black/55 hover:text-black hover:bg-black/[0.08]',
    iconBtnActive: isDark
      ? 'bg-white/[0.12] text-white'
      : 'bg-black/[0.10] text-[#141416]',
    settingsLabel: isDark ? 'text-white/35' : 'text-black/35',
    pillActive: isDark
      ? 'bg-white/[0.12] text-white'
      : 'bg-black/[0.10] text-[#141416]',
    pillInactive: isDark
      ? 'text-white/35 hover:text-white/75 hover:bg-white/[0.06]'
      : 'text-black/35 hover:text-black/75 hover:bg-black/[0.06]',
    epLabel: isDark ? 'text-white/40' : 'text-black/40',
    title: isDark ? 'text-white' : 'text-[#141416]',
    body: isDark ? 'text-white/75' : 'text-[#383838]',
    divider: isDark ? 'border-white/[0.08]' : 'border-black/[0.08]',
  };

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${isDark ? 'bg-[#141416]' : 'bg-white'}`}>
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-brand-cyan" />
      </div>
    );
  }

  if (error402) {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center ${T.page}`}>
        <p className="text-lg font-bold">This episode requires a subscription.</p>
        <p className={`text-sm ${T.epLabel}`}>Unlock unlimited access to all episodes.</p>
        <Link
          to="/subscribe"
          className="mt-2 rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white hover:bg-brand-orange/90"
        >
          Subscribe to read this episode
        </Link>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${T.page}`}>
        <p className={T.epLabel}>Episode not found.</p>
      </div>
    );
  }

  const paragraphs = (episode.body ?? '').split('\n\n').filter(Boolean);
  const epLabel = episode.number != null ? `Episode ${episode.number}` : null;

  return (
    <div className={`min-h-screen ${T.page}`}>

      {/* ── Sticky toolbar ─────────────────────────────────────── */}
      <div className={`sticky top-0 z-20 flex items-center justify-between px-4 py-3.5 backdrop-blur-md border-b ${T.toolbar}`}>
        {/* Back – circular */}
        <button
          type="button"
          onClick={handleBack}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${T.backBtn}`}
          aria-label="Back to episodes"
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
        </button>

        {/* Right icon group */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSettings((s) => !s)}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              showSettings ? T.iconBtnActive : T.iconBtn
            }`}
            aria-label="Text settings"
          >
            <SettingsIcon />
          </button>

          <button
            type="button"
            onClick={() => navigate(`/episodes/${id}/listen`)}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${T.iconBtn}`}
            aria-label="Listen to this episode"
          >
            <Headphones size={17} />
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${T.iconBtn}`}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </div>

      {/* ── Settings panel ─────────────────────────────────────── */}
      <div
        className={`overflow-hidden border-b transition-all duration-300 ease-in-out ${T.settingsPanel} ${
          showSettings ? 'max-h-[240px]' : 'max-h-0 border-transparent'
        }`}
      >
        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Font Size */}
          <div>
            <p className={`mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] ${T.settingsLabel}`}>
              Font Size
            </p>
            <div className="flex gap-2">
              {FONT_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => pickFont(k)}
                  className={`flex h-9 w-10 items-center justify-center rounded-xl font-bold transition-colors ${BTN_FONT[k]} ${
                    fontSize === k ? T.pillActive : T.pillInactive
                  }`}
                >
                  Aa
                </button>
              ))}
            </div>
          </div>

          {/* Line Spacing */}
          <div>
            <p className={`mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] ${T.settingsLabel}`}>
              Line Spacing
            </p>
            <div className="flex gap-2">
              {SPACING_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => pickLine(k)}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-semibold capitalize transition-colors ${
                    lineSpacing === k ? T.pillActive : T.pillInactive
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* Letter Spacing */}
          <div>
            <p className={`mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] ${T.settingsLabel}`}>
              Letter Spacing
            </p>
            <div className="flex gap-2">
              {SPACING_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => pickLetter(k)}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-semibold capitalize transition-colors ${
                    letterSpacing === k ? T.pillActive : T.pillInactive
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Reading area ───────────────────────────────────────── */}
      <div className="mx-auto max-w-2xl px-5 pt-10 pb-20 md:px-10 md:pt-14 md:pb-24">

        {/* Episode label */}
        {epLabel && (
          <p className={`text-[11px] font-bold uppercase tracking-[0.1em] ${T.epLabel}`}>
            {epLabel} :
          </p>
        )}

        {/* Title */}
        <h1 className={`mt-2 text-[24px] font-bold leading-[1.25] md:text-[30px] ${T.title}`}>
          {episode.title}
        </h1>

        {/* Divider */}
        <div className={`mt-8 mb-8 h-px ${T.divider}`} />

        {/* Body */}
        <article
          className={`${BODY_FONT[fontSize]} ${LINE_CLS[lineSpacing]} ${LETTER_CLS[letterSpacing]} ${T.body}`}
        >
          {paragraphs.map((para, i) => (
            <p key={i} className="mb-5">
              {para}
            </p>
          ))}
        </article>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className={`mt-14 pt-8 border-t flex flex-col gap-4 ${T.divider}`}>
          {episode.voteQuestion && (
            <button
              type="button"
              onClick={handleVoteClick}
              disabled={voteChecking}
              className="w-full rounded-2xl bg-brand-orange py-4 text-[15px] font-bold text-white shadow-lg shadow-brand-orange/20 transition-all hover:bg-brand-orange/90 active:scale-[0.98] disabled:opacity-60"
            >
              {voteChecking ? 'Loading…' : 'Vote'}
            </button>
          )}
          <button
            type="button"
            onClick={handleBack}
            className="w-full rounded-2xl bg-brand-cyan py-4 text-[15px] font-bold text-black shadow-lg shadow-brand-cyan/20 transition-all hover:bg-brand-cyan/90 active:scale-[0.98]"
          >
            Back to Episodes
          </button>
        </div>
      </div>
    </div>
  );
}
