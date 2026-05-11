import { Link } from 'react-router-dom';
import { Users, BookOpen } from 'lucide-react';
import CoverImage from './CoverImage';

export interface StoryCardData {
  id: string;
  title: string;
  overview?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
}

interface Props {
  story: StoryCardData;
  className?: string;
}

export default function StoryCard({ story, className = '' }: Props) {
  return (
    <Link to={`/stories/${story.id}`} className={`block ${className}`}>
      
      {/* =========================================
          MOBILE VIEW (Original Flat Design)
         ========================================= */}
      <div className="flex md:hidden group flex-col gap-3 rounded-md transition-opacity hover:opacity-85">
        <CoverImage
          src={story.coverImageUrl}
          alt={story.title}
          aspect="portrait"
          overlay
          className="shadow-card-dark"
        />
        <div className="flex flex-col gap-1">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white group-hover:text-brand-cyan transition-colors">
            {story.title}
          </h3>
          {story.overview && (
            <p className="line-clamp-2 text-xs text-neutral-500 leading-relaxed">
              {story.overview}
            </p>
          )}
        </div>
      </div>

      {/* =========================================
          DESKTOP VIEW (Premium 2026 Interactive Card)
         ========================================= */}
      <div className="hidden md:flex flex-col rounded-2xl bg-[#12141D]/80 backdrop-blur-2xl border border-white/5 p-3 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(0,0,0,0.6)] hover:bg-[#161923] hover:border-brand-cyan/30 group/card relative overflow-hidden">
        
        {/* Subtle gradient background on hover */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-cyan/5 to-transparent opacity-0 transition-opacity duration-500 group-hover/card:opacity-100 pointer-events-none" />

        {/* Image Container with Zoom & Play Button */}
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-[#161923]">
          {story.coverImageUrl ? (
            <img 
              src={story.coverImageUrl} 
              alt={story.title} 
              className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-110" 
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bg-surface to-bg-surface-alt">
              <BookOpen size={32} className="text-neutral-700" />
            </div>
          )}
          
          {/* Cinematic Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover/card:opacity-95 transition-opacity duration-500" />
          
          {/* Top Tag Badge */}
          <div className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-brand-cyan shadow-lg">
            Trending
          </div>

          {/* Hover Play Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-90 transition-all duration-500 group-hover/card:opacity-100 group-hover/card:scale-100">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-cyan/90 text-white shadow-[0_0_30px_rgba(7,194,239,0.6)] backdrop-blur-sm transition-transform hover:scale-110 pl-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5V19L19 12L8 5Z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Typography & Metadata */}
        <div className="flex flex-col mt-4 px-2 pb-2 relative z-10">
          <h3 className="line-clamp-1 text-[17px] font-extrabold text-white transition-colors duration-300 group-hover/card:text-brand-cyan tracking-tight drop-shadow-md">
            {story.title}
          </h3>
          <p className="line-clamp-2 mt-1.5 text-[13px] text-[#949BAA] leading-relaxed font-light">
            {story.overview || 'Immerse yourself in this captivating adventure crafted exclusively for Storyuu Studio.'}
          </p>
          
        </div>
      </div>

    </Link>
  );
}
