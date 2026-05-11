import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import ChannelCard, { type ChannelCardData } from '@/components/content/ChannelCard';
import EmptyState from '@/components/content/EmptyState';
import { LayoutGrid } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Link } from 'react-router-dom';

/* ── Social icon SVGs ─────────────────────────────────────────────────── */
function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconDiscord() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function Spinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
    </div>
  );
}

export default function Channels() {
  const user = useAuthStore(s => s.user);
  const [channels, setChannels] = useState<ChannelCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ channels: ChannelCardData[] }>('/channels')
      .then(({ data }) =>
        setChannels(
          [...data.channels].sort((a, b) => {
            if (!a.createdAt && !b.createdAt) return 0;
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }),
        ),
      )
      .catch(() => setError('Failed to load channels. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <>
      {/* ─── MOBILE LAYOUT ───────────────────────────────────────────── */}
      <div className="md:hidden flex flex-col min-h-screen bg-bg-primary">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 flex flex-col gap-4">
          {!user && (
            <div className="rounded-2xl bg-gradient-to-r from-brand-orange/20 to-brand-cyan/20 border border-white/10 p-5 backdrop-blur-md mb-2">
              <p className="text-sm font-bold text-white mb-3">Sign up to see the entire Storyuuniverse!</p>
              <Link 
                to="/signup" 
                className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-2.5 text-xs font-bold text-white shadow-lg"
              >
                Join Now
              </Link>
            </div>
          )}
          <h1 className="text-[15px] font-semibold text-white tracking-wide">
            Storyuuniverse
          </h1>
        </div>

        {/* Channel list */}
        <div className="flex-1 px-4 flex flex-col gap-3">
          {error ? (
            <p className="rounded-xl bg-status-error/10 px-4 py-3 text-sm text-status-error">{error}</p>
          ) : channels.length === 0 ? (
            <EmptyState
              icon={<LayoutGrid size={28} className="animate-float" />}
              title="No channels yet"
              description="Check back soon — stories are on their way."
            />
          ) : (
            channels.map((ch, i) => (
              <div
                key={ch.slug}
                className="animate-fade-in-up"
                style={{ animationDuration: '0.5s', animationDelay: `${i * 0.08}s`, animationFillMode: 'both' }}
              >
                <ChannelCard channel={ch} />
              </div>
            ))
          )}
        </div>

        {/* Social footer */}
        <div className="px-5 py-6 mt-4 flex items-center justify-between">
          <p className="text-[13px] text-white/80 font-medium">Connect with the community!</p>
          <div className="flex items-center gap-2.5">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan text-white transition-opacity hover:opacity-80 active:opacity-60"
              aria-label="Facebook"
            >
              <IconFacebook />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan text-white transition-opacity hover:opacity-80 active:opacity-60"
              aria-label="Instagram"
            >
              <IconInstagram />
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan text-white transition-opacity hover:opacity-80 active:opacity-60"
              aria-label="Discord"
            >
              <IconDiscord />
            </a>
          </div>
        </div>
      </div>

      {/* ─── DESKTOP LAYOUT ──────────────────────────────────────────── */}
      <div className="hidden md:block mx-auto max-w-[1440px] px-8 py-16 lg:px-12 min-h-[90vh]">
        <div className="animate-fade-in-up" style={{ animationDuration: '0.8s' }}>
          <div className="flex items-end justify-between mb-2">
            <div>
              <h1 className="text-5xl font-extrabold text-white tracking-tight">Channels</h1>
              <p className="mt-2 text-[#949BAA] text-lg font-light">Explore curated collections of immersive stories.</p>
            </div>
            {!user && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md flex items-center gap-6 max-w-md">
                <p className="text-sm font-medium text-neutral-300">Sign up to unlock the full Storyuu experience!</p>
                <Link 
                  to="/signup" 
                  className="whitespace-nowrap rounded-full bg-brand-orange px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105"
                >
                  Join Storyuu
                </Link>
              </div>
            )}
          </div>
        </div>

        {error ? (
          <p className="rounded-md bg-status-error/10 px-4 py-3 text-sm text-status-error">{error}</p>
        ) : channels.length === 0 ? (
          <div className="animate-fade-in-up" style={{ animationDuration: '1s', animationDelay: '0.2s', animationFillMode: 'both' }}>
            <EmptyState
              icon={<LayoutGrid size={28} className="animate-float" />}
              title="No channels yet"
              description="Check back soon — stories are on their way."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {channels.map((ch, i) => (
              <div
                key={ch.slug}
                className="transform transition-all duration-500 hover:-translate-y-2"
                style={{ animation: `fadeInUp 0.6s ease-out ${0.2 + i * 0.1}s both` }}
              >
                <ChannelCard channel={ch} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
