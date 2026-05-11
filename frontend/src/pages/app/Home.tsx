import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import StoryCard, { type StoryCardData } from '@/components/content/StoryCard';
import EmptyState from '@/components/content/EmptyState';
import { BookOpen, Headphones, ArrowRight, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useCountdown, formatHMS } from '@/hooks/useCountdown';

interface ContinueEpisode {
  id: string;
  number: number;
  title: string;
  readTimeMinutes: number;
  story: {
    id: string;
    title: string;
    coverImageUrl: string | null;
  };
  voteCloseAt: string | null;
  progress: {
    position: number;
    mode: 'read' | 'listen';
  };
}

function VotingCountdown({ closeAt }: { closeAt: string | null }) {
  const remaining = useCountdown(closeAt);
  if (remaining === null || remaining <= 0) return null;
  const urgent = remaining < 60 * 60 * 1000; // under 1 hour
  return (
    <div className="flex flex-col items-end whitespace-nowrap">
      <span className="text-[11px] text-[#949BAA] mb-0.5">Voting Closes in</span>
      <span className={`text-[17px] font-bold tabular-nums ${urgent ? 'text-red-400' : 'text-[#FF8750]'}`}>
        {formatHMS(remaining)}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
    </div>
  );
}

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { refresh: refreshSubscription } = useSubscription();
  const paymentStatus = searchParams.get('payment');
  const sessionId = searchParams.get('session_id');

  const [continueEp, setContinueEp] = useState<ContinueEpisode | null | undefined>(undefined);
  const [recommendations, setRecommendations] = useState<StoryCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);

  // When Stripe redirects back after a successful checkout, verify the session
  // server-side and create the subscription record immediately — no webhook needed.
  useEffect(() => {
    if (paymentStatus !== 'success') return;

    setSearchParams({}, { replace: true });

    if (sessionId && user) {
      api
        .post('/subscriptions/complete', { sessionId })
        .then(() => {
          refreshSubscription();
          toast('Subscription activated — welcome aboard!', 'success');
        })
        .catch(() => {
          // Webhook may still deliver; show optimistic message
          toast('Subscription activated — welcome aboard!', 'success');
        });
    } else {
      toast('Subscription activated — welcome aboard!', 'success');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatus]);

  function sortNewest(stories: StoryCardData[]): StoryCardData[] {
    return [...stories].sort((a, b) => {
      if (!a.publishedAt && !b.publishedAt) return 0;
      if (!a.publishedAt) return 1;
      if (!b.publishedAt) return -1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }

  useEffect(() => {
    Promise.all([
      api.get<{ episode: ContinueEpisode | null }>('/me/continue'),
      api.get<{ stories: StoryCardData[] }>('/stories/trending'),
    ])
      .then(([continueRes, recsRes]) => {
        setContinueEp(continueRes.data.episode);
        setRecommendations(sortNewest(recsRes.data.stories));
        lastFetchRef.current = Date.now();
      })
      .catch(() => {
        setContinueEp(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchRef.current > 30_000) {
        api.get<{ stories: StoryCardData[] }>('/stories/trending')
          .then(res => {
            setRecommendations(sortNewest(res.data.stories));
            lastFetchRef.current = Date.now();
          })
          .catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <div className="w-full bg-[#0B0E14] min-h-screen relative">
      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* =========================================
              MOBILE LAYOUT (Strict Figma Matching)
             ========================================= */}
          <div className="flex flex-col md:hidden px-5 py-10 pb-32">
            {!user && (
              <div className="mb-8 rounded-2xl bg-gradient-to-r from-brand-orange/20 to-brand-cyan/20 border border-white/10 p-5 backdrop-blur-md">
                <p className="text-sm font-bold text-white mb-3">Sign up to unlock the full Storyuu experience!</p>
                <Link 
                  to="/signup" 
                  className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-2.5 text-xs font-bold text-white shadow-lg"
                >
                  Join Now
                </Link>
              </div>
            )}
            <div className="mb-6">
              <h1 className="text-xl font-light text-white tracking-wide">
                {user ? (
                  <>Welcome back, <span className="font-semibold">{user.firstName || 'Reader'}!</span></>
                ) : (
                  <>Welcome, <span className="font-semibold">Guest!</span></>
                )}
              </h1>
              <p className="mt-1 text-[13px] text-[#949BAA]">
                {user ? 'Pick up from where you left' : 'Discover immersive stories today'}
              </p>
            </div>

            {continueEp && (
              <Link to={`/episodes/${continueEp.id}/read`} className="group relative mb-8 flex flex-col gap-3">
                <div className="relative h-[200px] w-full overflow-hidden rounded-xl">
                  {continueEp.story.coverImageUrl ? (
                    <img 
                      src={continueEp.story.coverImageUrl} 
                      alt="" 
                      className="h-full w-full object-cover brightness-75 transition-all group-hover:brightness-90"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#161923]" />
                  )}
                  {/* Cyan "New" Ribbon */}
                  <div className="absolute right-4 top-0">
                    <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 0H24V36L12 28L0 36V0Z" fill="#07C2EF"/>
                      <text x="12" y="18" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">New</text>
                    </svg>
                  </div>
                </div>
                
                <div className="flex justify-between items-start mt-1">
                  <div className="flex flex-col max-w-[65%]">
                    <h2 className="text-[17px] font-bold text-white leading-tight">
                      Episode {continueEp.number} : {continueEp.title}
                    </h2>
                    <p className="text-[13px] text-[#949BAA] mt-1">{continueEp.story.title}</p>
                  </div>
                  <VotingCountdown closeAt={continueEp.voteCloseAt} />
                </div>
              </Link>
            )}

            <div>
              <h2 className="mb-5 text-[19px] font-light text-white tracking-wide">
                More Stories for uu
              </h2>
              {recommendations.length === 0 ? (
                <EmptyState
                  icon={<BookOpen size={28} />}
                  title="You've explored everything!"
                  description="Check back soon for new stories."
                />
              ) : (
                <div className="flex flex-col gap-8">
                  {recommendations.map(story => (
                    <Link to={`/stories/${story.id}`} key={story.id} className="group flex flex-col gap-2.5 block">
                      <div className="relative h-[160px] w-full overflow-hidden rounded-xl">
                        {story.coverImageUrl ? (
                          <img 
                            src={story.coverImageUrl} 
                            className="h-full w-full object-cover brightness-75 transition-all group-hover:brightness-90" 
                            alt="" 
                          />
                        ) : (
                          <div className="h-full w-full bg-[#161923]" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-[17px] font-bold text-white leading-snug">{story.title}</h3>
                        <p className="text-[13px] text-[#949BAA] mt-0.5">Romance & Thriller</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* =========================================
              DESKTOP LAYOUT (Premium 2026 Landing Page)
             ========================================= */}
          <div className="hidden md:flex flex-col max-w-[1440px] mx-auto px-8 py-16 lg:px-12 relative min-h-[90vh]">
            
            {/* Background Ambient Glows */}
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-brand-cyan/20 blur-[150px] rounded-full pointer-events-none animate-float opacity-70" style={{ animationDuration: '12s' }} />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-brand-orange/10 blur-[150px] rounded-full pointer-events-none animate-float opacity-50" style={{ animationDuration: '15s', animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#607879]/10 blur-[120px] rounded-full pointer-events-none animate-pulse-glow" />

            {/* Hero Banner Section */}
            <div className="relative mb-24 z-10 flex flex-col lg:flex-row items-center justify-between gap-16 mt-8">
              
              <div className="flex-1 flex flex-col items-start animate-fade-in-up" style={{ animationDuration: '0.8s' }}>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-cyan mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(7,194,239,0.15)] group transition-all duration-500 hover:bg-white/10 hover:border-brand-cyan/30 cursor-default">
                  <Sparkles size={14} className="animate-pulse" />
                  <span className="bg-gradient-to-r from-brand-cyan to-white bg-clip-text text-transparent">Storyuu Studio</span>
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.05] drop-shadow-2xl">
                  {user ? 'Hello,' : 'Welcome,'} <br/>
                  <span className="bg-gradient-to-br from-brand-cyan via-white to-brand-orange bg-clip-text text-transparent relative inline-block">
                    {user ? (user.firstName || 'Reader') : 'Guest'}
                    <div className="absolute -bottom-2 left-0 w-full h-[3px] bg-gradient-to-r from-brand-cyan to-transparent rounded-full opacity-50" />
                  </span>
                </h1>
                
                <p className="mt-8 text-xl text-[#949BAA] leading-relaxed max-w-xl font-light">
                  {user 
                    ? 'Your personal library of immersive stories awaits. Dive right back into your current adventures or discover breathtaking new worlds.'
                    : 'Discover a universe of serialized fiction. Sign up today to build your library, vote on plot twists, and listen to premium audio.'
                  }
                </p>
                {!user && (
                  <Link 
                    to="/signup" 
                    className="mt-10 inline-flex items-center gap-3 rounded-full bg-brand-orange px-8 py-4 text-base font-bold text-white shadow-2xl transition-transform hover:scale-105"
                  >
                    Get Started Free <ArrowRight size={20} />
                  </Link>
                )}
              </div>

              {continueEp && (
                <div className="flex-1 w-full lg:w-auto animate-fade-in-up relative" style={{ animationDuration: '0.8s', animationDelay: '0.2s', animationFillMode: 'both' }}>
                  {/* Glowing backdrop for the card */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-brand-cyan/30 to-brand-orange/30 rounded-[28px] blur-xl opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse-glow" />
                  
                  <div className="group relative flex overflow-hidden rounded-[24px] bg-[#0F111A]/80 backdrop-blur-2xl border border-white/10 shadow-[0_24px_50px_rgba(0,0,0,0.5)] transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_32px_60px_rgba(7,194,239,0.2)] hover:border-brand-cyan/40">
                    {continueEp.story.coverImageUrl && (
                      <div className="w-2/5 shrink-0 relative overflow-hidden">
                        <img src={continueEp.story.coverImageUrl} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0F111A]/90" />
                        
                        {/* Shimmer sweep on the image */}
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[slideProgress_1.5s_ease-in-out]" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col justify-center p-8 lg:p-10 relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100" />
                      
                      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-cyan mb-3">
                        <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
                        Continue Reading
                      </span>
                      <h3 className="text-3xl font-bold text-white mb-2 line-clamp-1 drop-shadow-md">{continueEp.story.title}</h3>
                      <p className="text-base text-[#949BAA] mb-8 line-clamp-1 font-light">Ep {continueEp.number} — {continueEp.title}</p>
                      
                      <div className="flex flex-wrap items-center gap-4">
                        <Link 
                          to={`/episodes/${continueEp.id}/read`}
                          className="relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-full bg-white text-black px-8 py-3.5 text-sm font-bold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                        >
                          <BookOpen size={18} /> 
                          <span className="relative z-10">Read Now</span>
                        </Link>
                        
                        {continueEp.progress.mode === 'listen' && (
                          <Link 
                            to={`/episodes/${continueEp.id}/listen`}
                            className="group/btn inline-flex items-center justify-center gap-2 rounded-full bg-white/5 border border-white/10 text-white px-8 py-3.5 text-sm font-bold transition-all duration-300 hover:bg-white/10 hover:border-white/30"
                          >
                            <Headphones size={18} className="transition-transform duration-300 group-hover/btn:scale-110 text-[#949BAA] group-hover/btn:text-white" /> Listen
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Discover Stories Section */}
            <div className="relative z-10 animate-fade-in-up" style={{ animationDuration: '1s', animationDelay: '0.4s', animationFillMode: 'both' }}>
              <div className="mb-12 flex items-end justify-between border-b border-[#1E222B] pb-6">
                <div>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Trending Now</h2>
                  <p className="text-[#949BAA] text-sm font-light">Discover what others are immersing themselves in.</p>
                </div>
                <Link to="/library" className="group flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-cyan transition-all hover:text-white hover:tracking-[0.08em]">
                  View Library <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-2" />
                </Link>
              </div>
              
              {recommendations.length === 0 ? (
                <EmptyState
                  icon={<BookOpen size={28} className="animate-float" />}
                  title="You've explored everything!"
                  description="Check back soon for new stories."
                />
              ) : (
                <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {recommendations.map((story, i) => (
                    <div 
                      key={story.id} 
                      className="group transform transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02]"
                      style={{ 
                        animation: `fadeInUp 0.6s ease-out ${0.5 + i * 0.1}s both`
                      }}
                    >
                       <StoryCard story={story} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        </>
      )}
    </div>
  );
}
