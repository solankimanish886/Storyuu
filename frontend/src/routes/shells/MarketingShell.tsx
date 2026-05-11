import { useState, useEffect } from 'react';
import { useLocation, Outlet, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '@/components/ui/Logo';

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Pricing', href: '#pricing' },
] as const;

export default function MarketingShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      // Trigger when scrolling past 80% of the viewport height (near end of hero)
      setIsScrolled(window.scrollY > window.innerHeight * 0.8);

      // Determine active section based on scroll position
      const sections = ['how-it-works', 'testimonials', 'pricing'];
      let currentActive: string | null = null;

      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // If the section's top is near the header, or it fills the viewport
          if (rect.top <= 150 && rect.bottom >= 150) {
            currentActive = `#${id}`;
            break;
          }
        }
      }
      setActiveSection(currentActive);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial state
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { pathname } = useLocation();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname === '/' && href.startsWith('#')) {
      e.preventDefault();
      setMobileOpen(false);
      const id = href.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-full bg-bg-primary text-white">

      {/* Fixed floating header — animated background layers sit behind the content */}
      <header className="fixed left-0 right-0 top-0 z-50">
        
        {/* Mobile Background (Opacity Fade) */}
        <div 
          className={`absolute inset-0 border-b border-white/[0.12] bg-white/[0.06] backdrop-blur-md transition-opacity duration-700 ease-in-out md:hidden ${
            isScrolled ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Desktop Expanding Background */}
        <div
          className={`absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 backdrop-blur-md transition-all duration-700 ease-in-out md:block ${
            isScrolled
              ? 'w-full h-[80px] rounded-none border-b border-white/[0.12] bg-white/[0.06]'
              : 'w-[380px] h-[52px] rounded-full border border-white/[0.12] bg-white/[0.06]'
          }`}
        />

        <div className="relative z-10 mx-auto flex h-20 max-w-container items-center justify-between px-6">

          {/* Logo — far left */}
          <Link
            to="/"
            aria-label="Storyuu home"
            className="relative z-10 shrink-0"
            onClick={() => setMobileOpen(false)}
          >
            <Logo variant="hori-tag" className="hidden h-12 md:block" />
            <Logo variant="mark" className="h-10 md:hidden" />
          </Link>

          {/* Desktop nav links — absolutely centered, no background itself */}
          <nav
            aria-label="Main navigation"
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 px-7 md:flex"
            style={{ height: '52px' }}
          >
            {NAV_LINKS.map(({ label, href }) => {
              const isActive = activeSection === href;

              return (
                <a
                  key={label}
                  href={href}
                  onClick={(e) => handleNavClick(e, href)}
                  className={`group relative flex items-center justify-center text-sm transition-colors duration-150 ${
                    isActive ? 'text-white font-medium' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {label}
                  {/* The active dot indicator */}
                  <span 
                    className={`absolute -bottom-2 left-1/2 h-[4px] w-[4px] -translate-x-1/2 rounded-full bg-brand-orange transition-all duration-300 ${
                      isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                    }`} 
                  />
                </a>
              );
            })}
          </nav>

          {/* Desktop right — Log In + Sign Up */}
          <div className="relative z-10 hidden items-center gap-5 md:flex">
            <Link
              to="/login"
              className="text-sm text-white/70 transition-colors duration-150 hover:text-white"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-brand-orange px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-orange-deep"
              style={{ boxShadow: '0 4px 16px rgba(255,135,80,0.28)' }}
            >
              Sign Up
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-white/80 backdrop-blur-md transition-colors hover:text-white md:hidden"
            onClick={() => setMobileOpen(p => !p)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <nav
            aria-label="Mobile navigation"
            className="border-t border-white/[0.08] bg-bg-primary/95 backdrop-blur-md md:hidden"
          >
            <div className="mx-auto max-w-container divide-y divide-white/[0.06] px-6">
              {NAV_LINKS.map(({ label, href }) =>
                href.startsWith('#') ? (
                  <a
                    key={label}
                    href={href}
                    className="block py-4 text-sm text-white/75 transition-colors hover:text-white"
                    onClick={() => setMobileOpen(false)}
                  >
                    {label}
                  </a>
                ) : (
                  <Link
                    key={label}
                    to={href}
                    className="block py-4 text-sm text-white/75 transition-colors hover:text-white"
                    onClick={() => setMobileOpen(false)}
                  >
                    {label}
                  </Link>
                )
              )}
              <div className="flex flex-col gap-3 py-5">
                <Link
                  to="/login"
                  className="btn-outlined w-full text-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="btn-primary-orange w-full text-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* pt-20 offsets fixed header for all non-hero pages */}
      <main className="pt-20">
        <Outlet />
      </main>

      {/* §4.3.7 Footer */}
      <footer className="border-t border-white/[0.08] bg-bg-primary py-14">
        <div className="mx-auto max-w-container px-6">
          <div className="grid gap-10 md:grid-cols-5">

            <div className="md:col-span-2">
              <Logo variant="hori-tag" />
              <p className="mt-3 text-body text-neutral-500">u direct. u connect.</p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">Product</h4>
              <ul className="mt-4 space-y-3 text-sm text-neutral-400">
                <li><a href="#how-it-works" className="transition-colors hover:text-white">How it works</a></li>
                <li><Link to="/channels" className="transition-colors hover:text-white">Channels</Link></li>
                <li><a href="#pricing" className="transition-colors hover:text-white">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">Legal</h4>
              <ul className="mt-4 space-y-3 text-sm text-neutral-400">
                <li><Link to="/legal/terms" className="transition-colors hover:text-white">Terms</Link></li>
                <li><Link to="/legal/privacy" className="transition-colors hover:text-white">Privacy</Link></li>
                <li><Link to="/legal/cookies" className="transition-colors hover:text-white">Cookies</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">Connect</h4>
              <ul className="mt-4 space-y-3 text-sm text-neutral-400">
                <li><a href="#" rel="noreferrer" className="transition-colors hover:text-white">Facebook</a></li>
                <li><a href="#" rel="noreferrer" className="transition-colors hover:text-white">Instagram</a></li>
                <li><a href="#" rel="noreferrer" className="transition-colors hover:text-white">Discord</a></li>
              </ul>
            </div>

          </div>
          <p className="mt-14 text-body text-neutral-600">
            © {new Date().getFullYear()} Storyuu, Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
