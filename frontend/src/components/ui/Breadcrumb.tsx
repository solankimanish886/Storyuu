import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useBreadcrumbStore } from '@/store/breadcrumbStore';

export default function Breadcrumb() {
  const trail = useBreadcrumbStore((s) => s.trail);

  // Only render when there's an origin + current page (depth ≥ 2)
  if (trail.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 px-6 py-3 text-sm">
      {trail.map((item, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={`${item.path}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} className="shrink-0 text-[#3D4555]" />}
            {isLast ? (
              <span className="font-medium text-white/80 max-w-[240px] truncate">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-[#5F716F] hover:text-[#949BAA] transition-colors max-w-[160px] truncate"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
