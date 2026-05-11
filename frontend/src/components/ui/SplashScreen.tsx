import { useState, useEffect } from 'react';
import { Rocket, Star } from 'lucide-react';
import Logo from './Logo';

interface SplashScreenProps {
  onComplete: () => void;
}

const SPLASH_ELEMENTS = [
  { type: 'rocket', top: 15, left: 15, size: 32, rotate: 45, delay: 0 },
  { type: 'star',   top: 25, left: 85, size: 24, rotate: 15, delay: 0.5 },
  { type: 'star',   top: 75, left: 20, size: 28, rotate: -15, delay: 1 },
  { type: 'rocket', top: 65, left: 80, size: 28, rotate: -45, delay: 0.2 },
  { type: 'star',   top: 85, left: 50, size: 20, rotate: 40, delay: 0.8 },
  { type: 'star',   top: 15, left: 55, size: 24, rotate: 10, delay: 1.5 },
] as const;

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Give it 1.5s of solid display, then 1s of fading out
    const fadeTimer = setTimeout(() => setIsFading(true), 1500);
    const completeTimer = setTimeout(() => onComplete(), 2500);
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bg-primary transition-opacity duration-1000 ease-in-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient glow matching the theme */}
      <div 
        className="absolute left-1/2 top-1/2 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-cyan/20 blur-[120px] transition-all duration-1000 animate-pulse" 
      />
      <div 
        className="absolute left-1/2 top-1/2 h-[200px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-orange/20 blur-[100px] transition-all duration-1000 animate-pulse delay-500" 
      />
      
      {/* Subtle floating particles for the splash */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/60"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `orbFloat ${3 + Math.random() * 4}s infinite ease-in-out alternate`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Themed Floating Decorations (Rockets, Stars, Humans) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {SPLASH_ELEMENTS.map((el, i) => (
          <div
            key={`decor-${i}`}
            className="absolute opacity-80"
            style={{
              top: `${el.top}%`,
              left: `${el.left}%`,
              animation: 'rocketFloat 6s ease-in-out infinite',
              animationDelay: `${el.delay}s`,
            }}
          >
            {el.type === 'rocket' ? (
              <Rocket size={el.size} style={{ color: '#FF8750', transform: `rotate(${el.rotate}deg)` }} />
            ) : (
              <Star size={el.size} className="fill-[#07C2EF] text-[#07C2EF]" style={{ transform: `rotate(${el.rotate}deg)` }} />
            )}
          </div>
        ))}
      </div>

      {/* Main Logo Container */}
      <div className="relative z-10 transition-transform duration-1000 ease-out" style={{ transform: isFading ? 'scale(1.1)' : 'scale(1)' }}>
        <Logo variant="hori-tag" className="h-16 drop-shadow-[0_0_24px_rgba(255,135,80,0.5)] md:h-20" />
      </div>
    </div>
  );
}
