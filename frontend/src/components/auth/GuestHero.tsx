import { useNavigate } from 'react-router-dom';
import heroImage from '@/assets/7 1 (1).png';

interface GuestHeroProps {
  title?: string;
  description?: string;
}

export default function GuestHero({
  title = 'Hey, Guest Reader!',
  description = 'Sign up for an immersive experience of the entire Storyuuniverse.',
}: GuestHeroProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0E14]">

      {/* ── Full-bleed hero illustration ── */}
      <div className="relative h-[55vh] w-full shrink-0 overflow-hidden md:h-[45vh]">
        <img
          src={heroImage}
          alt=""
          className="h-full w-full object-cover object-center"
        />
        {/* Gradient fade into dark background */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0B0E14] to-transparent" />
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col items-center px-6 pt-6 pb-6 text-center md:mx-auto md:w-full md:max-w-md md:pt-10">
        <h2 className="mb-3 text-[28px] font-extrabold leading-tight tracking-tight text-white md:text-4xl">
          {title}
        </h2>

        <p className="mb-8 text-[15px] leading-relaxed text-[#949BAA] md:text-base">
          {description}
        </p>

        {/* Primary CTA — solid orange, no arrow */}
        <button
          type="button"
          onClick={() => navigate('/signup')}
          className="mb-4 w-full rounded-xl bg-brand-orange py-4 text-base font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          Sign Up
        </button>

        {/* Secondary CTA */}
        <p className="text-[14px] text-white/50">
          Have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-semibold text-brand-orange underline underline-offset-2"
          >
            Log In
          </button>
        </p>
      </div>

    </div>
  );
}
