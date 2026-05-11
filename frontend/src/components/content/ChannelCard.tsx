import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';

export interface ChannelCardData {
  name: string;
  slug: string;
  description?: string | null;
  coverImageUrl?: string | null;
  storyCount?: number;
  createdAt?: string;
}

interface Props {
  channel: ChannelCardData;
  className?: string;
}

export default function ChannelCard({ channel, className = '' }: Props) {
  return (
    <Link to={`/channels/${channel.slug}`} className={`block ${className}`}>

      {/* ─── MOBILE: Full-bleed image card with left-to-right gradient ─── */}
      <div className="md:hidden relative h-[160px] w-full overflow-hidden rounded-2xl active:scale-[0.98] transition-transform duration-150">
        {channel.coverImageUrl ? (
          <img
            src={channel.coverImageUrl}
            alt={channel.name}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A22] to-[#24242E] flex items-center justify-center">
            <Layers size={36} className="text-neutral-700" />
          </div>
        )}

        {/* Dark gradient: left → transparent (covers ~70% from left) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />

        {/* Text overlay on left portion */}
        <div className="absolute inset-0 flex flex-col justify-center px-5 py-4" style={{ paddingRight: '42%' }}>
          <h3 className="font-bold text-white text-[17px] leading-snug">
            {channel.name}
          </h3>
          {channel.description && (
            <p className="mt-1.5 text-[12px] text-white/70 line-clamp-4 leading-relaxed">
              {channel.description}
            </p>
          )}
        </div>
      </div>

      {/* ─── DESKTOP: Premium interactive card ─── */}
      <div className="hidden md:flex flex-col rounded-[20px] bg-[#12141D]/80 backdrop-blur-2xl border border-white/5 p-3 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(0,0,0,0.6)] hover:bg-[#161923] hover:border-brand-orange/30 group/card relative overflow-hidden">

        <div className="absolute inset-0 bg-gradient-to-b from-brand-orange/5 to-transparent opacity-0 transition-opacity duration-500 group-hover/card:opacity-100 pointer-events-none" />

        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-[#161923]">
          {channel.coverImageUrl ? (
            <img
              src={channel.coverImageUrl}
              alt={channel.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bg-surface to-bg-surface-alt">
              <Layers size={32} className="text-neutral-700" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover/card:opacity-95 transition-opacity duration-500" />

          <div className="absolute bottom-4 right-4 opacity-0 translate-y-4 transition-all duration-500 group-hover/card:opacity-100 group-hover/card:translate-y-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange/90 text-white shadow-[0_0_20px_rgba(255,135,80,0.6)] backdrop-blur-sm transition-transform hover:scale-110">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col mt-4 px-2 pb-2 relative z-10">
          <h3 className="line-clamp-1 text-lg font-extrabold text-white transition-colors duration-300 group-hover/card:text-brand-orange tracking-tight drop-shadow-md">
            {channel.name}
          </h3>
          <p className="line-clamp-2 mt-1.5 text-[13px] text-[#949BAA] leading-relaxed font-light">
            {channel.description || 'Explore immersive stories and exclusive content.'}
          </p>

          {typeof channel.storyCount === 'number' && (
            <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              <Layers size={14} className="text-brand-orange/70" />
              <span>{channel.storyCount} {channel.storyCount === 1 ? 'story' : 'stories'} available</span>
            </div>
          )}
        </div>
      </div>

    </Link>
  );
}
