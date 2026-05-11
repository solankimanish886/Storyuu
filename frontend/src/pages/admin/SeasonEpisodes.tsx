import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Send,
  Clock,
  Play,
  Search,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import AddEpisodeModal from './AddEpisodeModal';
import EditEpisodeModal from './EditEpisodeModal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EpisodeItem {
  id: string;
  number: number;
  title: string;
  status: string;
  publishedAt: string | null;
  readTimeMinutes: number;
  coverImageUrl?: string;
}

interface SeasonItem {
  id: string;
  number: number;
  title: string | null;
  episodes: EpisodeItem[];
  episodeCount: number;
}

type SortKey = 'number' | 'title' | 'publishedAt';
type StatusFilter = 'all' | 'draft' | 'published' | 'scheduled';

const statusBadge = (s: string) => {
  const cls =
    s === 'published'
      ? 'bg-emerald-500/10 text-emerald-400'
      : s === 'scheduled'
      ? 'bg-sky-500/10 text-sky-400'
      : 'bg-amber-500/10 text-amber-400';
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      {s}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AdminSeasonEpisodes() {
  const { id: storyId, seasonId } = useParams<{ id: string; seasonId: string }>();

  const [season, setSeason] = useState<SeasonItem | null>(null);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('number');
  const [search, setSearch] = useState('');

  const [addEpModal, setAddEpModal] = useState(false);
  const [editEpModal, setEditEpModal] = useState<{ episodeId: string } | null>(null);
  const [deletingEp, setDeletingEp] = useState<EpisodeItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { toast } = useToast();

  function load() {
    if (!storyId || !seasonId) return;
    api
      .get<{ seasons: SeasonItem[] }>(`/admin/stories/${storyId}`)
      .then(({ data }) => {
        const found = (data as any).seasons?.find((s: SeasonItem) => s.id === seasonId) ?? null;
        setSeason(found);
      })
      .catch(() => toast('Failed to load episodes', 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [storyId, seasonId]);

  async function publishEp(epId: string) {
    try {
      await api.post(`/admin/episodes/${epId}/publish`);
      toast('Episode published');
      load();
    } catch {
      toast('Failed to publish', 'error');
    }
  }

  async function confirmDelEp() {
    if (!deletingEp) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/episodes/${deletingEp.id}`);
      toast('Episode deleted');
      setDeletingEp(null);
      load();
    } catch {
      toast('Failed to delete episode', 'error');
    } finally {
      setDeleteLoading(false);
    }
  }

  const episodes = season?.episodes ?? [];

  const filtered = episodes
    .filter((ep) => statusFilter === 'all' || ep.status === statusFilter)
    .filter(
      (ep) =>
        !search.trim() || ep.title.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => {
      if (sortKey === 'number') return a.number - b.number;
      if (sortKey === 'title') return a.title.localeCompare(b.title);
      if (sortKey === 'publishedAt') {
        return (
          new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime()
        );
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
      </div>
    );
  }

  if (!season) {
    return (
      <div className="p-12 text-center text-white/40">
        <p className="text-lg font-bold">Season not found</p>
        <Link
          to={`/admin/stories/${storyId}`}
          className="mt-4 inline-block text-brand-cyan hover:underline"
        >
          Back to Story
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 pb-20 animate-fade-in-up">
        {/* Header */}
        <div>
          <Link
            to={`/admin/stories/${storyId}`}
            className="mb-6 inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-white/30 hover:text-white transition-colors"
          >
            <ChevronLeft size={16} /> Back to Story
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {season.title ?? `Season ${season.number}`} — All Episodes
              </h1>
              <p className="mt-1 text-sm text-white/30">
                {season.episodeCount} episode{season.episodeCount !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setAddEpModal(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-cyan px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 transition-all"
            >
              <Plus size={16} /> Add Episode
            </button>
          </div>
        </div>

        {/* Filters + Search */}
        <div className="flex flex-wrap gap-3">
          {/* Status filter */}
          <div className="flex rounded-xl overflow-hidden border border-white/[0.06]">
            {(['all', 'draft', 'published', 'scheduled'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 text-xs font-bold capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-brand-cyan text-black'
                    : 'bg-white/[0.02] text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-xs font-bold text-white/60 cursor-pointer appearance-none focus:outline-none hover:bg-white/5 transition-colors"
          >
            <option value="number" className="bg-[#0b0e14]">Sort: Episode #</option>
            <option value="title" className="bg-[#0b0e14]">Sort: Title</option>
            <option value="publishedAt" className="bg-[#0b0e14]">Sort: Publish Date</option>
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search episodes…"
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] pl-9 pr-4 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-brand-cyan/40 transition-colors"
            />
          </div>
        </div>

        {/* Episodes Table */}
        <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-admin-surface-alt">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-[13px] font-medium text-white/20 italic">
              {episodes.length === 0 ? 'No episodes in this season yet.' : 'No episodes match your filters.'}
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left">
                <thead className="bg-white/[0.01] border-b border-white/[0.03]">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
                      Episode
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((ep) => (
                    <tr key={ep.id} className="group/row hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                            {ep.coverImageUrl ? (
                              <img
                                src={ep.coverImageUrl}
                                className="h-full w-full object-cover"
                                alt=""
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-white/10">
                                <Play size={16} />
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="text-[14px] font-bold text-white">
                              Episode {ep.number}: {ep.title}
                            </h4>
                            <div className="mt-0.5 flex items-center gap-3 text-[11px] font-medium text-white/30">
                              {statusBadge(ep.status)}
                              <span className="flex items-center gap-1">
                                <Clock size={10} /> {ep.readTimeMinutes} min
                              </span>
                              {ep.publishedAt && (
                                <span className="hidden sm:inline">
                                  {new Date(ep.publishedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {ep.status !== 'published' && (
                            <button
                              onClick={() => publishEp(ep.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-500/60 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all"
                              title="Publish"
                            >
                              <Send size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => setEditEpModal({ episodeId: ep.id })}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingEp(ep)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {addEpModal && season && (
        <AddEpisodeModal
          seasonId={season.id}
          seasonNumber={season.number}
          onClose={() => setAddEpModal(false)}
          onCreated={() => { setAddEpModal(false); load(); }}
        />
      )}

      {editEpModal && (
        <EditEpisodeModal
          episodeId={editEpModal.episodeId}
          seasonNumber={season.number}
          onClose={() => setEditEpModal(null)}
          onSaved={() => { setEditEpModal(null); load(); }}
        />
      )}

      {deletingEp && (
        <ConfirmModal
          title="Delete Episode?"
          message={
            <>
              Delete{' '}
              <strong className="text-white">
                Episode {deletingEp.number}: {deletingEp.title}
              </strong>
              ? This cannot be undone.
            </>
          }
          confirmLabel="Delete Episode"
          onConfirm={confirmDelEp}
          onCancel={() => !deleteLoading && setDeletingEp(null)}
          loading={deleteLoading}
        />
      )}
    </>
  );
}
