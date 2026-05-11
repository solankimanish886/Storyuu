import horiTagSrc from '@/assets/Type=hori-tag.svg';
import markSrc from '@/assets/Type=logo.svg';

type Props = {
  variant?: 'svg' | 'two-color' | 'orange' | 'hori-tag' | 'mark';
  className?: string;
  src?: string;
};

export default function Logo({ variant = 'svg', className = '', src }: Props) {
  if (src) {
    return (
      <img
        src={src}
        alt="Storyuu"
        className={`w-auto ${className}`}
      />
    );
  }

  if (variant === 'hori-tag') {
    return (
      <img
        src={horiTagSrc}
        alt="Storyuu"
        className={`w-auto ${className}`}
      />
    );
  }

  if (variant === 'mark') {
    return (
      <img
        src={markSrc}
        alt="Storyuu"
        className={`w-auto ${className}`}
      />
    );
  }

  if (variant === 'svg') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 124 32"
        height="28"
        aria-label="Storyuu"
        role="img"
        className={`w-auto ${className}`}
        style={{ overflow: 'visible' }}
      >
        <text
          x="0"
          y="24"
          fontFamily="Raleway, ui-sans-serif, system-ui, sans-serif"
          fontSize="26"
          fontWeight="700"
          letterSpacing="-0.5"
        >
          <tspan fill="#FFFFFF">story</tspan>
          <tspan fill="#07C2EF">uu</tspan>
        </text>
      </svg>
    );
  }

  const storyClass = variant === 'orange' ? 'text-brand-orange-deep' : 'text-white';
  return (
    <span className={`text-display-s font-bold tracking-tight ${className}`}>
      <span className={storyClass}>story</span>
      <span className="text-brand-cyan">uu</span>
    </span>
  );
}
