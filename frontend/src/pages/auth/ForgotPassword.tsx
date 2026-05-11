import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import LoginCollage from '@/components/auth/LoginCollage';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!email) {
      setEmailError('Email is required.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Something went wrong. Please try again.';
      setEmailError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary text-white overflow-x-hidden">
      {/* Top Collage Section */}
      <div className="relative">
        <LoginCollage />
        <Link 
          to="/login" 
          className="absolute top-6 left-6 z-50 flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-8 pb-12 -mt-16 relative z-10">
        {!sent ? (
          <>
            <h1 className="text-center text-[28px] md:text-display-m font-bold leading-tight mb-16 max-w-[340px]">
              Enter your email address to receive the link for resetting password
            </h1>

            <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm flex flex-col gap-5">
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
                {emailError && <p className="mt-1 text-xs text-status-error ml-1">{emailError}</p>}
              </div>

              <Button 
                type="submit" 
                variant="cyan" 
                loading={loading} 
                className="w-full py-4 font-bold rounded-md text-base mt-2 shadow-lg shadow-brand-cyan/20"
              >
                Submit
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center">
            <h1 className="text-[28px] md:text-display-m font-bold leading-tight mb-6 max-w-[340px]">
              Enter your email address to receive the link for resetting password
            </h1>
            <div className="bg-white/5 border border-neutral-800 rounded-2xl p-8 max-w-sm">
              <p className="text-neutral-300 text-[15px] leading-relaxed">
                An email has been sent to you at <br />
                <span className="text-white font-bold">{email}</span> <br />
                Please follow the instructions provided in the mail.
              </p>
            </div>
          </div>
        )}

        {/* Logo at bottom */}
        <div className="mt-16">
          <Logo variant="hori-tag" className="hidden h-12 md:block" />
          <Logo variant="mark" className="h-10 md:hidden" />
        </div>
      </div>
    </div>
  );
}
