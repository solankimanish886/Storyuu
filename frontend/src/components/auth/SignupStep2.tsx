import React from 'react';
import { User, Lock } from 'lucide-react';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import LoginCollage from './LoginCollage';
import SocialLogins from './SocialLogins';
import { Link } from 'react-router-dom';


interface Props {
  name: string;
  setName: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  onSubmit: (ev: React.FormEvent) => void;
  loading?: boolean;
  errors?: { name?: string; password?: string; form?: string };
}

export default function SignupStep2({ 
  name, setName, password, setPassword, onSubmit, loading, errors 
}: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary text-white overflow-x-hidden">
      {/* Top Collage Section */}
      <LoginCollage />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-8 pb-12 -mt-16 relative z-10">
        <h1 className="text-center text-[28px] md:text-display-m font-bold leading-tight mb-10 max-w-[300px]">
          Explore and co-create fictional worlds with us in just a few minutes
        </h1>

        <form onSubmit={onSubmit} noValidate className="w-full max-w-sm flex flex-col gap-5">
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-brand-cyan transition-colors">
              <User size={20} />
            </div>
            <input
              type="text"
              placeholder="Enter your name"
              className="w-full bg-white/5 border border-neutral-700 rounded-xl py-4 pl-12 pr-4 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-brand-cyan transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors?.name && <p className="mt-1 text-xs text-status-error ml-1">{errors.name}</p>}
          </div>

          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-brand-cyan transition-colors">
              <Lock size={20} />
            </div>
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-white/5 border border-neutral-700 rounded-xl py-4 pl-12 pr-4 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-brand-cyan transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors?.password && <p className="mt-1 text-xs text-status-error ml-1">{errors.password}</p>}
          </div>

          {errors?.form && (
            <p className="rounded-md bg-status-error/10 px-3 py-2 text-sm text-status-error text-center">
              {errors.form}
            </p>
          )}

          <Button 
            type="submit" 
            variant="cyan" 
            loading={loading} 
            className="w-full py-4 font-bold rounded-xl text-base mt-2 shadow-lg shadow-brand-cyan/20"
          >
            Let's do it!
          </Button>

          <div className="mt-4">
            <SocialLogins />
          </div>
        </form>

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
