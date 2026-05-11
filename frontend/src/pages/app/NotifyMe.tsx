import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';

export default function NotifyMe() {
  const { episodeId } = useParams<{ episodeId: string }>();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !episodeId) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/notify-me', { email: email.trim(), episodeId });
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4 text-white">
      <div className="w-full max-w-sm">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-cyan/15">
            <Bell size={32} className="text-brand-cyan" />
          </div>
        </div>

        {submitted ? (
          /* Success state */
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">You're on the list!</h1>
            <p className="mt-3 text-neutral-400">
              We'll notify you at{' '}
              <span className="font-semibold text-white">{email}</span>{' '}
              when this episode drops.
            </p>
            <Link
              to="/"
              className="mt-8 inline-block text-sm text-brand-cyan hover:underline"
            >
              ← Back to home
            </Link>
          </div>
        ) : (
          /* Form state */
          <>
            <h1 className="text-center text-2xl font-bold text-white">Get notified</h1>
            <p className="mt-2 text-center text-sm text-neutral-400">
              Enter your email and we'll let you know the moment this episode is available.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="notify-email" className="mb-1.5 block text-sm font-medium text-neutral-300">
                  Email address
                </label>
                <input
                  id="notify-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full rounded-full bg-brand-cyan py-3 text-sm font-semibold text-black shadow-lg shadow-brand-cyan/20 transition-all hover:bg-brand-cyan/90 disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Notify Me'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-neutral-600">
              No spam — just one email when the episode drops.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
