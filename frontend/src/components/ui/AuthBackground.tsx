import { Rocket, Star } from 'lucide-react';

// Static deterministic stars
const STARS = Array.from({ length: 50 }, (_, i) => ({
  cx: (i * 73 + 17) % 100,
  cy: (i * 57 + 23) % 100,
  r:  ((i * 13 + 7) % 5) * 0.22 + 0.22,
  op: ((i * 17 + 11) % 8) * 0.055 + 0.10,
}));

const NEBULAS = [
  { top: '-10%', left: '-10%', w: 500, h: 500, color: 'rgba(88,28,135,0.15)', blur: 60 },
  { top: '40%',  left: '60%',  w: 600, h: 600, color: 'rgba(7,194,239,0.12)', blur: 80 },
];

const PARTICLES = [
  { top: 20, left: 20, size: 2, delay: 0.5, dur: 4, cyan: true },
  { top: 70, left: 80, size: 1.5, delay: 1.2, dur: 3.5, cyan: false },
  { top: 40, left: 10, size: 2.5, delay: 0.8, dur: 5, cyan: false },
  { top: 85, left: 30, size: 2, delay: 2, dur: 4.5, cyan: true },
  { top: 15, left: 85, size: 1.5, delay: 0.2, dur: 3, cyan: false },
];

export default function AuthBackground({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}>
      {/* Base Stars */}
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full">
        {STARS.map((s, i) => (
          <circle key={i} cx={`${s.cx}%`} cy={`${s.cy}%`} r={s.r} fill="white" fillOpacity={s.op}/>
        ))}
      </svg>

      {/* Nebulas */}
      {NEBULAS.map((n, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            top: n.top, left: n.left,
            width: n.w, height: n.h,
            background: `radial-gradient(circle, ${n.color} 0%, transparent 70%)`,
            filter: `blur(${n.blur}px)`,
          }}
        />
      ))}

      {/* Twinkling Particles */}
      <div className="absolute inset-0" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              top: `${p.top}%`,
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.cyan ? '#07C2EF' : 'rgba(255,255,255,0.85)',
              animation: `twinkle ${p.dur}s ${p.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Floating Orbs */}
      <div
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          top: '20%', left: '15%',
          width: 120, height: 120,
          background: 'radial-gradient(circle, rgba(7,194,239,0.2) 0%, transparent 70%)',
          filter: 'blur(12px)',
          animation: 'orbFloat 12s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          top: '60%', right: '10%',
          width: 100, height: 100,
          background: 'radial-gradient(circle, rgba(255,135,80,0.15) 0%, transparent 70%)',
          filter: 'blur(10px)',
          animation: 'orbFloat 15s 2s ease-in-out infinite alternate',
        }}
      />

      {/* Hero elements (Rockets/Stars) */}
      <Rocket 
        size={32} 
        className="absolute opacity-80" 
        style={{ top: '15%', left: '80%', color: '#FF8750', transform: 'rotate(45deg)', animation: 'rocketFloat 8s ease-in-out infinite' }} 
      />
      <Star 
        size={24} 
        className="absolute opacity-60 fill-brand-cyan text-brand-cyan" 
        style={{ top: '75%', left: '15%', transform: 'rotate(-20deg)', animation: 'rocketFloat 10s ease-in-out infinite 1s' }} 
      />
    </div>
  );
}
