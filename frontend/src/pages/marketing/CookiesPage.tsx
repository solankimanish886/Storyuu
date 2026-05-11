import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import DOMPurify from 'dompurify';
import { api } from '@/lib/api';

interface LegalDoc {
  type: string;
  content: string;
  updatedAt: string;
}

export default function CookiesPage() {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<LegalDoc>('/legal/cookies')
      .then(({ data }) => setDoc(data))
      .catch(() => setDoc({ type: 'cookies', content: '', updatedAt: '' }))
      .finally(() => setLoading(false));
  }, []);

  const safeHtml = doc?.content
    ? DOMPurify.sanitize(doc.content)
    : '';

  return (
    <div className="min-h-screen bg-bg-primary text-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1 text-sm text-neutral-400 transition-colors hover:text-white"
        >
          <ChevronLeft size={16} />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold text-white">Cookie Policy</h1>

        {loading ? (
          <div className="mt-10 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-white/10" />
            ))}
          </div>
        ) : safeHtml ? (
          <div
            className="mt-10 prose prose-invert max-w-none text-neutral-300 prose-headings:text-white prose-a:text-brand-cyan prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : (
          <p className="mt-10 text-neutral-400">This document has not been published yet.</p>
        )}

        <div className="mt-12 border-t border-border-subtle pt-8">
          <p className="text-sm text-neutral-500">
            Questions? Contact us at{' '}
            <a href="mailto:support@storyuu.com" className="text-brand-cyan hover:underline">
              support@storyuu.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
