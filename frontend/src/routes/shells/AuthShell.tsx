import { Outlet } from 'react-router-dom';
import AuthBackground from '@/components/ui/AuthBackground';

/**
 * §3.3 / §2.6 — Auth shell: minimalist. No top nav, no bottom tab bar.
 * Logo wordmark + tagline anchored at the bottom of every auth screen.
 */
export default function AuthShell() {
  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-bg-primary text-white">
      {/* Background layer: Hidden on mobile, visible on md screens */}
      <AuthBackground className="hidden md:block" />

      <main className="relative z-10 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
