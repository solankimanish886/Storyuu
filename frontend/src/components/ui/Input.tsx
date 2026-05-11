import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-200">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-md bg-bg-surface px-4 py-3 text-white placeholder:text-neutral-500 outline-none ring-1 transition focus:ring-2 ${
            error
              ? 'ring-status-error focus:ring-status-error'
              : 'ring-white/10 focus:ring-brand-cyan'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-status-error">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
