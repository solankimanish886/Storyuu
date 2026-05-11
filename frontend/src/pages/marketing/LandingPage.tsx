import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Compass, BookOpen, RefreshCw,
  Star, ChevronLeft, ChevronRight,
  Check, Zap, ArrowUpRight, Rocket,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';

/**
 * §4 — Public marketing landing page.
 * Full implementation is Phase 6 (this stub establishes structure + section anchors).
 */

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface Cover {
  title: string;
  subtitle: string;
  episodes: string;
  bg: string;
  glow: string;
  bgGlow: string;
  accent: string;
  pattern: string;
}

const COVERS: Cover[] = [
  {
    title: 'The New York Montage',
    subtitle: 'Urban Thriller',
    episodes: '12 Eps',
    bg: 'linear-gradient(170deg, #162540 0%, #0c1a2e 40%, #060d18 80%, #040810 100%)',
    glow: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(74,139,255,0.55) 0%, transparent 70%)',
    bgGlow: 'rgba(74,139,255,0.20)',
    accent: '#4A8BFF',
    pattern: [
      'repeating-linear-gradient(0deg, rgba(74,139,255,0.04) 0px, rgba(74,139,255,0.04) 1px, transparent 1px, transparent 32px)',
      'repeating-linear-gradient(90deg, rgba(74,139,255,0.04) 0px, rgba(74,139,255,0.04) 1px, transparent 1px, transparent 32px)',
    ].join(', '),
  },
  {
    title: 'Echoes of Andromeda',
    subtitle: 'Sci-Fi',
    episodes: '18 Eps',
    bg: 'linear-gradient(170deg, #2c1060 0%, #170830 50%, #08041a 100%)',
    glow: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139,92,246,0.6) 0%, transparent 70%)',
    bgGlow: 'rgba(139,92,246,0.22)',
    accent: '#8B5CF6',
    pattern: [
      'radial-gradient(circle at 50% 35%, rgba(139,92,246,0.12) 0%, transparent 35%)',
      'radial-gradient(circle at 50% 35%, transparent 36%, rgba(139,92,246,0.08) 37%, transparent 38%)',
      'radial-gradient(circle at 50% 35%, transparent 48%, rgba(139,92,246,0.06) 49%, transparent 50%)',
    ].join(', '),
  },
  {
    title: 'Whispers in Code',
    subtitle: 'Mystery',
    episodes: '8 Eps',
    bg: 'linear-gradient(170deg, #0a2e2c 0%, #061c1a 50%, #030e0d 100%)',
    glow: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(20,184,166,0.55) 0%, transparent 70%)',
    bgGlow: 'rgba(20,184,166,0.18)',
    accent: '#14B8A6',
    pattern: 'repeating-linear-gradient(45deg, rgba(20,184,166,0.05) 0px, rgba(20,184,166,0.05) 1px, transparent 1px, transparent 14px)',
  },
  {
    title: 'Crimson Tide',
    subtitle: 'Drama',
    episodes: '22 Eps',
    bg: 'linear-gradient(170deg, #5a0e1c 0%, #360810 40%, #1a0408 80%, #0a0204 100%)',
    glow: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(239,68,100,0.75) 0%, transparent 70%)',
    bgGlow: 'rgba(239,68,100,0.22)',
    accent: '#EF4464',
    pattern: 'repeating-linear-gradient(160deg, rgba(239,68,100,0.05) 0px, rgba(239,68,100,0.05) 1px, transparent 1px, transparent 18px)',
  },
  {
    title: 'Last Light of Lyra',
    subtitle: 'Fantasy',
    episodes: '15 Eps',
    bg: 'linear-gradient(170deg, #2e1060 0%, #1a0838 50%, #08041e 100%)',
    glow: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(167,139,250,0.6) 0%, transparent 70%)',
    bgGlow: 'rgba(167,139,250,0.20)',
    accent: '#A78BFA',
    pattern: [
      'radial-gradient(circle at 50% 30%, rgba(167,139,250,0.10) 0%, transparent 30%)',
      'radial-gradient(circle at 30% 70%, rgba(167,139,250,0.06) 0%, transparent 25%)',
    ].join(', '),
  },
  {
    title: 'The Ninth Door',
    subtitle: 'Horror',
    episodes: '10 Eps',
    bg: 'linear-gradient(170deg, #0e2614 0%, #081608 50%, #030806 100%)',
    glow: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(74,222,128,0.45) 0%, transparent 70%)',
    bgGlow: 'rgba(74,222,128,0.15)',
    accent: '#4ADE80',
    pattern: 'repeating-linear-gradient(90deg, rgba(74,222,128,0.04) 0px, rgba(74,222,128,0.04) 1px, transparent 1px, transparent 20px)',
  },
  {
    title: 'The Midnight Ledger',
    subtitle: 'Noir Thriller',
    episodes: '16 Eps',
    bg: 'linear-gradient(170deg, #101838 0%, #08101e 50%, #04080e 100%)',
    glow: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(59,130,246,0.55) 0%, transparent 70%)',
    bgGlow: 'rgba(59,130,246,0.18)',
    accent: '#3B82F6',
    pattern: 'repeating-linear-gradient(180deg, rgba(59,130,246,0.04) 0px, rgba(59,130,246,0.04) 1px, transparent 1px, transparent 28px)',
  },
];

// Carousel slot configs keyed by signed relative position (-2 … +2)
const SLOT_CONFIGS: Record<string, { x: number; scale: number; rotate: number; opacity: number; z: number }> = {
  '-2': { x: -340, scale: 0.58, rotate: -16, opacity: 0.38, z: 1 },
  '-1': { x: -192, scale: 0.77, rotate:  -8, opacity: 0.68, z: 3 },
   '0': { x:    0, scale: 1.00, rotate:   0, opacity: 1.00, z: 5 },
   '1': { x:  192, scale: 0.77, rotate:   8, opacity: 0.68, z: 3 },
   '2': { x:  340, scale: 0.58, rotate:  16, opacity: 0.38, z: 1 },
};

interface Particle { top: number; left: number; size: number; delay: number; dur: number; cyan: boolean; }

const PARTICLES: Particle[] = [
  { top:  12, left:  7,  size: 2.5, delay: 0.0, dur: 6.0, cyan: false },
  { top:  28, left: 14,  size: 1.5, delay: 0.8, dur: 8.0, cyan: false },
  { top:  18, left: 82,  size: 2.0, delay: 0.4, dur: 7.0, cyan: true  },
  { top:  35, left: 90,  size: 1.5, delay: 1.2, dur: 9.0, cyan: false },
  { top:  60, left:  5,  size: 3.0, delay: 1.5, dur: 7.5, cyan: false },
  { top:  72, left: 18,  size: 1.5, delay: 2.0, dur: 8.5, cyan: false },
  { top:  55, left: 92,  size: 2.5, delay: 2.5, dur: 6.5, cyan: true  },
  { top:  80, left: 80,  size: 1.5, delay: 0.6, dur: 7.0, cyan: false },
  { top:  10, left: 48,  size: 1.5, delay: 3.0, dur: 9.0, cyan: true  },
  { top:  88, left: 55,  size: 2.0, delay: 1.8, dur: 6.0, cyan: false },
  { top:  42, left:  2,  size: 1.5, delay: 0.3, dur: 8.0, cyan: false },
  { top:  50, left: 97,  size: 2.0, delay: 2.2, dur: 7.5, cyan: false },
  { top:  22, left: 65,  size: 1.5, delay: 1.0, dur: 8.0, cyan: true  },
  { top:  68, left: 42,  size: 2.0, delay: 3.5, dur: 7.0, cyan: false },
  { top:  85, left: 28,  size: 1.5, delay: 0.9, dur: 6.5, cyan: false },
  { top:   5, left: 32,  size: 1.5, delay: 1.4, dur: 7.0, cyan: false },
  { top:  15, left: 58,  size: 2.0, delay: 2.6, dur: 8.0, cyan: true  },
  { top:  32, left: 73,  size: 1.5, delay: 0.5, dur: 6.5, cyan: false },
  { top:  45, left: 38,  size: 2.5, delay: 3.2, dur: 9.0, cyan: false },
  { top:  52, left: 62,  size: 1.5, delay: 1.7, dur: 7.5, cyan: true  },
  { top:  65, left: 28,  size: 2.0, delay: 0.2, dur: 8.5, cyan: false },
  { top:  78, left: 68,  size: 1.5, delay: 4.0, dur: 7.0, cyan: false },
  { top:  92, left: 12,  size: 2.0, delay: 2.8, dur: 6.0, cyan: false },
  { top:   8, left: 88,  size: 1.5, delay: 0.7, dur: 8.0, cyan: true  },
  { top:  20, left: 20,  size: 2.5, delay: 1.9, dur: 7.5, cyan: false },
  { top:  38, left: 48,  size: 1.5, delay: 3.8, dur: 9.0, cyan: false },
  { top:  48, left: 78,  size: 2.0, delay: 0.1, dur: 6.0, cyan: true  },
  { top:  62, left: 55,  size: 1.5, delay: 2.4, dur: 8.0, cyan: false },
  { top:  75, left: 35,  size: 2.0, delay: 1.1, dur: 7.0, cyan: false },
  { top:  90, left: 72,  size: 1.5, delay: 3.3, dur: 8.5, cyan: false },
  { top:   3, left: 15,  size: 1.5, delay: 4.5, dur: 7.0, cyan: true  },
  { top:  25, left: 88,  size: 2.0, delay: 0.6, dur: 6.5, cyan: false },
  { top:  70, left:  2,  size: 1.5, delay: 2.0, dur: 8.0, cyan: false },
  { top:  95, left: 88,  size: 2.0, delay: 1.3, dur: 7.5, cyan: true  },
  { top:  58, left: 44,  size: 1.5, delay: 0.4, dur: 6.0, cyan: false },
];

// Deterministic static star field (80 dots, no animation overhead)
const STARS = Array.from({ length: 80 }, (_, i) => ({
  cx: (i * 73 + 17) % 100,
  cy: (i * 57 + 23) % 100,
  r:  ((i * 13 + 7) % 5) * 0.22 + 0.22,
  op: ((i * 17 + 11) % 8) * 0.055 + 0.10,
}));

// Shooting stars: outer div rotates, inner div translates along that axis
const SHOOTING_STARS = [
  { top: 17, left:  6, delay:  4, dur: 2.2, rotate: -26 },
  { top: 36, left: 22, delay: 11, dur: 2.8, rotate: -20 },
  { top: 13, left: 62, delay: 18, dur: 2.5, rotate: -31 },
] as const;

interface Nebula { top: string; left: string; w: number; h: number; color: string; blur: number; }

const NEBULAS: Nebula[] = [
  { top: '-8%',  left: '-6%',  w: 440, h: 440, color: 'rgba(88,28,135,0.14)',  blur: 55 },
  { top: '-4%',  left: '68%',  w: 380, h: 380, color: 'rgba(7,194,239,0.08)',  blur: 60 },
  { top: '38%',  left: '-12%', w: 320, h: 320, color: 'rgba(255,135,80,0.07)', blur: 50 },
  { top: '54%',  left: '72%',  w: 360, h: 360, color: 'rgba(139,92,246,0.09)', blur: 55 },
];

const FLOATING_ELEMENTS = [
  // Hero & Logo cloud area (0-15%)
  { type: 'rocket', top: 5, left: 85, size: 24, rotate: -42, delay: 0 },
  { type: 'star', top: 8, left: 15, size: 18, rotate: 15, delay: 1 },
  { type: 'star', top: 12, left: 75, size: 20, rotate: -25, delay: 0.5 },
  // Features area (15-40%)
  { type: 'star', top: 18, left: 80, size: 22, rotate: 45, delay: 0.8 },
  { type: 'rocket', top: 25, left: 10, rotate: 60, size: 28, delay: 1.5 },
  { type: 'star', top: 32, left: 88, size: 16, rotate: -15, delay: 0.2 },
  { type: 'rocket', top: 38, left: 82, rotate: -20, size: 22, delay: 2 },
  // How it works area (40-60%)
  { type: 'star', top: 48, left: 20, size: 24, rotate: -30, delay: 0 },
  { type: 'rocket', top: 55, left: 12, rotate: 25, size: 26, delay: 1.2 },
  { type: 'star', top: 58, left: 85, size: 20, rotate: 10, delay: 2.5 },
  // Testimonials area (60-80%)
  { type: 'rocket', top: 68, left: 80, rotate: -55, size: 24, delay: 1 },
  { type: 'star', top: 72, left: 15, size: 18, rotate: 35, delay: 0.4 },
  { type: 'star', top: 78, left: 88, size: 22, rotate: -5, delay: 1.8 },
  // FAQ & CTA area (80-100%)
  { type: 'rocket', top: 85, left: 22, rotate: 40, size: 28, delay: 0.7 },
  { type: 'star', top: 92, left: 78, size: 20, rotate: 20, delay: 1.5 },
  { type: 'rocket', top: 98, left: 50, rotate: 0, size: 30, delay: 0 },
];

// ---------------------------------------------------------------------------
// Cover art — genre-specific SVG illustrations rendered inside each card
// ---------------------------------------------------------------------------

function getCoverArt(coverIndex: number, cover: Cover): React.ReactNode {
  const id = `ca${coverIndex}`;
  const a  = cover.accent;

  const style: React.CSSProperties = {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%',
    height: '62%',
    pointerEvents: 'none',
  };

  switch (coverIndex) {
    // ------------------------------------------------------------------
    // 0 · Urban Thriller — city skyline at night
    // ------------------------------------------------------------------
    case 0:
      return (
        <svg viewBox="0 0 200 124" style={style} aria-hidden="true">
          {/* Buildings */}
          <rect x="0"   y="62"  width="18" height="62" fill={`${a}44`}/>
          <rect x="12"  y="38"  width="9"  height="86" fill={`${a}62`}/>
          <rect x="28"  y="50"  width="22" height="74" fill={`${a}34`}/>
          <rect x="38"  y="26"  width="10" height="98" fill={`${a}66`}/>
          <rect x="57"  y="54"  width="14" height="70" fill={`${a}40`}/>
          <rect x="62"  y="32"  width="7"  height="92" fill={`${a}74`}/>
          <rect x="77"  y="66"  width="14" height="58" fill={`${a}30`}/>
          <rect x="94"  y="36"  width="16" height="88" fill={`${a}58`}/>
          <rect x="116" y="22"  width="12" height="102" fill={`${a}68`}/>
          <rect x="133" y="48"  width="20" height="76" fill={`${a}44`}/>
          <rect x="154" y="40"  width="14" height="84" fill={`${a}52`}/>
          <rect x="170" y="58"  width="18" height="66" fill={`${a}38`}/>
          {/* Window lights */}
          <rect x="14"  y="42" width="3" height="3" rx="0.5" fill="rgba(255,200,80,0.70)"/>
          <rect x="14"  y="50" width="3" height="3" rx="0.5" fill="rgba(255,200,80,0.48)"/>
          <rect x="40"  y="30" width="3" height="3" rx="0.5" fill="rgba(255,200,80,0.72)"/>
          <rect x="40"  y="38" width="3" height="3" rx="0.5" fill="rgba(255,200,80,0.50)"/>
          <rect x="63"  y="36" width="3" height="3" rx="0.5" fill="rgba(255,200,80,0.64)"/>
          <rect x="63"  y="44" width="3" height="3" rx="0.5" fill="rgba(255,200,80,0.42)"/>
          <rect x="96"  y="40" width="3" height="3" rx="0.5" fill="rgba(255,200,80,0.68)"/>
          <rect x="96"  y="48" width="3" height="3" rx="0.5" fill="rgba(255,200,80,0.46)"/>
          <rect x="118" y="26" width="3" height="3" rx="0.5" fill="rgba(255,200,80,0.75)"/>
          <rect x="118" y="34" width="3" height="3" rx="0.5" fill="rgba(255,200,80,0.55)"/>
          <rect x="156" y="44" width="3" height="3" rx="0.5" fill="rgba(255,200,80,0.58)"/>
          <rect x="172" y="62" width="3" height="3" rx="0.5" fill="rgba(255,200,80,0.44)"/>
          {/* Horizon glow */}
          <ellipse cx="100" cy="62" rx="150" ry="22" fill={`${a}10`}/>
        </svg>
      );

    // ------------------------------------------------------------------
    // 1 · Sci-Fi — planet with orbital ring
    // ------------------------------------------------------------------
    case 1:
      return (
        <svg viewBox="0 0 200 124" style={style} aria-hidden="true">
          {/* Background stars */}
          {([[22,12,1.2],[68,8,1.0],[150,16,1.5],[178,8,0.8],[15,55,1.0],[188,48,1.3],[8,90,0.9],[195,85,1.1]] as [number,number,number][]).map(([x,y,r],i)=>(
            <circle key={i} cx={x} cy={y} r={r} fill="white" fillOpacity={0.4+(i%3)*0.14}/>
          ))}
          <defs>
            <radialGradient id={`${id}-pg`} cx="36%" cy="34%">
              <stop offset="0%"   stopColor={a} stopOpacity="0.90"/>
              <stop offset="55%"  stopColor={a} stopOpacity="0.55"/>
              <stop offset="100%" stopColor={a} stopOpacity="0.18"/>
            </radialGradient>
          </defs>
          {/* Orbital ring — back half */}
          <ellipse cx="100" cy="66" rx="72" ry="13" fill="none" stroke={`${a}`} strokeOpacity="0.45" strokeWidth="6"/>
          {/* Planet body */}
          <circle cx="100" cy="66" r="42" fill={`url(#${id}-pg)`}/>
          {/* Atmosphere haze */}
          <circle cx="100" cy="66" r="46" fill="none" stroke={a} strokeOpacity="0.20" strokeWidth="4"/>
          {/* Surface bands */}
          <path d="M64 58 Q82 52 102 58 Q122 64 138 58" stroke="rgba(255,255,255,0.14)" strokeWidth="2" fill="none"/>
          <path d="M66 72 Q84 67 104 73 Q124 79 140 72" stroke="rgba(255,255,255,0.09)" strokeWidth="1.5" fill="none"/>
          {/* Orbital ring — front half */}
          <path d={`M28 66 Q100 80 172 66`} stroke={a} strokeOpacity="0.60" strokeWidth="6" fill="none"/>
        </svg>
      );

    // ------------------------------------------------------------------
    // 2 · Mystery — circuit-board eye
    // ------------------------------------------------------------------
    case 2:
      return (
        <svg viewBox="0 0 200 124" style={style} aria-hidden="true">
          {/* Circuit lines */}
          {([[0,62,50,62],[150,62,200,62],[100,0,100,28],[100,96,100,124],[50,62,40,44],[50,62,40,80],[150,62,160,44],[150,62,160,80]] as [number,number,number,number][]).map(([x1,y1,x2,y2],i)=>(
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={a} strokeOpacity="0.30" strokeWidth="1.2"/>
          ))}
          {/* Circuit nodes */}
          {([[50,62],[150,62],[100,28],[100,96],[40,44],[40,80],[160,44],[160,80]] as [number,number][]).map(([cx,cy],i)=>(
            <circle key={i} cx={cx} cy={cy} r="3" fill={a} fillOpacity="0.55"/>
          ))}
          {/* Eye white */}
          <path d="M24 62 Q100 18 176 62 Q100 106 24 62Z" fill={a} fillOpacity="0.08" stroke={a} strokeOpacity="0.48" strokeWidth="1.4"/>
          {/* Iris */}
          <circle cx="100" cy="62" r="28" fill={a} fillOpacity="0.14" stroke={a} strokeOpacity="0.52" strokeWidth="1.4"/>
          {/* Pupil */}
          <circle cx="100" cy="62" r="17" fill={a} fillOpacity="0.22" stroke={a} strokeOpacity="0.62" strokeWidth="1.2"/>
          {/* Centre glow */}
          <circle cx="100" cy="62" r="8"  fill={a} fillOpacity="0.65"/>
          {/* Catch light */}
          <circle cx="105" cy="58" r="2.8" fill="white" fillOpacity="0.85"/>
          {/* Binary hints */}
          <text x="22" y="38" fontSize="6.5" fill={a} fillOpacity="0.25" fontFamily="monospace">10110011</text>
          <text x="128" y="96" fontSize="6.5" fill={a} fillOpacity="0.20" fontFamily="monospace">01001101</text>
        </svg>
      );

    // ------------------------------------------------------------------
    // 3 · Drama — two silhouettes, dramatic back-light
    // ------------------------------------------------------------------
    case 3:
      return (
        <svg viewBox="0 0 200 124" style={style} aria-hidden="true">
          <defs>
            <radialGradient id={`${id}-dg`} cx="50%" cy="100%">
              <stop offset="0%"   stopColor={a} stopOpacity="0.28"/>
              <stop offset="100%" stopColor={a} stopOpacity="0.00"/>
            </radialGradient>
          </defs>
          {/* Ground glow */}
          <ellipse cx="100" cy="124" rx="150" ry="62" fill={`url(#${id}-dg)`}/>
          {/* Horizon line */}
          <line x1="0" y1="96" x2="200" y2="96" stroke={a} strokeOpacity="0.32" strokeWidth="1"/>
          {/* Light beams from below */}
          <path d="M100 96 L55 0"  stroke={a} strokeOpacity="0.06" strokeWidth="38" strokeLinecap="round"/>
          <path d="M100 96 L145 0" stroke={a} strokeOpacity="0.06" strokeWidth="38" strokeLinecap="round"/>
          {/* Left figure */}
          <ellipse cx="62" cy="72" rx="11" ry="13" fill={a} fillOpacity="0.55"/>
          <path d="M51 85 Q62 77 73 85 L76 124 H48Z" fill={a} fillOpacity="0.50"/>
          {/* Right figure */}
          <ellipse cx="138" cy="72" rx="11" ry="13" fill={a} fillOpacity="0.55"/>
          <path d="M127 85 Q138 77 149 85 L152 124 H124Z" fill={a} fillOpacity="0.50"/>
          {/* Tension line between them */}
          <line x1="73" y1="73" x2="127" y2="73" stroke={a} strokeOpacity="0.42" strokeWidth="1" strokeDasharray="4,3"/>
        </svg>
      );

    // ------------------------------------------------------------------
    // 4 · Fantasy — crescent moon with scattered stars
    // ------------------------------------------------------------------
    case 4:
      return (
        <svg viewBox="0 0 200 124" style={style} aria-hidden="true">
          {/* Stars */}
          {([[22,18,1.8,0.82],[58,10,1.2,0.65],[105,14,1.5,0.72],[158,20,1.0,0.58],[180,10,1.4,0.70],[30,46,0.9,0.48],[188,52,1.1,0.60],[12,82,1.3,0.55]] as [number,number,number,number][]).map(([x,y,r,o],i)=>(
            <circle key={i} cx={x} cy={y} r={r} fill="white" fillOpacity={o}/>
          ))}
          {/* Sparkle cross */}
          <path d="M42 70 L44 64 L46 70 L44 76Z" fill={a} fillOpacity="0.90"/>
          <line x1="44" y1="66" x2="44" y2="74" stroke={a} strokeOpacity="0.60" strokeWidth="0.8"/>
          <line x1="41" y1="70" x2="47" y2="70" stroke={a} strokeOpacity="0.60" strokeWidth="0.8"/>
          <defs>
            <clipPath id={`${id}-mc`}>
              <circle cx="112" cy="66" r="48"/>
            </clipPath>
          </defs>
          {/* Moon body */}
          <circle cx="112" cy="66" r="48" fill={a} fillOpacity="0.68"/>
          {/* Crescent cut — clipped to stay inside moon */}
          <circle cx="128" cy="60" r="44" fill="#1a0838" fillOpacity="0.92" clipPath={`url(#${id}-mc)`}/>
          {/* Moon craters */}
          <circle cx="90"  cy="56" r="7" fill={a} fillOpacity="0.15" stroke={a} strokeOpacity="0.20" strokeWidth="1"/>
          <circle cx="102" cy="72" r="4" fill={a} fillOpacity="0.12"/>
          {/* Outer glow ring */}
          <circle cx="112" cy="66" r="52" fill="none" stroke={a} strokeOpacity="0.16" strokeWidth="4"/>
        </svg>
      );

    // ------------------------------------------------------------------
    // 5 · Horror — ajar door with eerie green glow
    // ------------------------------------------------------------------
    case 5:
      return (
        <svg viewBox="0 0 200 124" style={style} aria-hidden="true">
          {/* Floor */}
          <rect x="0" y="108" width="200" height="16" fill={a} fillOpacity="0.06"/>
          {/* Floor light spill */}
          <path d="M116 108 L148 124 L78 124Z" fill={a} fillOpacity="0.10"/>
          {/* Door frame */}
          <rect x="62" y="18" width="76" height="90" rx="2" fill={a} fillOpacity="0.06" stroke={a} strokeOpacity="0.22" strokeWidth="2"/>
          {/* Door panel (skewed open) */}
          <path d="M70 20 L70 106 L112 106 L122 20Z" fill="rgba(3,8,6,0.78)" stroke={a} strokeOpacity="0.16" strokeWidth="1.2"/>
          {/* Light crack at edge */}
          <rect x="112" y="20" width="3" height="86" fill={a} fillOpacity="0.72"/>
          {/* Glow spill behind door */}
          <path d="M115 22 L138 38 L138 96 L115 106Z" fill={a} fillOpacity="0.07"/>
          {/* Door inset panels */}
          <rect x="74"  y="34" width="32" height="30" rx="2" fill={a} fillOpacity="0.06" stroke={a} strokeOpacity="0.14" strokeWidth="1"/>
          <rect x="74"  y="72" width="32" height="26" rx="2" fill={a} fillOpacity="0.06" stroke={a} strokeOpacity="0.14" strokeWidth="1"/>
          {/* Handle */}
          <circle cx="104" cy="66" r="5" fill={a} fillOpacity="0.38" stroke={a} strokeOpacity="0.55" strokeWidth="1.2"/>
          {/* Eye peeking through gap */}
          <ellipse cx="122" cy="63" rx="5" ry="3.5" fill={a} fillOpacity="0.78"/>
          <circle  cx="122" cy="63" r="2"  fill={a} fillOpacity="1.00"/>
          {/* Shadow on floor */}
          <ellipse cx="96" cy="110" rx="30" ry="5" fill="rgba(0,0,0,0.40)"/>
        </svg>
      );

    // ------------------------------------------------------------------
    // 6 · Noir Thriller — rainy street with lone figure
    // ------------------------------------------------------------------
    default:
      return (
        <svg viewBox="0 0 200 124" style={style} aria-hidden="true">
          {/* Rain streaks */}
          {Array.from({ length: 22 }, (_, i) => {
            const x = (i * 17 + 5) % 192;
            const y = (i * 23 + 8) % 96;
            return <line key={i} x1={x} y1={y} x2={x - 4} y2={y + 16} stroke={a} strokeOpacity="0.18" strokeWidth="1" strokeLinecap="round"/>;
          })}
          {/* Lamp post */}
          <rect x="152" y="28" width="5" height="96" fill={a} fillOpacity="0.28"/>
          <rect x="142" y="28" width="20" height="5" rx="2" fill={a} fillOpacity="0.42"/>
          {/* Lamp glow */}
          <ellipse cx="152" cy="31" rx="34" ry="22" fill={a} fillOpacity="0.08"/>
          <ellipse cx="152" cy="31" rx="18" ry="12" fill={a} fillOpacity="0.14"/>
          {/* Puddle reflection */}
          <ellipse cx="96" cy="118" rx="78" ry="5" fill={a} fillOpacity="0.10"/>
          {/* Silhouette — head */}
          <ellipse cx="82" cy="76" rx="10" ry="12" fill={a} fillOpacity="0.52"/>
          {/* Hat */}
          <rect x="73" y="65" width="20" height="5" rx="2.5" fill={a} fillOpacity="0.68"/>
          <rect x="77" y="56" width="12" height="10" rx="1.5" fill={a} fillOpacity="0.62"/>
          {/* Coat body */}
          <path d="M72 88 Q82 80 92 88 L95 124 H69Z" fill={a} fillOpacity="0.48"/>
          {/* Coat lapels */}
          <path d="M72 96 L62 114" stroke={a} strokeOpacity="0.42" strokeWidth="9"  strokeLinecap="round"/>
          <path d="M92 96 L96 114" stroke={a} strokeOpacity="0.42" strokeWidth="9"  strokeLinecap="round"/>
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Remaining data (unchanged)
// ---------------------------------------------------------------------------

const HOW_IT_WORKS = [
  {
    step: '01',
    Icon: Compass,
    title: 'Discover Stories',
    body: 'Browse curated serialized fiction across every genre — from slow-burn romance to pulse-racing thrillers. Find your next obsession in seconds.',
  },
  {
    step: '02',
    Icon: BookOpen,
    title: 'Read or Listen',
    body: 'Every episode ships in two formats. A beautiful custom reader for quiet moments, premium narration for everywhere else.',
  },
  {
    step: '03',
    Icon: RefreshCw,
    title: 'Continue Anytime',
    body: 'Progress syncs across all devices. Pick up where you left off, cast your vote, and help shape what comes next.',
  },
] as const;

const TESTIMONIALS = [
  {
    id: 0,
    name: 'Sarah M.',
    initials: 'SM',
    avatarClass: 'bg-brand-cyan/15 text-brand-cyan',
    review:
      "I've never felt so connected to a story before. Voting on what happens next makes every episode feel personal — like the story genuinely belongs to me.",
    rating: 5,
  },
  {
    id: 1,
    name: 'James R.',
    initials: 'JR',
    avatarClass: 'bg-brand-orange/15 text-brand-orange',
    review:
      'The audio narration is phenomenal. I listen during my commute and the cliffhangers keep me hooked every single episode. Genuinely dangerous for productivity.',
    rating: 5,
  },
  {
    id: 2,
    name: 'Priya K.',
    initials: 'PK',
    avatarClass: 'bg-purple-500/15 text-purple-400',
    review:
      "Storyuu turned me back into a reader. The episodes are the perfect length — I finish one on my lunch break and I'm always left wanting more.",
    rating: 5,
  },
  {
    id: 3,
    name: 'Daniel W.',
    initials: 'DW',
    avatarClass: 'bg-emerald-500/15 text-emerald-400',
    review:
      "When the community voted for the exact plot twist I wanted — I actually screamed. I've never felt so seen by a story. This platform just gets it.",
    rating: 5,
  },
] as const;

// Pricing — placeholder amounts; confirm final figures before launch.
const PLAN_FEATURES = [
  'Unlimited episode access',
  'Read & Listen every episode',
  'Vote to shape storylines',
  'Sync across all your devices',
  'New episodes every week',
  'Community profile & badges',
] as const;

const PRICING_PLANS = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$15.00',
    period: 'per month',
    perMonthNote: null,
    savings: null,
    description: 'Full access, billed monthly. Cancel anytime.',
    badge: null,
    highlighted: false,
    ctaLabel: 'Get Started',
    href: '/signup?plan=monthly',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$150.00',
    period: 'per year',
    perMonthNote: 'Just $12.50 / month',
    savings: 'Save 17%',
    description: 'Best value for committed readers. Two months on us.',
    badge: 'Most Popular',
    highlighted: true,
    ctaLabel: 'Get Started',
    href: '/signup?plan=yearly',
  },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LandingPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [heroIndex, setHeroIndex] = useState(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  const handlePlanSelect = async (plan: 'monthly' | 'yearly') => {
    if (!user) {
      navigate(`/signup?plan=${plan}`);
      return;
    }

    try {
      const { data } = await api.post<{ url: string }>('/subscriptions/checkout', { plan });
      window.location.href = data.url;
    } catch (err) {
      console.error('Failed to initiate checkout:', err);
    }
  };

  // Hero carousel — auto-advances every 3.8 s
  useEffect(() => {
    const t = setInterval(() => setHeroIndex(p => (p + 1) % COVERS.length), 3800);
    return () => clearInterval(t);
  }, []);

  // Testimonials — continuous advance, independent of manual navigation
  useEffect(() => {
    const t = setInterval(() => setTestimonialIndex(p => (p + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const prevTestimonial = () => setTestimonialIndex(p => (p - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const nextTestimonial = () => setTestimonialIndex(p => (p + 1) % TESTIMONIALS.length);

  const activeCover = COVERS[heroIndex];

  return (
    <div className="relative w-full overflow-hidden text-white" style={{ background: 'transparent' }}>
      
      {/* ================================================================== */}
      {/* GLOBAL SPACE BACKGROUND                                              */}
      {/* ================================================================== */}
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 0 }}>
        {/* ---- Layer 1: static star field (SVG, no DOM overhead per star) ---- */}
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full" style={{ zIndex: 0 }}>
          {STARS.map((s, i) => (
            <circle key={i} cx={`${s.cx}%`} cy={`${s.cy}%`} r={s.r} fill="white" fillOpacity={s.op}/>
          ))}
        </svg>

        {/* ---- Layer 2: nebula colour clouds ---- */}
        {NEBULAS.map((n, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="absolute"
            style={{
              top: n.top, left: n.left,
              width: n.w, height: n.h,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${n.color} 0%, transparent 70%)`,
              filter: `blur(${n.blur}px)`,
              zIndex: 0,
            }}
          />
        ))}

        {/* ---- Layer 4: twinkling large particles ---- */}
        <div className="absolute inset-0" aria-hidden="true" style={{ zIndex: 1 }}>
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${p.top}%`,
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                borderRadius: '50%',
                background: p.cyan ? '#07C2EF' : 'rgba(255,255,255,0.85)',
                animation: `twinkle ${p.dur}s ${p.delay}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>

        {/* ---- Layer 5: shooting stars ---- */}
        <div className="absolute inset-0" aria-hidden="true" style={{ zIndex: 2 }}>
          {SHOOTING_STARS.map((s, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${s.top}%`,
                left: `${s.left}%`,
                transform: `rotate(${s.rotate}deg)`,
                transformOrigin: 'left center',
              }}
            >
              <div
                style={{
                  width: 130,
                  height: 1.5,
                  borderRadius: 1,
                  background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.88) 45%, rgba(255,255,255,0.60) 72%, transparent 100%)',
                  animation: `shootStar ${s.dur}s ${s.delay}s ease-in infinite`,
                  opacity: 0,
                }}
              />
            </div>
          ))}
        </div>

        {/* ---- Layer 6: ambient floating orbs ---- */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: '42%', left: '5%',
            width: 90, height: 90, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(7,194,239,0.22) 0%, transparent 70%)',
            filter: 'blur(10px)',
            animation: 'orbFloat 10s ease-in-out infinite',
            zIndex: 2,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: '28%', right: '7%',
            width: 70, height: 70, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,135,80,0.18) 0%, transparent 70%)',
            filter: 'blur(8px)',
            animation: 'orbFloat 12s 3s ease-in-out infinite',
            zIndex: 2,
          }}
        />
      </div>

      {/* ================================================================== */}
      {/* GLOBAL SCROLLING DECORATIONS (Rockets & Stars)                     */}
      {/* ================================================================== */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={{ zIndex: 1 }}>
        {FLOATING_ELEMENTS.map((el, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${el.top}%`,
              left: `${el.left}%`,
              animation: 'rocketFloat 8s ease-in-out infinite',
              animationDelay: `${el.delay}s`,
              opacity: 0.60,
            }}
          >
            {el.type === 'rocket' ? (
              <Rocket size={el.size} style={{ color: '#FF8750', transform: `rotate(${el.rotate}deg)` }} />
            ) : (
              <Star size={el.size} style={{ color: '#07C2EF', transform: `rotate(${el.rotate}deg)` }} />
            )}
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* §4.3.2 Hero — galaxy background + animated story carousel          */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative -mt-20 min-h-screen overflow-hidden">
        {/* ---- Layer 3: dynamic story glow (opacity-transitions on card change) ---- */}
        {COVERS.map((cover, i) => (
          <div
            key={cover.title}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 900px 620px at 50% 62%, ${cover.bgGlow} 0%, transparent 80%)`,
              opacity: i === heroIndex ? 1 : 0,
              transition: 'opacity 1.2s ease-in-out',
              zIndex: 1,
            }}
          />
        ))}

        {/* ---- Content column ---- */}
        <div className="relative flex flex-col items-center px-6 pt-36 pb-20" style={{ zIndex: 10, maxWidth: 1280, margin: '0 auto' }}>


          {/* Platform badge */}
          <div
            className="mb-6 animate-fade-in-up delay-100 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
            style={{
              borderColor: 'rgba(7,194,239,0.30)',
              background: 'rgba(7,194,239,0.07)',
              color: '#07C2EF',
            }}
          >
            <span
              className="animate-pulse-glow"
              style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#07C2EF' }}
            />
            Serialized Fiction Platform
          </div>

          {/* Headline */}
          <h1
            className="max-w-[800px] animate-fade-in-up delay-200 text-center font-display italic text-white"
            style={{
              fontSize: 'clamp(40px, 5.5vw, 68px)',
              lineHeight: 1.1,
              fontWeight: 400,
              textShadow: '0 2px 40px rgba(0,0,0,0.7)',
            }}
          >
            Stories You Read.{' '}
            <span style={{ opacity: 0.92 }}>Stories You Shape.</span>
          </h1>

          {/* Sub-headline */}
          <p
            className="mt-5 max-w-xl animate-fade-in-up delay-300 text-center text-neutral-400"
            style={{ fontSize: '16px', lineHeight: 1.7 }}
          >
            Premium serialized fiction with a twist — you vote on what happens next.
            New episodes every week.
          </p>

          {/* CTA row */}
          <div className="mt-9 animate-fade-in-up delay-400 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-medium text-white"
              style={{
                background: 'linear-gradient(135deg, #FF7A3D 0%, #FF8F5A 100%)',
                boxShadow: '0 8px 24px rgba(255,122,61,0.38)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = 'scale(1.04)';
                el.style.boxShadow = '0 12px 32px rgba(255,122,61,0.55)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = 'scale(1)';
                el.style.boxShadow = '0 8px 24px rgba(255,122,61,0.38)';
              }}
            >
              Get Started <ArrowUpRight size={16} strokeWidth={2.5} />
            </Link>
            <Link
              to="/channels"
              className="inline-flex items-center gap-2 rounded-full border px-7 py-3.5 text-[15px] font-medium text-white backdrop-blur-sm"
              style={{
                borderColor: 'rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.05)',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.10)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)';
              }}
            >
              Browse Stories <ArrowUpRight size={16} strokeWidth={2.5} />
            </Link>
          </div>

          {/* ---- Carousel ---- */}
          {/*
            Cards are absolutely centred in the container then offset by translateX.
            Negative margins equal half-card size so the card's visual centre sits
            at 50% / 50% of the container before any transform is applied.
          */}
          <div
            className="relative mt-14 w-full"
            style={{ height: 400, maxWidth: 900, overflow: 'hidden' }}
          >
            {/* Left nav */}
            <button
              type="button"
              onClick={() => setHeroIndex(p => (p - 1 + COVERS.length) % COVERS.length)}
              aria-label="Previous story"
              className="focus:outline-none"
              style={{
                position: 'absolute', top: '50%', left: 0,
                transform: 'translateY(-50%)', zIndex: 20,
                width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'rgba(255,255,255,0.60)',
                cursor: 'pointer',
                transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'rgba(255,255,255,0.12)';
                el.style.borderColor = 'rgba(255,255,255,0.28)';
                el.style.color = 'white';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'rgba(255,255,255,0.06)';
                el.style.borderColor = 'rgba(255,255,255,0.14)';
                el.style.color = 'rgba(255,255,255,0.60)';
              }}
            >
              <ChevronLeft size={18} />
            </button>

            {/* Right nav */}
            <button
              type="button"
              onClick={() => setHeroIndex(p => (p + 1) % COVERS.length)}
              aria-label="Next story"
              className="focus:outline-none"
              style={{
                position: 'absolute', top: '50%', right: 0,
                transform: 'translateY(-50%)', zIndex: 20,
                width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'rgba(255,255,255,0.60)',
                cursor: 'pointer',
                transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'rgba(255,255,255,0.12)';
                el.style.borderColor = 'rgba(255,255,255,0.28)';
                el.style.color = 'white';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'rgba(255,255,255,0.06)';
                el.style.borderColor = 'rgba(255,255,255,0.14)';
                el.style.color = 'rgba(255,255,255,0.60)';
              }}
            >
              <ChevronRight size={18} />
            </button>

            {/* Story cards */}
            {COVERS.map((cover, i) => {
              let pos = ((i - heroIndex) % COVERS.length + COVERS.length) % COVERS.length;
              if (pos > 3) pos -= COVERS.length;

              const slot = SLOT_CONFIGS[pos.toString()];
              if (!slot) return null;

              const isActive = pos === 0;

              return (
                <div
                  key={cover.title}
                  onClick={() => { if (!isActive) setHeroIndex(i); }}
                  style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    marginTop: '-140px', marginLeft: '-100px',
                    width: '200px', height: '280px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: isActive ? 'default' : 'pointer',
                    transform: `translateX(${slot.x}px) scale(${slot.scale}) rotate(${slot.rotate}deg)`,
                    opacity: slot.opacity,
                    zIndex: slot.z,
                    transition: 'transform 0.65s cubic-bezier(0.34, 1.2, 0.64, 1), opacity 0.65s ease, box-shadow 0.4s ease',
                    background: cover.bg,
                    border: isActive
                      ? `1px solid ${cover.accent}55`
                      : '1px solid rgba(255,255,255,0.07)',
                    boxShadow: isActive
                      ? `0 20px 60px rgba(0,0,0,0.70), 0 0 40px ${cover.accent}22`
                      : '0 14px 36px rgba(0,0,0,0.55)',
                  }}
                >
                  {/* Genre-specific SVG illustration — upper portion */}
                  {getCoverArt(i, cover)}

                  {/* Genre-tinted texture pattern */}
                  <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: cover.pattern }}/>

                  {/* Colour glow from top */}
                  <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: cover.glow }}/>

                  {/* Glossy sheen — physical book-cover feel */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '38%',
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.055) 0%, transparent 100%)',
                    }}
                  />

                  {/* Bottom fade for text legibility */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.10) 52%, transparent 100%)',
                    }}
                  />

                  {/* Genre badge — top-left */}
                  <div
                    style={{
                      position: 'absolute', top: 10, left: 10,
                      padding: '3px 7px', borderRadius: 4,
                      background: `${cover.accent}22`,
                      border: `1px solid ${cover.accent}40`,
                      color: cover.accent,
                      fontSize: 8, fontWeight: 700,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.08em',
                      fontFamily: 'Raleway, sans-serif',
                    }}
                  >
                    {cover.subtitle}
                  </div>

                  {/* Title + episode count */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 12px' }}>
                    <p style={{ fontFamily: 'Raleway, sans-serif', fontSize: 12, fontWeight: 700, color: 'white', lineHeight: 1.35, marginBottom: 4 }}>
                      {cover.title}
                    </p>
                    <p style={{ fontFamily: 'Raleway, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>
                      {cover.episodes}
                    </p>
                  </div>

                  {/* Active card: pulsing accent border */}
                  {isActive && (
                    <div
                      aria-hidden="true"
                      className="animate-pulse-glow"
                      style={{
                        position: 'absolute', inset: 0, borderRadius: 16,
                        border: `1.5px solid ${cover.accent}75`,
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Active story label — key forces remount → re-triggers fade-in */}
          <div key={`hero-label-${heroIndex}`} className="mt-5 animate-fade-in-up text-center">
            <p className="font-display italic text-white" style={{ fontSize: '20px', fontWeight: 400 }}>
              {activeCover.title}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: activeCover.accent }}>
              {activeCover.subtitle}&nbsp;&middot;&nbsp;{activeCover.episodes}
            </p>
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* §4.3.3 How It Works                                                */}
      {/* ------------------------------------------------------------------ */}
      <section id="how-it-works" className="bg-bg-primary py-24">
        <div className="mx-auto max-w-container px-6">

          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-cyan">How it works</p>
            <h2 className="mt-3 text-display-l text-white">Your story starts here.</h2>
            <p className="mx-auto mt-4 max-w-lg text-subheading text-neutral-400">
              Three simple steps to a reading experience crafted entirely around you.
            </p>
          </div>

          <div className="relative mt-16">
            {/* Connecting line (desktop) */}
            <div
              className="absolute left-[20%] right-[20%] hidden h-px md:block"
              style={{
                top: '5.25rem',
                background: 'linear-gradient(to right, transparent, #2a2a38 18%, #2a2a38 82%, transparent)',
              }}
              aria-hidden="true"
            />

            <div className="grid gap-12 md:grid-cols-3">
              {HOW_IT_WORKS.map(({ step, Icon, title, body }) => (
                <div key={step} className="group flex flex-col items-center text-center">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-cyan/55">{step}</p>
                  <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-border-subtle bg-bg-surface shadow-card-dark transition-all duration-300 group-hover:border-brand-cyan/40 group-hover:shadow-[0_0_28px_rgba(7,194,239,0.15)]">
                    <Icon
                      size={32}
                      strokeWidth={1.5}
                      className="text-brand-cyan transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <h3 className="text-display-s text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-neutral-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* §4.3.4 Testimonials                                                */}
      {/* ------------------------------------------------------------------ */}
      <section id="testimonials" className="relative overflow-hidden bg-bg-surface py-24">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-80 w-[640px] -translate-x-1/2 rounded-full bg-brand-cyan/5 blur-[100px]"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-container px-6">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-cyan">Reader stories</p>
            <h2 className="mt-3 text-display-l text-white">The community speaks.</h2>
            <p className="mx-auto mt-4 max-w-lg text-subheading text-neutral-400">
              Real readers, real stories, real impact.
            </p>
          </div>

          <div className="relative mt-12">
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${testimonialIndex * 100}%)` }}
              >
                {TESTIMONIALS.map(t => (
                  <div key={t.id} className="min-w-full px-2 md:px-20">
                    <div className="mx-auto max-w-2xl rounded-lg border border-border-subtle bg-bg-primary p-8 shadow-card-dark md:p-12">
                      <div className="flex gap-1">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star key={i} size={16} className="fill-brand-orange text-brand-orange" />
                        ))}
                      </div>
                      <blockquote className="mt-5 text-lg leading-7 text-white md:text-xl md:leading-8">
                        &ldquo;{t.review}&rdquo;
                      </blockquote>
                      <div className="mt-8 flex items-center gap-4">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${t.avatarClass}`}>
                          {t.initials}
                        </div>
                        <div>
                          <p className="font-bold text-white">{t.name}</p>
                          <p className="text-xs text-neutral-500">Verified Reader</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={prevTestimonial}
                aria-label="Previous testimonial"
                className="rounded-full border border-border-subtle p-2 text-neutral-400 transition-all hover:border-brand-cyan hover:text-brand-cyan hover:shadow-[0_0_12px_rgba(7,194,239,0.2)]"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-2">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTestimonialIndex(i)}
                    aria-label={`Testimonial ${i + 1}`}
                    className={`rounded-full transition-all duration-300 ${
                      i === testimonialIndex ? 'h-2 w-6 bg-brand-cyan' : 'h-2 w-2 bg-border-subtle hover:bg-neutral-500'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={nextTestimonial}
                aria-label="Next testimonial"
                className="rounded-full border border-border-subtle p-2 text-neutral-400 transition-all hover:border-brand-cyan hover:text-brand-cyan hover:shadow-[0_0_12px_rgba(7,194,239,0.2)]"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* §4.3.5 Pricing                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section id="pricing" className="relative overflow-hidden bg-bg-primary py-24">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-brand-cyan/4 blur-[120px]"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-container px-6" style={{ zIndex: 10 }}>

          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-cyan">Pricing</p>
            <h2 className="mt-3 text-display-l text-white">Simple, honest pricing.</h2>
            <p className="mx-auto mt-4 max-w-lg text-subheading text-neutral-400">
              One plan, two billing options. Everything included, no hidden tiers.
            </p>
          </div>

          {/* Founding member highlight strip */}
          <div className="mx-auto mt-10 flex flex-col md:flex-row max-w-2xl items-center justify-between gap-4 rounded-lg border border-brand-orange/30 bg-brand-orange/8 px-6 py-5 md:py-4">
            <div className="flex items-center gap-3 text-center md:text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/20 text-brand-orange">
                <Zap size={16} strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Founding Member Offer</p>
                <p className="text-xs text-neutral-400">First 1,000 sign-ups get 6 months completely free — no card needed.</p>
              </div>
            </div>
            <Link
              to="/signup?utm_source=pricing_founding"
              className="btn-primary-orange shrink-0 text-sm w-full md:w-auto text-center"
              style={{ padding: '10px 20px', minHeight: '40px' }}
            >
              Claim free access
            </Link>
          </div>

          {/* Pricing cards */}
          <div className="mx-auto mt-10 grid max-w-3xl gap-6 md:grid-cols-2">
            {PRICING_PLANS.map(plan => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-lg border p-8 transition-all duration-300 ${
                  plan.highlighted
                    ? 'border-brand-cyan/50 bg-bg-surface shadow-[0_0_40px_rgba(7,194,239,0.1)] hover:shadow-[0_0_56px_rgba(7,194,239,0.18)]'
                    : 'border-border-subtle bg-bg-surface shadow-card-dark hover:border-neutral-700'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-cyan px-4 py-1 text-[11px] font-bold uppercase tracking-widest text-black">
                    {plan.badge}
                  </span>
                )}

                <p className={`text-sm font-bold uppercase tracking-widest ${plan.highlighted ? 'text-brand-cyan' : 'text-neutral-400'}`}>
                  {plan.name}
                </p>

                <div className="mt-4 flex items-end gap-1.5">
                  <span className="text-[44px] font-bold leading-none text-white">{plan.price}</span>
                  <span className="mb-1.5 text-sm text-neutral-500">{plan.period}</span>
                </div>

                <div className="mt-2 flex min-h-[24px] items-center gap-2">
                  {plan.perMonthNote && (
                    <span className="text-sm text-neutral-400">{plan.perMonthNote}</span>
                  )}
                  {plan.savings && (
                    <span className="rounded-full bg-brand-cyan/15 px-2.5 py-0.5 text-[11px] font-bold text-brand-cyan">
                      {plan.savings}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm leading-5 text-neutral-500">{plan.description}</p>
                <div className="my-6 h-px bg-border-subtle" />

                <ul className="flex-1 space-y-3">
                  {PLAN_FEATURES.map(feature => (
                    <li key={feature} className="flex items-center gap-3">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${plan.highlighted ? 'bg-brand-cyan/15 text-brand-cyan' : 'bg-neutral-700 text-neutral-300'}`}>
                        <Check size={12} strokeWidth={2.5} />
                      </span>
                      <span className="text-sm text-neutral-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanSelect(plan.id as 'monthly' | 'yearly')}
                  className={`mt-8 text-center py-3 rounded-full font-medium transition-all ${
                    plan.highlighted 
                      ? 'bg-brand-orange text-white hover:bg-brand-orange-deep shadow-lg shadow-brand-orange/20' 
                      : 'border border-white/20 text-white hover:bg-white/5'
                  }`}
                >
                  {plan.ctaLabel}
                </button>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-neutral-600">
            Prices shown are indicative and will be confirmed at launch. Cancel anytime — no lock-in.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* §4.3.6 Founding Member Banner                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-bg-primary py-16">
        <div className="mx-auto max-w-container px-6">
          <div className="relative overflow-hidden rounded-lg border border-brand-orange/30 bg-bg-surface p-8 shadow-card-dark md:flex md:items-center md:justify-between">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-orange/8 blur-[80px]" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-brand-cyan/5 blur-[80px]" aria-hidden="true" />

            <div className="relative">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand-orange">Limited offer</p>
              <h3 className="text-display-m text-white">Become a Founding Member.</h3>
              <p className="mt-2 max-w-xl text-subheading text-neutral-300">
                First 1,000 sign-ups get 6 months of Storyuu completely free — plus the
                exclusive &lsquo;First Storyuuser&rsquo; badge on your profile, forever.
              </p>
            </div>
            <Link
              to="/signup?utm_source=founding_member"
              className="btn-primary-orange relative mt-6 shrink-0 md:ml-8 md:mt-0"
            >
              Sign up &amp; get 6 months free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
