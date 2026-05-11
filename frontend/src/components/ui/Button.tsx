interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'cyan';
}

export default function Button({
  loading,
  variant = 'primary',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'w-full rounded-full py-3.5 text-sm font-semibold transition-colors disabled:opacity-50';
  const variants = {
    primary: 'bg-brand-orange text-white hover:bg-brand-orange-deep active:scale-95',
    ghost: 'text-brand-cyan hover:text-white',
    cyan: 'bg-brand-cyan text-white hover:bg-brand-cyan/90 active:scale-95 shadow-lg shadow-brand-cyan/20',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          Loading…
        </span>
      ) : (
        children
      )}
    </button>
  );
}
