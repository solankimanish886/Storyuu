import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Sun,
  Moon,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Music,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useBreadcrumb } from '@/hooks/useBreadcrumb';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Episode {
  id: string;
  title: string;
  audioUrl?: string | null;
  coverImageUrl?: string | null;
  body?: string;
  number?: number;
  voteQuestion?: {
    id: string;
    question: string;
    choices: { title: string; description?: string | null }[];
    isOpen: boolean;
  } | null;
}

interface VoteStatusData {
  voteQuestion: { userChoiceIndex: number | null } | null;
}

type Theme = 'dark' | 'light';
type PlaybackSpeed = 1.0 | 1.2 | 1.5 | 2.0;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPEEDS: PlaybackSpeed[] = [1.0, 1.2, 1.5, 2.0];
const LS_THEME = 'storyuu.reader.theme';
const LS_VOICE = 'storyuu.player.voiceURI';
const WAVEFORM_COUNT = 60;
const CHARS_PER_SEC = 15;
const TTS_AVAILABLE = typeof window !== 'undefined' && 'speechSynthesis' in window;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const s = Math.floor(secs);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function generateWaveform(seed: string, count: number): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(hash ^ seed.charCodeAt(i), 2654435761)) | 0;
    hash ^= hash >>> 16;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    hash = (Math.imul(hash ^ (hash >>> 16), 0x45d9f3b)) | 0;
    hash ^= hash >>> 16;
    bars.push(20 + (Math.abs(hash) % 80));
  }
  return bars;
}

function sortVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => {
    const aEn = a.lang.startsWith('en') ? 0 : 1;
    const bEn = b.lang.startsWith('en') ? 0 : 1;
    if (aEn !== bEn) return aEn - bEn;
    return a.name.localeCompare(b.name);
  });
}

// ---------------------------------------------------------------------------
// AudioPlayer
// ---------------------------------------------------------------------------

export default function AudioPlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error402, setError402] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [ttsError, setTtsError] = useState(false);
  const [voteChecking, setVoteChecking] = useState(false);

  useBreadcrumb(episode?.title);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1.0);
  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem(LS_THEME) === 'light' ? 'light' : 'dark'
  );

  // Voice selection
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(
    () => localStorage.getItem(LS_VOICE) ?? ''
  );
  const [voiceOpen, setVoiceOpen] = useState(false);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // HTML5 audio refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveformBars = useRef<number[]>([]);
  const currentTimeRef = useRef(0);

  // TTS refs
  const paraTexts = useRef<string[]>([]);
  const paraOffsets = useRef<number[]>([]);
  const totalCharsRef = useRef(0);
  const currentParaIdx = useRef(0);
  const charPositionRef = useRef(0);
  const durationRef = useRef(0);
  const speedRef = useRef<PlaybackSpeed>(1.0);
  const chromeBugTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  // Fires a single activity record the first time the user starts playing.
  // The 10-second interval save is for position tracking; this one-shot ping is
  // what creates the ReadingProgress row that getImplicitFollowers depends on.
  const activityFiredRef = useRef(false);

  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  useEffect(() => {
    if (playing && !activityFiredRef.current && id) {
      activityFiredRef.current = true;
      api.post(`/episodes/${id}/progress`, { position: 0, mode: 'listen' }).catch(() => {});
    }
  }, [playing, id]);

  // Load TTS voices
  useEffect(() => {
    if (!TTS_AVAILABLE) return;
    const load = () => {
      let all = sortVoices(window.speechSynthesis.getVoices());
      const microsoftVoices = all.filter((v) => v.name.includes('Microsoft'));
      if (microsoftVoices.length > 0) all = microsoftVoices;
      if (all.length === 0) return;
      setVoices(all);
      const savedURI = localStorage.getItem(LS_VOICE) ?? '';
      const saved = all.find((v) => v.voiceURI === savedURI);
      const firstEn = all.find((v) => v.lang.startsWith('en'));
      const resolved = saved ?? firstEn ?? all[0];
      setSelectedVoiceURI(resolved.voiceURI);
      selectedVoiceRef.current = resolved;
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  useEffect(() => {
    if (!selectedVoiceURI) return;
    const match = voices.find((v) => v.voiceURI === selectedVoiceURI) ?? null;
    selectedVoiceRef.current = match;
    localStorage.setItem(LS_VOICE, selectedVoiceURI);
  }, [selectedVoiceURI, voices]);

  // Fetch episode
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setAudioError(false);
    setTtsError(false);
    setPlaying(false);
    setCurrentTime(0);
    charPositionRef.current = 0;
    currentParaIdx.current = 0;
    if (TTS_AVAILABLE) window.speechSynthesis.cancel();

    api.get<{ episode: Episode }>(`/episodes/${id}`)
      .then(({ data }) => {
        setEpisode(data.episode);
        waveformBars.current = generateWaveform(data.episode.id, WAVEFORM_COUNT);
      })
      .catch((err) => {
        if (err?.response?.status === 402) setError402(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // TTS setup
  useEffect(() => {
    if (!episode) return;
    const paras = (episode.body ?? '').split('\n\n').filter(Boolean);
    paraTexts.current = paras;
    const offsets: number[] = [];
    let offset = 0;
    for (const para of paras) {
      offsets.push(offset);
      offset += para.length + 1;
    }
    paraOffsets.current = offsets;
    totalCharsRef.current = offset;
    if (!episode.audioUrl && TTS_AVAILABLE) {
      const dur = offset / (CHARS_PER_SEC * speedRef.current);
      durationRef.current = dur;
      setDuration(dur);
      setCurrentTime(0);
    }
  }, [episode]);

  useEffect(() => {
    return () => {
      if (TTS_AVAILABLE) window.speechSynthesis.cancel();
      if (chromeBugTimer.current) clearInterval(chromeBugTimer.current);
    };
  }, []);

  // Auto-save progress
  const saveProgress = useCallback(() => {
    if (!id) return;
    api.post(`/episodes/${id}/progress`, {
      position: Math.round(currentTimeRef.current),
      mode: 'listen',
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!episode) return;
    autoSaveRef.current = setInterval(saveProgress, 10000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [episode, saveProgress]);

  // TTS engine
  const speakFrom = useCallback((paraIdx: number, rate: PlaybackSpeed) => {
    if (!TTS_AVAILABLE) return;
    const synth = window.speechSynthesis;
    if (chromeBugTimer.current) { clearInterval(chromeBugTimer.current); chromeBugTimer.current = null; }
    synth.cancel();
    const resolvedIdx = Math.max(0, Math.min(paraIdx, paraTexts.current.length - 1));
    currentParaIdx.current = resolvedIdx;

    function speakNext(idx: number) {
      if (idx >= paraTexts.current.length) {
        setPlaying(false);
        setCurrentTime(durationRef.current);
        charPositionRef.current = totalCharsRef.current;
        if (chromeBugTimer.current) { clearInterval(chromeBugTimer.current); chromeBugTimer.current = null; }
        return;
      }
      currentParaIdx.current = idx;
      const utter = new SpeechSynthesisUtterance(paraTexts.current[idx]);
      utter.rate = rate;
      if (selectedVoiceRef.current) utter.voice = selectedVoiceRef.current;
      utter.onboundary = (e: SpeechSynthesisEvent) => {
        if (e.name !== 'word') return;
        const charPos = paraOffsets.current[idx] + e.charIndex;
        charPositionRef.current = charPos;
        const t = charPos / (CHARS_PER_SEC * speedRef.current);
        setCurrentTime(Math.min(t, durationRef.current));
      };
      utter.onend = () => speakNext(idx + 1);
      utter.onerror = (e: SpeechSynthesisErrorEvent) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        setTtsError(true);
        setPlaying(false);
        if (chromeBugTimer.current) { clearInterval(chromeBugTimer.current); chromeBugTimer.current = null; }
      };
      synth.speak(utter);
    }

    setTimeout(() => speakNext(resolvedIdx), 50);
    setPlaying(true);
    chromeBugTimer.current = setInterval(() => {
      const s = window.speechSynthesis;
      if (s.speaking && !s.paused) { s.pause(); s.resume(); }
    }, 10000);
  }, []);

  // HTML5 audio handlers
  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
    audio.playbackRate = speedRef.current;
  };
  const handleTimeUpdate = () => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); };
  const handlePlay = () => setPlaying(true);
  const handlePause = () => setPlaying(false);
  const handleEnded = () => {
    setPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };
  const handleError = () => { setAudioError(true); setPlaying(false); };

  // Controls
  const useTTS = episode != null && !episode.audioUrl;

  const togglePlay = () => {
    if (!useTTS) {
      const audio = audioRef.current;
      if (audio) { if (playing) audio.pause(); else audio.play().catch(() => setPlaying(false)); }
      return;
    }
    if (!TTS_AVAILABLE) return;
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      if (synth.paused) {
        synth.resume();
        setPlaying(true);
        if (!chromeBugTimer.current) {
          chromeBugTimer.current = setInterval(() => {
            const s = window.speechSynthesis;
            if (s.speaking && !s.paused) { s.pause(); s.resume(); }
          }, 10000);
        }
      } else {
        synth.pause();
        setPlaying(false);
        if (chromeBugTimer.current) { clearInterval(chromeBugTimer.current); chromeBugTimer.current = null; }
      }
    } else {
      speakFrom(currentParaIdx.current, speedRef.current);
    }
  };

  const seekToRatio = (ratio: number) => {
    const r = Math.max(0, Math.min(1, ratio));
    if (!useTTS) {
      if (duration <= 0) return;
      const time = r * duration;
      setCurrentTime(time);
      if (audioRef.current) audioRef.current.currentTime = time;
      return;
    }
    if (totalCharsRef.current === 0) return;
    const targetChar = Math.round(r * totalCharsRef.current);
    const newTime = r * durationRef.current;
    let paraIdx = 0;
    for (let i = paraOffsets.current.length - 1; i >= 0; i--) {
      if (paraOffsets.current[i] <= targetChar) { paraIdx = i; break; }
    }
    charPositionRef.current = targetChar;
    currentParaIdx.current = paraIdx;
    setCurrentTime(newTime);
    if (window.speechSynthesis.speaking) speakFrom(paraIdx, speedRef.current);
  };

  const skip = (delta: number) => {
    const dur = useTTS ? durationRef.current : duration;
    const current = useTTS
      ? (charPositionRef.current / (CHARS_PER_SEC * speedRef.current))
      : (audioRef.current?.currentTime ?? currentTime);
    const newTime = Math.max(0, Math.min(dur, current + delta));
    if (!useTTS) {
      setCurrentTime(newTime);
      if (audioRef.current) audioRef.current.currentTime = newTime;
      return;
    }
    seekToRatio(newTime / (dur || 1));
  };

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    const newSpeed = SPEEDS[(idx + 1) % SPEEDS.length];
    if (!useTTS) {
      if (audioRef.current) audioRef.current.playbackRate = newSpeed;
      setSpeed(newSpeed);
      return;
    }
    const newDuration = totalCharsRef.current / (CHARS_PER_SEC * newSpeed);
    const newCurrentTime = charPositionRef.current / (CHARS_PER_SEC * newSpeed);
    speedRef.current = newSpeed;
    durationRef.current = newDuration;
    setSpeed(newSpeed);
    setDuration(newDuration);
    setCurrentTime(newCurrentTime);
    if (window.speechSynthesis.speaking) speakFrom(currentParaIdx.current, newSpeed);
  };

  const handleVoiceChange = (uri: string) => {
    const voice = voices.find((v) => v.voiceURI === uri) ?? null;
    setSelectedVoiceURI(uri);
    selectedVoiceRef.current = voice;
    setVoiceOpen(false);
    if (useTTS && window.speechSynthesis.speaking) speakFrom(currentParaIdx.current, speedRef.current);
  };

  function toggleTheme() {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem(LS_THEME, next);
      return next;
    });
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

  const progress = duration > 0 ? currentTime / duration : 0;
  const isDark = theme === 'dark';
  const playDisabled = audioError || ttsError || (useTTS && !TTS_AVAILABLE);
  const selectedVoice = voices.find((v) => v.voiceURI === selectedVoiceURI);
  const showVoiceSelector = useTTS && TTS_AVAILABLE && voices.length > 0;
  const hasVoteQuestion = Boolean(episode?.voteQuestion);

  // Active transcript paragraph
  let activeIdx = 0;
  if (totalCharsRef.current > 0 && duration > 0) {
    const r = Math.max(0, Math.min(1, currentTime / duration));
    const targetChar = r * totalCharsRef.current;
    for (let i = paraOffsets.current.length - 1; i >= 0; i--) {
      if (paraOffsets.current[i] <= targetChar) { activeIdx = i; break; }
    }
  }

  const prevActiveIdxRef = useRef(-1);
  useEffect(() => {
    if (!playing || !transcriptRef.current) return;
    if (activeIdx !== prevActiveIdxRef.current) {
      const activeEl = transcriptRef.current.querySelector('[data-active="true"]');
      if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      prevActiveIdxRef.current = activeIdx;
    }
  });

  // ---------------------------------------------------------------------------
  // Theme tokens
  // ---------------------------------------------------------------------------

  const T = {
    page: isDark ? 'bg-[#141416] text-white' : 'bg-[#F5F5F7] text-[#141416]',
    playerBg: isDark ? 'bg-[#141416]' : 'bg-[#F5F5F7]',
    card: isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white border-black/[0.08]',
    cardInner: isDark ? 'border-white/[0.06]' : 'border-black/[0.06]',
    waveInactive: isDark ? 'bg-white/[0.18]' : 'bg-black/[0.12]',
    waveActive: 'bg-brand-orange',
    controlBtn: isDark
      ? 'text-white/55 hover:text-white transition-colors duration-150'
      : 'text-black/55 hover:text-black transition-colors duration-150',
    speedBtn: isDark
      ? 'border-white/[0.18] text-white/60 hover:text-white hover:border-white/40 bg-transparent'
      : 'border-black/[0.18] text-black/60 hover:text-black hover:border-black/40 bg-transparent',
    timeLabel: isDark ? 'text-white/35' : 'text-black/35',
    transcriptText: isDark ? 'text-white/60' : 'text-[#444]',
    epLabel: isDark ? 'text-white/40' : 'text-black/40',
    title: isDark ? 'text-white' : 'text-[#141416]',
    coverFallback: isDark ? 'bg-white/[0.06]' : 'bg-black/[0.05]',
    errorNotice: 'border-status-error/30 bg-status-error/10 text-status-error',
    voiceBtn: isDark
      ? 'border-white/[0.12] bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white'
      : 'border-black/[0.12] bg-black/[0.03] text-black/70 hover:bg-black/[0.06] hover:text-black',
    voiceMenu: isDark
      ? 'bg-[#1C1C20] border-white/[0.10] shadow-xl shadow-black/40'
      : 'bg-white border-black/[0.10] shadow-xl shadow-black/10',
    voiceItem: isDark
      ? 'text-white/70 hover:bg-white/[0.07] hover:text-white'
      : 'text-black/70 hover:bg-black/[0.05] hover:text-black',
    voiceItemActive: isDark ? 'bg-brand-cyan/[0.15] text-brand-cyan' : 'bg-brand-cyan/[0.12] text-brand-cyan',
    voiceLang: isDark ? 'text-white/30' : 'text-black/30',
    bottomBar: isDark
      ? 'bg-[#141416]/95 border-white/[0.08]'
      : 'bg-white/95 border-black/[0.08]',
    guestBtn: isDark
      ? 'border-white/30 text-white hover:bg-white/[0.06]'
      : 'border-black/30 text-[#141416] hover:bg-black/[0.04]',
  };

  // ---------------------------------------------------------------------------
  // Render: loading / 402 / not found
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${isDark ? 'bg-[#141416]' : 'bg-[#F5F5F7]'}`}>
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-brand-cyan" />
      </div>
    );
  }

  if (error402) {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center ${T.page}`}>
        <p className="text-lg font-bold">This episode requires a subscription.</p>
        <p className={`text-sm ${T.epLabel}`}>Unlock unlimited access to all episodes.</p>
        <button
          type="button"
          onClick={() => navigate('/subscribe')}
          className="mt-2 rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white hover:bg-brand-orange/90"
        >
          Subscribe to listen
        </button>
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
  const bars = waveformBars.current;

  // ---------------------------------------------------------------------------
  // Render: main
  // ---------------------------------------------------------------------------

  return (
    <div
      className={`min-h-screen ${T.page}`}
      onClick={() => voiceOpen && setVoiceOpen(false)}
    >
      {/* ── Hero Cover Image ─────────────────────────────────── */}
      <div className="relative w-full h-[220px] sm:h-[280px] md:h-[320px] overflow-hidden">
        {episode.coverImageUrl ? (
          <img
            src={episode.coverImageUrl}
            alt={episode.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${T.coverFallback}`}>
            <Music size={48} className={T.timeLabel} />
          </div>
        )}
        {/* Gradient for button legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30 pointer-events-none" />

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white hover:bg-black/60 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
        </button>

        {/* Top-right icons */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/episodes/${id}/read`)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white hover:bg-black/60 transition-colors"
            aria-label="Read this episode"
          >
            <BookOpen size={16} />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white hover:bg-black/60 transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="mx-auto max-w-xl px-4 pt-6 pb-28 md:max-w-4xl md:px-8 md:pb-12 md:pt-8">
        <div className="md:grid md:grid-cols-[1fr_360px] md:gap-8 md:items-start">

          {/* ── Player column ── */}
          <div>
            {/* Episode info */}
            <div className="mb-5">
              {epLabel && (
                <p className={`text-[11px] font-bold uppercase tracking-[0.1em] ${T.epLabel}`}>
                  {epLabel}
                </p>
              )}
              <h1 className={`mt-1 text-xl font-bold leading-snug md:text-2xl ${T.title}`}>
                {episode.title}
              </h1>
            </div>

            {/* Error notices */}
            {audioError && (
              <div className={`mb-5 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${T.errorNotice}`}>
                <AlertCircle size={15} className="shrink-0" />
                <span>Audio failed to load. Please try again later.</span>
              </div>
            )}
            {ttsError && (
              <div className={`mb-5 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${T.errorNotice}`}>
                <AlertCircle size={15} className="shrink-0" />
                <span>Voice playback failed. Try the read view instead.</span>
              </div>
            )}
            {useTTS && !TTS_AVAILABLE && (
              <div className={`mb-5 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${T.errorNotice}`}>
                <AlertCircle size={15} className="shrink-0" />
                <span>Text-to-speech is not supported in your browser.</span>
              </div>
            )}

            {/* Hidden audio element */}
            {episode.audioUrl && (
              <audio
                ref={audioRef}
                src={episode.audioUrl}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnded}
                onError={handleError}
                preload="metadata"
              />
            )}

            {/* Waveform */}
            <div
              className="flex w-full cursor-pointer select-none items-end gap-[2px] h-[72px]"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                seekToRatio((e.clientX - rect.left) / rect.width);
              }}
              role="slider"
              aria-label="Seek"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {bars.map((h, i) => {
                const barProgress = i / bars.length;
                const isActive = barProgress <= progress;
                const isHead = Math.abs(barProgress - progress) < 1 / bars.length;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-colors duration-150 ${
                      isActive ? T.waveActive : T.waveInactive
                    } ${isHead && playing ? 'opacity-90' : ''}`}
                    style={{ height: `${h}%` }}
                  />
                );
              })}
            </div>

            {/* Time labels */}
            <div className={`mt-2 flex justify-between text-[12px] font-medium tabular-nums ${T.timeLabel}`}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Playback controls */}
            <div className="mt-6 flex items-center justify-center gap-3 md:gap-5">
              <button
                type="button"
                onClick={() => {
                  setCurrentTime(0);
                  charPositionRef.current = 0;
                  currentParaIdx.current = 0;
                  if (audioRef.current) audioRef.current.currentTime = 0;
                  if (useTTS && window.speechSynthesis.speaking) speakFrom(0, speedRef.current);
                }}
                className={T.controlBtn}
                aria-label="Skip to start"
              >
                <SkipBack size={20} />
              </button>

              <button
                type="button"
                onClick={() => skip(-10)}
                className={`relative ${T.controlBtn}`}
                aria-label="Rewind 10 seconds"
              >
                <RotateCcw size={22} />
                <span className="absolute inset-0 flex items-center justify-center mt-[1px] text-[8px] font-black leading-none">
                  10
                </span>
              </button>

              <button
                type="button"
                onClick={togglePlay}
                disabled={playDisabled}
                className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full bg-brand-cyan shadow-lg shadow-brand-cyan/25 transition-all duration-150 hover:bg-brand-cyan/90 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 md:h-[64px] md:w-[64px]"
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? (
                  <Pause size={24} className="text-black" />
                ) : (
                  <Play size={24} className="translate-x-0.5 text-black" />
                )}
              </button>

              <button
                type="button"
                onClick={() => skip(10)}
                className={`relative ${T.controlBtn}`}
                aria-label="Forward 10 seconds"
              >
                <RotateCw size={22} />
                <span className="absolute inset-0 flex items-center justify-center mt-[1px] text-[8px] font-black leading-none">
                  10
                </span>
              </button>

              <button
                type="button"
                onClick={() => seekToRatio(1)}
                className={T.controlBtn}
                aria-label="Skip to end"
              >
                <SkipForward size={20} />
              </button>

              <button
                type="button"
                onClick={cycleSpeed}
                className={`ml-1 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors ${T.speedBtn}`}
                aria-label="Change playback speed"
              >
                {speed === 1 ? '1×' : `${speed}×`}
              </button>
            </div>

            {/* Voice selector */}
            {showVoiceSelector && (
              <div className="mt-5 relative" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setVoiceOpen((o) => !o)}
                  className={`w-full flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-[13px] font-medium transition-colors ${T.voiceBtn}`}
                  aria-haspopup="listbox"
                  aria-expanded={voiceOpen}
                >
                  <svg className="shrink-0 opacity-60" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  <span className="flex-1 text-left truncate">
                    {selectedVoice?.name ?? 'Select voice'}
                  </span>
                  <span className={`text-[11px] font-normal shrink-0 ${T.voiceLang}`}>
                    {selectedVoice?.lang}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 opacity-50 transition-transform duration-200 ${voiceOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {voiceOpen && (
                  <div
                    className={`absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[220px] overflow-y-auto rounded-2xl border py-1.5 ${T.voiceMenu}`}
                    role="listbox"
                  >
                    {voices.map((voice) => {
                      const isSelected = voice.voiceURI === selectedVoiceURI;
                      return (
                        <button
                          key={voice.voiceURI}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleVoiceChange(voice.voiceURI)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left text-[13px] transition-colors ${
                            isSelected ? T.voiceItemActive : T.voiceItem
                          }`}
                        >
                          <span className="flex-1 truncate font-medium">{voice.name}</span>
                          <span className={`text-[11px] shrink-0 ${isSelected ? 'opacity-70' : T.voiceLang}`}>
                            {voice.lang}
                          </span>
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Transcript column ── */}
          <div className="mt-8 md:mt-0 md:sticky md:top-[16px]">
            {paragraphs.length > 0 && (
              <div className={`rounded-2xl border overflow-hidden ${T.card}`}>
                <div className={`px-4 py-3 border-b ${T.cardInner}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${T.epLabel}`}>
                    Transcript
                  </p>
                </div>
                <div
                  ref={transcriptRef}
                  className={`px-4 py-4 max-h-[320px] overflow-y-auto text-[14px] leading-relaxed md:max-h-[420px] ${T.transcriptText}`}
                >
                  {paragraphs.map((para, i) => {
                    const isActive = i === activeIdx;
                    return (
                      <p
                        key={i}
                        data-active={isActive}
                        className={`mb-3 last:mb-0 transition-colors duration-300 ${isActive ? (isDark ? 'text-white' : 'text-black') : ''}`}
                      >
                        {para}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Desktop action buttons */}
            <div className="hidden md:flex gap-3 mt-5">
              {!user && (
                <button
                  type="button"
                  onClick={() => navigate('/subscribe')}
                  className={`flex-1 rounded-2xl border py-4 text-[15px] font-bold transition-all active:scale-[0.98] ${T.guestBtn}`}
                >
                  Continue as Guest
                </button>
              )}
              {hasVoteQuestion && (
                <button
                  type="button"
                  onClick={handleVoteClick}
                  disabled={voteChecking}
                  className="flex-1 rounded-2xl bg-brand-orange py-4 text-[15px] font-bold text-white shadow-lg shadow-brand-orange/20 transition-all hover:bg-brand-orange/90 active:scale-[0.98] disabled:opacity-60"
                >
                  {voteChecking ? 'Loading…' : 'Vote'}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Mobile fixed bottom bar ──────────────────────────── */}
      <div className={`fixed bottom-0 left-0 right-0 flex gap-3 px-4 py-3 border-t backdrop-blur-md md:hidden ${T.bottomBar}`}>
        {!user && (
          <button
            type="button"
            onClick={() => navigate('/subscribe')}
            className={`flex-1 rounded-2xl border py-4 text-[15px] font-bold transition-all active:scale-[0.98] ${T.guestBtn}`}
          >
            Continue as Guest
          </button>
        )}
        {hasVoteQuestion && (
          <button
            type="button"
            onClick={handleVoteClick}
            disabled={voteChecking}
            className="flex-1 rounded-2xl bg-brand-orange py-4 text-[15px] font-bold text-white shadow-lg shadow-brand-orange/20 transition-all hover:bg-brand-orange/90 active:scale-[0.98] disabled:opacity-60"
          >
            {voteChecking ? 'Loading…' : 'Vote'}
          </button>
        )}
      </div>
    </div>
  );
}
