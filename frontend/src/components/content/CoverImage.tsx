import { BookOpen } from 'lucide-react';

interface Props {
  src?: string | null;
  alt?: string;
  aspect?: 'portrait' | 'landscape' | 'square';
  overlay?: boolean;
  className?: string;
}

const aspectClass = {
  portrait: 'aspect-[2/3]',
  landscape: 'aspect-video',
  square: 'aspect-square',
};

export default function CoverImage({ src, alt = '', aspect = 'portrait', overlay = false, className = '' }: Props) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-bg-surface-alt ${aspectClass[aspect]} ${className}`}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bg-surface to-bg-surface-alt">
          <BookOpen size={32} className="text-neutral-700" />
        </div>
      )}
      {overlay && (
        <div className="absolute inset-0 bg-cover-overlay" />
      )}
    </div>
  );
}
