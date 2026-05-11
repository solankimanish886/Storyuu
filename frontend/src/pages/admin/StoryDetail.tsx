import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Send,
  Play,
  Clock,
  Layers,
  FileText,
  Image as ImageIcon
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
  description?: string;
  coverImageUrl?: string;
  status: string;
  episodes: EpisodeItem[];
  episodeCount: number;
}

interface Story {
  id: string;
  title: string;
  slug: string;
  status: string;
  overview: string | null;
  coverImageUrl?: string;
}

const statusBadge = (s: string) => {
  const cls = s === 'published' ? 'bg-emerald-500/10 text-emerald-400' :
    s === 'scheduled' ? 'bg-sky-500/10 text-sky-400' : 'bg-amber-500/10 text-amber-400';
  return <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>{s}</span>;
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AdminStoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [seasons, setSeasons] = useState<SeasonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEpModal, setAddEpModal] = useState<{ seasonId: string; seasonNumber: number } | null>(null);
  const [editEpModal, setEditEpModal] = useState<{ episodeId: string; seasonNumber: number } | null>(null);
  const [deletingSeason, setDeletingSeason] = useState<SeasonItem | null>(null);
  const [deletingEp, setDeletingEp] = useState<EpisodeItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { toast } = useToast();

  function load() {
    if (!id) return;
    api.get<{ story: Story; seasons: SeasonItem[] }>(`/admin/stories/${id}`)
      .then(({ data }) => { 
        setStory(data.story); 
        setSeasons(data.seasons); 
      })
      .catch(() => toast('Failed to load story details', 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function addSeason() {
    try {
      const num = seasons.length + 1;
      await api.post(`/admin/stories/${id}/seasons`, { 
        number: num, 
        title: `Season ${num}`,
        status: 'draft' 
      });
      toast('New season created');
      load();
    } catch {
      toast('Failed to create season', 'error');
    }
  }

  async function confirmDelSeason() {
    if (!deletingSeason) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/seasons/${deletingSeason.id}`);
      toast('Season deleted');
      setDeletingSeason(null);
      load();
    } catch {
      toast('Failed to delete season', 'error');
    } finally {
      setDeleteLoading(false);
    }
  }

  function openNewEp(seasonId: string) {
    const season = seasons.find(s => s.id === seasonId);
    setAddEpModal({ seasonId, seasonNumber: season?.number ?? 1 });
  }

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

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
    </div>
  );

  if (!story) return (
    <div className="p-12 text-center text-white/40">
      <p className="text-lg font-bold">Story not found</p>
      <Link to="/admin/stories" className="mt-4 inline-block text-brand-cyan hover:underline">Go back to list</Link>
    </div>
  );

  return (
    <>
    <div className="space-y-10 pb-20 animate-fade-in-up">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[32px] bg-admin-surface-alt p-5 sm:p-8 md:p-12 border border-white/[0.05]">
        {/* Background Blur */}
        {story.coverImageUrl && (
          <div className="absolute inset-0 z-0">
            <img src={story.coverImageUrl} className="h-full w-full object-cover opacity-10 blur-3xl scale-125" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-admin-bg via-transparent to-transparent" />
          </div>
        )}

        <div className="relative z-10">
          <Link to="/admin/stories" className="mb-8 inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-white/30 hover:text-white transition-colors">
            <ChevronLeft size={16} /> Back to Stories
          </Link>

          <div className="flex flex-col gap-8 md:flex-row md:items-start">
            {/* Cover Image */}
            <div className="relative aspect-[4/5] w-full max-w-[240px] shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl md:aspect-[2/3]">
              {story.coverImageUrl ? (
                <img src={story.coverImageUrl} className="h-full w-full object-cover" alt={story.title} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/10">
                  <ImageIcon size={48} />
                </div>
              )}
              <div className="absolute top-4 left-4">{statusBadge(story.status)}</div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-6">
              <div>
                <h1 className="text-display-l font-bold text-white tracking-tight leading-tight">{story.title}</h1>
                <p className="mt-2 text-sm font-medium text-white/40">slug: <span className="font-mono">{story.slug}</span></p>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-5 py-3 border border-white/[0.05]">
                  <Layers size={20} className="text-brand-cyan" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Seasons</p>
                    <p className="text-lg font-bold text-white leading-tight">{seasons.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-5 py-3 border border-white/[0.05]">
                  <FileText size={20} className="text-brand-cyan" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Episodes</p>
                    <p className="text-lg font-bold text-white leading-tight">{seasons.reduce((acc, s) => acc + s.episodeCount, 0)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/30">Description</label>
                <p className="max-w-2xl text-[15px] leading-relaxed text-white/60">
                  {story.overview || "No description provided for this story."}
                </p>
              </div>

              <div className="pt-4">
                <button 
                  onClick={addSeason}
                  className="flex items-center gap-2 rounded-xl bg-brand-cyan px-6 py-3 text-sm font-bold text-black hover:opacity-90 transition-all shadow-[0_8px_32px_rgba(7,194,239,0.25)]"
                >
                  <Plus size={18} /> New Season
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seasons Section */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white tracking-tight">All Seasons ({seasons.length})</h2>
        </div>

        {seasons.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-white/[0.05] bg-white/[0.01] text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.03] text-white/10">
              <Layers size={32} />
            </div>
            <div>
              <p className="text-lg font-bold text-white/40">No seasons yet</p>
              <p className="text-sm text-white/20 mt-1">Start by creating the first season of your story.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {seasons.map((season) => (
              <div key={season.id} className="group overflow-hidden rounded-[24px] border border-white/[0.06] bg-admin-surface-alt transition-all hover:border-white/10">
                {/* Season Header Card */}
                <div className="flex flex-col sm:flex-row p-6 gap-6 items-center sm:items-start bg-gradient-to-r from-white/[0.02] to-transparent">
                  <div className="relative aspect-video w-full sm:w-56 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-lg">
                    {season.coverImageUrl || story.coverImageUrl ? (
                      <img src={season.coverImageUrl || story.coverImageUrl} className="h-full w-full object-cover" alt="" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/5">
                        <ImageIcon size={32} />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      {statusBadge(season.status)}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 text-center sm:text-left">
                    <div>
                      <h3 className="text-xl font-bold text-white leading-tight">{season.title || `Season ${season.number}`}</h3>
                      <div className="mt-1 flex flex-wrap justify-center sm:justify-start items-center gap-3 text-[13px] font-medium text-white/30">
                        <span className="flex items-center gap-1.5"><Layers size={14} /> {season.episodeCount} Episodes</span>
                        <span className="h-1 w-1 rounded-full bg-white/10" />
                        <span className="flex items-center gap-1.5"><Clock size={14} /> Updated {new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <p className="text-[14px] text-white/50 line-clamp-2 max-w-xl">
                      {season.description || "Manage your season episodes and content flow here."}
                    </p>

                    <div className="flex flex-wrap justify-center sm:justify-start gap-3 pt-2">
                      <button 
                        onClick={() => openNewEp(season.id)}
                        className="flex items-center gap-2 rounded-lg bg-brand-cyan/10 px-4 py-2 text-xs font-bold text-brand-cyan hover:bg-brand-cyan/20 transition-all border border-brand-cyan/20"
                      >
                        <Plus size={14} /> Add Episode
                      </button>
                      {season.episodeCount > 5 && (
                        <button
                          onClick={() => navigate(`/admin/stories/${id}/seasons/${season.id}/episodes`)}
                          className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-xs font-bold text-white/60 hover:bg-white/10 transition-all border border-white/10"
                        >
                          Show All Episodes
                        </button>
                      )}
                      <button onClick={() => setDeletingSeason(season)} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all ml-auto">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Episodes List Table */}
                {season.episodes.length > 0 ? (
                  <div className="border-t border-white/[0.04]">
                    <div className="overflow-x-auto scrollbar-hide">
                      <table className="w-full text-left">
                        <thead className="bg-white/[0.01] border-b border-white/[0.03]">
                          <tr>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Episode</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {season.episodes.slice(0, 5).map((ep) => (
                            <tr key={ep.id} className="group/row hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                                    {ep.coverImageUrl ? (
                                      <img src={ep.coverImageUrl} className="h-full w-full object-cover" alt="" />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-white/10">
                                        <Play size={16} />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="text-[14px] font-bold text-white">Episode {ep.number}: {ep.title}</h4>
                                    <div className="mt-0.5 flex items-center gap-3 text-[11px] font-medium text-white/30">
                                      {statusBadge(ep.status)}
                                      <span className="flex items-center gap-1"><Clock size={10} /> {ep.readTimeMinutes} min</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  {ep.status !== 'published' && (
                                    <button onClick={() => publishEp(ep.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-500/60 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all" title="Publish">
                                      <Send size={14} />
                                    </button>
                                  )}
                                  <button onClick={() => setEditEpModal({ episodeId: ep.id, seasonNumber: season.number })} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                    <Pencil size={14} />
                                  </button>
                                  <button onClick={() => setDeletingEp(ep)} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 transition-all">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-10 text-center text-[13px] font-medium text-white/20 italic border-t border-white/[0.04]">
                    No episodes added to this season yet.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Modals outside the transformed container to fix fixed positioning */}
    {addEpModal && (
      <AddEpisodeModal
        seasonId={addEpModal.seasonId}
        seasonNumber={addEpModal.seasonNumber}
        onClose={() => setAddEpModal(null)}
        onCreated={() => { setAddEpModal(null); load(); }}
      />
    )}

    {editEpModal && (
      <EditEpisodeModal
        episodeId={editEpModal.episodeId}
        seasonNumber={editEpModal.seasonNumber}
        onClose={() => setEditEpModal(null)}
        onSaved={() => { setEditEpModal(null); load(); }}
      />
    )}

    {deletingSeason && (
      <ConfirmModal
        title="Delete Season?"
        message={<>Delete <strong className="text-white">{deletingSeason.title ?? `Season ${deletingSeason.number}`}</strong> and all its episodes? This cannot be undone.</>}
        confirmLabel="Delete Season"
        onConfirm={confirmDelSeason}
        onCancel={() => !deleteLoading && setDeletingSeason(null)}
        loading={deleteLoading}
      />
    )}

    {deletingEp && (
      <ConfirmModal
        title="Delete Episode?"
        message={<>Delete <strong className="text-white">Episode {deletingEp.number}: {deletingEp.title}</strong>? This cannot be undone.</>}
        confirmLabel="Delete Episode"
        onConfirm={confirmDelEp}
        onCancel={() => !deleteLoading && setDeletingEp(null)}
        loading={deleteLoading}
      />
    )}
    </>
  );
}
