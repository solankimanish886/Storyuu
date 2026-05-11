import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoteChoice {
  title: string;
  description: string;
}

interface VoteQuestion {
  id: string;
  question: string;
  isOpen: boolean;
  closeAt?: string | null;
  choices: VoteChoice[];
  userChoiceIndex: number | null;
  winningChoiceIndex?: number | null;
  totalVotes?: number;
}

interface VoteData {
  voteQuestion: VoteQuestion | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OPTION_PREFIXES = ['Option A:', 'Option B:', 'Option C:'] as const;

function getOptionPrefix(index: number): string {
  return OPTION_PREFIXES[index] ?? `Option ${String.fromCharCode(65 + index)}:`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Vote() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<VoteQuestion | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<VoteData>(`/episodes/${id}/vote`)
      .then(({ data: res }) => setData(res.voteQuestion ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Redirect after data loads: no vote → reader; already voted → success screen
  useEffect(() => {
    if (loading || data === undefined) return;
    if (data === null) {
      setRedirecting(true);
      navigate(`/episodes/${id}/read`, { replace: true });
      return;
    }
    if (data.userChoiceIndex !== null) {
      setRedirecting(true);
      navigate(`/episodes/${id}/vote-success`, {
        replace: true,
        state: { votedSuccessfully: true },
      });
    }
  }, [loading, data, id, navigate]);

  // Clear validation error when user selects an option
  useEffect(() => {
    if (selected !== null) setSubmitError('');
  }, [selected]);

  const handleSubmit = async () => {
    if (!data || submitting) return;

    if (selected === null) {
      setSubmitError('Please select an option to continue.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      await api.post('/votes', {
        voteQuestionId: data.id,
        choiceIndex: selected,
      });
      navigate(`/episodes/${id}/vote-success`, { state: { votedSuccessfully: true } });
    } catch (err: unknown) {
      const msg: string =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '';
      if (msg.toLowerCase().includes('closed') || msg.toLowerCase().includes('not opened')) {
        setSubmitError('Voting has closed for this question.');
      } else {
        setSubmitError('Failed to cast vote. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading / redirect states
  // ---------------------------------------------------------------------------

  if (loading || redirecting || data === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-brand-cyan" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary text-white">
      {/* Back button */}
      <div className="px-4 pt-4 pb-2 md:px-6 md:pt-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-transparent text-white transition-colors hover:bg-white/10"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-4 pb-10 md:px-6">
        <div className="mx-auto w-full max-w-lg">

          {/* Voting closed, user hasn't voted */}
          {data && !data.isOpen && data.userChoiceIndex === null && (
            <div className="mt-10 space-y-4">
              <p className="text-neutral-400">Voting has closed for this episode.</p>
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="rounded-full bg-brand-cyan px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-brand-cyan/90"
              >
                Back to Home
              </button>
            </div>
          )}

          {/* Active vote form */}
          {data && data.isOpen && data.userChoiceIndex === null && (
            <>
              {/* Option cards */}
              <div className="mt-4 space-y-4">
                {data.choices.map((choice, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelected(i)}
                    className={`w-full rounded-2xl border-2 p-5 text-left transition-all duration-150 ${
                      selected === i
                        ? 'border-brand-cyan bg-brand-cyan'
                        : 'border-brand-cyan bg-transparent hover:bg-brand-cyan/5'
                    }`}
                  >
                    <p className={`text-base font-bold leading-tight ${
                      selected === i ? 'text-white' : 'text-brand-cyan'
                    }`}>
                      {getOptionPrefix(i)} &ldquo;{choice.title}&rdquo;
                    </p>
                    {choice.description && (
                      <p className="mt-2 text-sm leading-relaxed text-white">
                        {choice.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {/* Inline error */}
              {submitError && (
                <p role="alert" className="mt-4 text-sm text-rose-400">
                  {submitError}
                </p>
              )}

              {/* Submit button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="mt-6 w-full rounded-full bg-brand-orange py-4 text-base font-bold text-white shadow-lg shadow-brand-orange/20 transition-all hover:bg-brand-orange/90 disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit your Vote'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
