import { Lock, BookOpen, Headphones } from 'lucide-react';

export interface EpisodeRowData {
  id: string;
  number: number;
  title: string;
  readTimeMinutes?: number;
  audioDurationSeconds?: number;
  voteState?: 'none' | 'available' | 'voted' | 'closed';
}

interface Props {
  episode: EpisodeRowData;
  isLocked?: boolean;
  onRead: () => void;
  onListen?: () => void;
}

export default function EpisodeRow({ episode, isLocked = false, onRead, onListen }: Props) {
  return (
    <>
      {/* =========================================
          MOBILE VIEW
         ========================================= */}
      <div
        className={`md:hidden flex items-center gap-3 rounded-md px-4 py-3 transition-colors cursor-pointer ${
          isLocked ? 'opacity-50' : 'hover:bg-bg-surface-alt'
        }`}
        onClick={onRead}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-surface-alt text-xs font-bold text-neutral-400">
          {isLocked ? <Lock size={13} /> : episode.number}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className={`truncate text-sm font-medium ${isLocked ? 'text-neutral-500' : 'text-white'}`}>
            {episode.title}
          </span>
          {episode.readTimeMinutes && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 flex-wrap mt-0.5">
              <span>{episode.readTimeMinutes} min read</span>
              {!isLocked && episode.voteState && episode.voteState !== 'none' && (
                <>
                  <span className="text-neutral-600">·</span>
                  <span className={`flex items-center gap-1 ${
                    episode.voteState === 'available' ? 'text-brand-orange/70' :
                    episode.voteState === 'voted' ? 'text-brand-cyan/70' :
                    'text-neutral-600'
                  }`}>
                    <span className={`h-1 w-1 rounded-full shrink-0 ${
                      episode.voteState === 'available' ? 'bg-brand-orange/60' :
                      episode.voteState === 'voted' ? 'bg-brand-cyan/60' :
                      'bg-neutral-600'
                    }`} />
                    {episode.voteState === 'available' ? 'Voting' :
                     episode.voteState === 'voted' ? 'Voted' : 'Closed'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {!isLocked && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRead(); }}
              className="flex items-center gap-1.5 rounded-full bg-brand-cyan/10 px-3 py-1.5 text-xs font-semibold text-brand-cyan transition-colors hover:bg-brand-cyan/20"
            >
              <BookOpen size={12} />
              <span>Read</span>
            </button>
            {onListen && episode.audioDurationSeconds && episode.audioDurationSeconds > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onListen(); }}
                className="flex items-center gap-1.5 rounded-full bg-brand-orange/10 px-3 py-1.5 text-xs font-semibold text-brand-orange transition-colors hover:bg-brand-orange/20"
              >
                <Headphones size={12} />
                <span>Listen</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* =========================================
          DESKTOP VIEW (Premium 2026 Interactive Row)
         ========================================= */}
      <div
        className={`hidden md:flex group/ep relative items-center gap-6 rounded-[16px] px-6 py-4 transition-all duration-400 cursor-pointer ${
          isLocked
            ? 'opacity-60 bg-white/[0.02]'
            : 'hover:bg-[#161923]/80 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-transparent hover:border-white/5'
        }`}
        onClick={onRead}
      >
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors duration-400 ${
          isLocked ? 'bg-white/5 text-neutral-500' : 'bg-brand-cyan/10 text-brand-cyan group-hover/ep:bg-brand-cyan group-hover/ep:text-black shadow-[0_0_15px_rgba(7,194,239,0.2)]'
        }`}>
          {isLocked ? <Lock size={16} /> : <span className="text-lg font-black">{episode.number}</span>}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className={`truncate text-lg tracking-tight transition-colors duration-300 ${
            isLocked ? 'text-neutral-500 font-medium' : 'text-white font-bold group-hover/ep:text-brand-cyan'
          }`}>
            {episode.title}
          </span>
          {episode.readTimeMinutes && (
            <div className="flex items-center gap-2 text-sm font-light text-[#949BAA] mt-0.5 flex-wrap">
              <span>{episode.readTimeMinutes} min read</span>
              {!isLocked && episode.voteState && episode.voteState !== 'none' && (
                <>
                  <span className="text-[#949BAA]/40">·</span>
                  <span className={`flex items-center gap-1.5 text-xs ${
                    episode.voteState === 'available' ? 'text-brand-orange/80' :
                    episode.voteState === 'voted' ? 'text-brand-cyan/70' :
                    'text-[#949BAA]/60'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      episode.voteState === 'available' ? 'bg-brand-orange/70' :
                      episode.voteState === 'voted' ? 'bg-brand-cyan/60' :
                      'bg-[#949BAA]/40'
                    }`} />
                    {episode.voteState === 'available' ? 'Voting available' :
                     episode.voteState === 'voted' ? 'You voted' : 'Voting closed'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {!isLocked && (
          <div className="flex shrink-0 items-center gap-3 opacity-0 translate-x-4 transition-all duration-400 group-hover/ep:opacity-100 group-hover/ep:translate-x-0">
            {onListen && episode.audioDurationSeconds && episode.audioDurationSeconds > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onListen(); }}
                className="group/btn flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-5 py-2 text-sm font-bold text-brand-orange transition-all hover:bg-brand-orange hover:text-white hover:shadow-[0_0_20px_rgba(255,135,80,0.4)]"
              >
                <Headphones size={14} className="transition-transform group-hover/btn:scale-110" />
                Listen
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRead(); }}
              className="group/btn flex items-center gap-2 rounded-full bg-brand-cyan px-5 py-2 text-sm font-bold text-black transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(7,194,239,0.5)]"
            >
              <BookOpen size={14} className="transition-transform group-hover/btn:scale-110" />
              Read Now
            </button>
          </div>
        )}
      </div>
    </>
  );
}
