import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { useBreadcrumb } from '@/hooks/useBreadcrumb';
import StoryCard, { type StoryCardData } from '@/components/content/StoryCard';
import EmptyState from '@/components/content/EmptyState';

interface ChannelDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  storyCount: number;
}

function Spinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
    </div>
  );
}

export default function ChannelDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [channel, setChannel] = useState<ChannelDetail | null>(null);
  const [stories, setStories] = useState<StoryCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useBreadcrumb(channel?.name);

  useEffect(() => {
    if (!slug) return;
    api
      .get<{ channel: ChannelDetail; stories: StoryCardData[] }>(`/channels/${slug}`)
      .then(({ data }) => {
        setChannel(data.channel);
        setStories(data.stories);
      })
      .catch(() => setError('Channel not found.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Spinner />;

  if (error || !channel) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <Link to="/channels" className="mb-6 flex items-center gap-1 text-sm text-neutral-400 hover:text-white">
          <ChevronLeft size={16} /> Channels
        </Link>
        <p className="text-neutral-400">{error || 'Channel not found.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary md:bg-[#0B0E14]">
      {/* =========================================
          MOBILE VIEW (Original Flat Design)
         ========================================= */}
      <div className="md:hidden">
        {/* Hero */}
        <div className="relative h-52 w-full overflow-hidden">
          {channel.coverImageUrl ? (
            <img src={channel.coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-bg-surface to-bg-surface-alt" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/60 to-transparent" />

          {/* Back button */}
          <Link
            to="/channels"
            className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
          >
            <ChevronLeft size={18} />
          </Link>

          {/* Channel name over hero */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-6">
            <h1 className="text-display-m font-bold text-white">{channel.name}</h1>
            {channel.description && (
              <p className="mt-1 max-w-xl text-sm text-neutral-300">{channel.description}</p>
            )}
          </div>
        </div>

        {/* Stories */}
        <div className="px-4 py-8">
          <h2 className="mb-6 text-lg font-bold text-white">
            {stories.length} {stories.length === 1 ? 'Story' : 'Stories'}
          </h2>

          {stories.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={28} />}
              title="No stories yet"
              description="This channel is coming soon."
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {stories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =========================================
          DESKTOP VIEW (Premium 2026 Layout)
         ========================================= */}
      <div className="hidden md:block">
        {/* Cinematic Parallax Hero */}
        <div className="relative h-[400px] lg:h-[500px] w-full overflow-hidden">
          <div className="absolute inset-0 bg-[#0B0E14] z-0" />
          {channel.coverImageUrl && (
            <div className="absolute inset-0 z-0 opacity-40 animate-fade-in-up" style={{ animationDuration: '1.5s' }}>
              <img src={channel.coverImageUrl} alt="" className="h-full w-full object-cover scale-105" />
            </div>
          )}
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/60 to-transparent" />
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#0B0E14]/90 to-transparent" />

          <div className="absolute inset-0 z-20 flex flex-col justify-end mx-auto max-w-[1440px] px-8 lg:px-12 pb-16">
            <Link
              to="/channels"
              className="group mb-8 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-cyan transition-all hover:text-white"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-cyan/30 bg-brand-cyan/10 transition-colors group-hover:bg-brand-cyan group-hover:text-black">
                <ChevronLeft size={16} />
              </div>
              Back to Channels
            </Link>

            <div className="animate-fade-in-up" style={{ animationDuration: '0.8s', animationDelay: '0.2s', animationFillMode: 'both' }}>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-4 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
                Featured Channel
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-white tracking-tight drop-shadow-2xl">
                {channel.name}
              </h1>
              {channel.description && (
                <p className="mt-6 max-w-2xl text-xl text-[#949BAA] font-light leading-relaxed">
                  {channel.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stories Grid */}
        <div className="mx-auto max-w-[1440px] px-8 lg:px-12 py-12 relative z-30">
          <div className="mb-10 flex items-center justify-between border-b border-[#1E222B] pb-4">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Collection <span className="ml-2 rounded-full bg-brand-cyan/20 px-3 py-1 text-sm text-brand-cyan">{stories.length}</span>
            </h2>
          </div>

          {stories.length === 0 ? (
            <div className="animate-fade-in-up" style={{ animationDuration: '1s', animationDelay: '0.4s', animationFillMode: 'both' }}>
              <EmptyState
                icon={<BookOpen size={28} className="animate-float" />}
                title="No stories yet"
                description="Check back soon for exciting new additions."
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {stories.map((story, i) => (
                <div 
                  key={story.id} 
                  className="transform transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02]"
                  style={{ animation: `fadeInUp 0.6s ease-out ${0.4 + i * 0.1}s both` }}
                >
                  <StoryCard story={story} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
