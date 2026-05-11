import { Mail } from 'lucide-react';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import SocialLogins from './SocialLogins';
import { Link } from 'react-router-dom';
import signupHeader from '@/assets/signup_header_step1.svg';


interface Props {
  email: string;
  setEmail: (val: string) => void;
  onContinue: () => void;
  loading?: boolean;
  error?: string;
}

export default function SignupStep1({ email, setEmail, onContinue, loading, error }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary text-white overflow-x-hidden">
      {/* Large Header Image */}
      <div className="relative h-[45vh] w-full overflow-hidden">
        <img
          src={signupHeader}
          alt=""
          className="h-full w-full object-cover"
        />
        {/* Gradient overlay to blend bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/40 to-transparent" />
        
        {/* Curvature at bottom */}
        <div 
          className="absolute -bottom-[50px] left-1/2 -translate-x-1/2 w-[120%] h-[100px] bg-bg-primary rounded-[100%] z-10"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-8 pb-12 -mt-8 relative z-20">
        <h1 className="text-center text-[28px] md:text-display-m font-bold leading-tight mb-4 max-w-[300px]">
          Everyone needs some fiction in their lives
        </h1>
        <p className="text-center text-neutral-400 text-sm mb-12 max-w-[280px] leading-relaxed">
          Enjoy our romance stories in bite size pieces and take a quick fiction break anytime you want.
        </p>

        <div className="w-full max-w-sm flex flex-col gap-5">
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-brand-cyan transition-colors">
              <Mail size={20} />
            </div>
            <input
              type="email"
              placeholder="Enter your email address"
              className="w-full bg-white/5 border border-neutral-700 rounded-xl py-4 pl-12 pr-4 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-brand-cyan transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs text-status-error -mt-2 ml-1">
              {error}
            </p>
          )}

          <Button 
            type="button" 
            variant="cyan" 
            loading={loading} 
            className="w-full py-4 font-bold rounded-xl text-base mt-2 shadow-lg shadow-brand-cyan/20"
            onClick={onContinue}
          >
            Get Started
          </Button>

          <div className="mt-4">
            <SocialLogins />
          </div>
        </div>

        <p className="mt-10 text-center text-[15px]">
          Have an account?{' '}
          <Link to="/login" className="text-brand-orange hover:underline font-bold ml-1">
            Log In
          </Link>
        </p>

        {/* Logo at bottom */}
        <div className="mt-16">
          <Logo variant="hori-tag" className="hidden h-12 md:block" />
          <Logo variant="mark" className="h-10 md:hidden" />
        </div>
      </div>
    </div>
  );
}
