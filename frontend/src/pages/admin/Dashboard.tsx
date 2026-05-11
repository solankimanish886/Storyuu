import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, TrendingUp, TrendingDown, RefreshCw, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Stats {
  totalReaders: number;
  publishedStories: number;
  currentWeekSignups: number;
  lastWeekSignups: number;
}

interface VoteRow {
  storyId: string;
  story: string;
  season: string;
  episode: string;
  question: string;
  choice1Label: string;
  choice2Label: string;
  choice3Label: string;
  choice1Pct: number;
  choice2Pct: number;
  choice3Pct: number;
  totalVotes: number;
  closeAt?: string;
}

type TableRow = VoteRow;

interface TableResponse {
  rows: TableRow[];
  total: number;
  page: number;
  pages: number;
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  Icon,
  delta,
}: {
  label: string;
  value: number;
  Icon: React.ElementType;
  delta?: { current: number; prev: number };
}) {
  const pct = delta && delta.prev > 0
    ? Math.round(((delta.current - delta.prev) / delta.prev) * 100)
    : null;
  const up = pct !== null && pct >= 0;

  return (
    <div className="relative overflow-hidden group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all hover:bg-white/[0.06] hover:border-white/[0.1] hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan group-hover:scale-110 transition-transform">
          <Icon size={24} strokeWidth={1.5} />
        </div>
        {pct !== null && (
          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${
            up ? 'text-status-success bg-status-success/10' : 'text-status-error bg-status-error/10'
          }`}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {up ? '+' : ''}{pct}%
          </span>
        )}
      </div>
      <div>
        <h3 className="text-display-m font-bold text-white mb-1">{value.toLocaleString()}</h3>
        <p className="text-sm font-medium text-admin-text-secondary opacity-70">{label}</p>
      </div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-brand-cyan/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pct bar
// ---------------------------------------------------------------------------

function PctBar({ label, pct }: { label: string; pct: number }) {
  if (!label) return <span className="text-white/20 text-xs">—</span>;
  return (
    <div className="flex flex-col gap-0.5 min-w-[70px]">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/50 truncate max-w-[54px]" title={label}>{label}</span>
        <span className="text-white/70 font-bold ml-1">{pct}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-white/5">
        <div className="h-1 rounded-full bg-brand-cyan/60" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AdminDashboard
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const navigate = useNavigate();

  // KPI state
  const [stats, setStats] = useState<Stats | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiRefreshing, setKpiRefreshing] = useState(false);

  // Table state
  const [rows, setRows] = useState<TableRow[]>([]);
  const [tableMeta, setTableMeta] = useState({ total: 0, pages: 1 });
  const [tableLoading, setTableLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('story');
  const [filterStory, setFilterStory] = useState('');
  const [filterSeason, setFilterSeason] = useState('');

  const tableIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- KPI fetch ---
  const fetchKpis = useCallback((showRefreshSpinner = false) => {
    if (showRefreshSpinner) setKpiRefreshing(true);
    api
      .get<{ stats: Stats }>('/admin/dashboard')
      .then(({ data }) => setStats(data.stats))
      .catch(() => {})
      .finally(() => {
        setKpiLoading(false);
        setKpiRefreshing(false);
      });
  }, []);

  useEffect(() => { fetchKpis(); }, [fetchKpis]);

  // --- Table fetch ---
  const fetchTable = useCallback((pg: number, sort: string, fStory: string, fSeason: string) => {
    setTableLoading(true);
    const params = new URLSearchParams({
      page: String(pg),
      sortBy: sort,
      ...(fStory && { filterStory: fStory }),
      ...(fSeason && { filterSeason: fSeason }),
    });
    api
      .get<TableResponse>(`/admin/dashboard/votes?${params}`)
      .then(({ data }) => {
        setRows(data.rows);
        setTableMeta({ total: data.total, pages: data.pages });
      })
      .catch(() => {})
      .finally(() => setTableLoading(false));
  }, []);

  // Fetch on page/sort change
  useEffect(() => {
    fetchTable(page, sortBy, filterStory, filterSeason);
  }, [page, sortBy, fetchTable]);

  // 30-second auto-refresh for table
  useEffect(() => {
    if (tableIntervalRef.current) clearInterval(tableIntervalRef.current);
    tableIntervalRef.current = setInterval(() => {
      fetchTable(page, sortBy, filterStory, filterSeason);
    }, 30_000);
    return () => { if (tableIntervalRef.current) clearInterval(tableIntervalRef.current); };
  }, [page, sortBy, filterStory, filterSeason, fetchTable]);

  // Debounced filter fetch
  function handleFilterChange(field: 'story' | 'season', value: string) {
    if (field === 'story') setFilterStory(value);
    else setFilterSeason(value);
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    filterTimerRef.current = setTimeout(() => {
      setPage(1);
      fetchTable(
        1, sortBy,
        field === 'story' ? value : filterStory,
        field === 'season' ? value : filterSeason,
      );
    }, 400);
  }

  function handleSort(field: string) {
    setSortBy((prev) => (prev === field ? 'story' : field));
    setPage(1);
  }

  const SortBtn = ({ field, label }: { field: string; label: string }) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className={`inline-flex items-center gap-1 whitespace-nowrap ${
        sortBy === field ? 'text-brand-cyan' : 'text-white/40 hover:text-white/70'
      }`}
    >
      {label}
      <ArrowUpDown size={11} />
    </button>
  );

  return (
    <div className="space-y-10 animate-fade-in-up">

      {/* ── Header ── */}
      <div>
        <h1 className="text-display-l font-bold text-white mb-2 tracking-tight">Overview</h1>
        <p className="text-admin-text-secondary font-medium opacity-70">
          Here's what's happening with Storyuu today.
        </p>
      </div>

      {/* ── KPI row ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/30">Key metrics</h2>
          <button
            type="button"
            onClick={() => fetchKpis(true)}
            disabled={kpiRefreshing}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/60 hover:bg-white/10 transition-all disabled:opacity-40"
          >
            <RefreshCw size={11} className={kpiRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {kpiLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-white/[0.03] animate-pulse border border-white/[0.06]" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <StatCard
              label="Total readers"
              value={stats.totalReaders}
              Icon={Users}
            />
            <StatCard
              label="Current week signups"
              value={stats.currentWeekSignups}
              Icon={TrendingUp}
              delta={{ current: stats.currentWeekSignups, prev: stats.lastWeekSignups }}
            />
            <StatCard
              label="Total published stories"
              value={stats.publishedStories}
              Icon={BookOpen}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-status-error/20 bg-status-error/5 p-6 text-center">
            <p className="text-status-error font-medium">Failed to load platform statistics.</p>
          </div>
        )}
      </div>

      {/* ── Votes table ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        {/* Table header */}
        <div className="flex items-center border-b border-white/[0.06] px-6 py-4">
          <span className="text-sm font-bold text-white">Votes details</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-white/30">{tableMeta.total} total</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
          <input
            type="text"
            value={filterStory}
            onChange={(e) => handleFilterChange('story', e.target.value)}
            placeholder="Filter by story…"
            className="h-8 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 text-xs text-white placeholder:text-white/20 focus:border-brand-cyan/40 focus:outline-none w-44"
          />
          <input
            type="text"
            value={filterSeason}
            onChange={(e) => handleFilterChange('season', e.target.value)}
            placeholder="Filter by season…"
            className="h-8 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 text-xs text-white placeholder:text-white/20 focus:border-brand-cyan/40 focus:outline-none w-44"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.04] text-white/30">
                <th className="px-4 py-3 text-left font-bold"><SortBtn field="story" label="Story" /></th>
                <th className="px-4 py-3 text-left font-bold">Season</th>
                <th className="px-4 py-3 text-left font-bold"><SortBtn field="episode" label="Episode" /></th>
                <th className="px-4 py-3 text-left font-bold">Question</th>
                <th className="px-4 py-3 text-left font-bold">Choice 1</th>
                <th className="px-4 py-3 text-left font-bold">Choice 2</th>
                <th className="px-4 py-3 text-left font-bold">Choice 3</th>
                <th className="px-4 py-3 text-left font-bold"><SortBtn field="totalVotes" label="Total" /></th>
                <th className="px-4 py-3 text-left font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    {[...Array(9)].map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 rounded bg-white/[0.04] animate-pulse" style={{ width: `${40 + (j * 13) % 50}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-white/30">
                    No votes found.
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-white/80 max-w-[120px] truncate" title={row.story}>
                      {row.story}
                    </td>
                    <td className="px-4 py-3 text-white/50">{row.season}</td>
                    <td className="px-4 py-3 text-white/70 max-w-[120px] truncate" title={row.episode}>
                      {row.episode}
                    </td>
                    <td className="px-4 py-3 text-white/60 max-w-[150px] truncate" title={row.question}>
                      {row.question}
                    </td>
                    <td className="px-4 py-3">
                      <PctBar label={row.choice1Label} pct={row.choice1Pct} />
                    </td>
                    <td className="px-4 py-3">
                      <PctBar label={row.choice2Label} pct={row.choice2Pct} />
                    </td>
                    <td className="px-4 py-3">
                      <PctBar label={row.choice3Label} pct={row.choice3Pct} />
                    </td>
                    <td className="px-4 py-3 font-bold text-white/80">
                      {row.totalVotes.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/stories/${row.storyId}`)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/60 hover:bg-white/10 transition-all whitespace-nowrap"
                      >
                        Go to story
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {tableMeta.pages > 1 && (
          <div className="flex items-center justify-between border-t border-white/[0.04] px-4 py-3">
            <span className="text-xs text-white/30">
              Page {page} of {tableMeta.pages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 transition-all disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(tableMeta.pages, p + 1))}
                disabled={page >= tableMeta.pages}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 transition-all disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
