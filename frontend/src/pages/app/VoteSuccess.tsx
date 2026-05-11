import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — filename with spaces/parens is valid for Vite asset resolution
import successBg from '@/assets/image (15).png';

export default function VoteSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const didVote = (location.state as { votedSuccessfully?: boolean } | null)?.votedSuccessfully === true;

  // Guard: redirect to /home if not arrived from a vote submission
  useEffect(() => {
    if (!didVote) {
      navigate('/home', { replace: true });
    }
  }, [didVote, navigate]);

  if (!didVote) return null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Full-bleed background */}
      <img
        src={successBg as string}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* Gradient overlay — improves text legibility across viewport sizes */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/65" />

      {/* Content layer */}
      <div className="relative flex flex-1 flex-col">

        {/* Back arrow — top-left */}
        <div className="px-4 pt-4 md:px-6 md:pt-6">
          <button
            type="button"
            onClick={() => navigate('/home')}
            aria-label="Back to home"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-transparent text-white transition-colors hover:bg-white/10"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        {/* Headline — centred at roughly 40-50% from top */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h1 className="text-3xl font-bold leading-snug text-white drop-shadow-lg md:text-4xl">
            Thanks for co-creating<br />with us.
          </h1>
          <p className="mt-5 text-xl font-bold leading-snug text-white drop-shadow-md md:text-2xl">
            You have successfully<br />submitted your vote!
          </p>
        </div>

        {/* CTA — pinned near bottom */}
        <div className="px-4 pb-10 md:px-6 md:pb-14">
          <div className="mx-auto max-w-sm md:max-w-lg">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="w-full rounded-full bg-brand-cyan py-4 text-base font-bold text-white shadow-lg shadow-brand-cyan/20 transition-all hover:bg-brand-cyan/90"
            >
              Back to Home
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
