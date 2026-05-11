import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, Users, UserPlus, UserMinus,
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface KpiData {
  mrr: number;
  activeSubscribers: { total: number; monthly: number; yearly: number };
  newThisPeriod: number;
  prevPeriodNew: number;
  churnCount: number;
  churnRate: number;
}

interface MrrPoint { date: string; mrr: number; }

interface Transaction {
  id: string;
  date: string;
  user: { id: string | null; name: string };
  plan: 'monthly' | 'yearly';
  amount: number;
  status: 'paid' | 'failed' | 'refunded';
}

interface TxResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RANGES = [
  { label: 'Last 7 days',    value: '7d'  },
  { label: 'Last 30 days',   value: '30d' },
  { label: 'Last 90 days',   value: '90d' },
  { label: 'Last 12 months', value: '12m' },
  { label: 'All time',       value: 'all' },
];

const MONTHLY_USD = 7.99;
const YEARLY_USD  = 59.99;

// ── StatCard (identical chrome to Dashboard) ──────────────────────────────────

function StatCard({
  label, value, Icon, delta, sub,
}: {
  label: string;
  value: string | number;
  Icon: React.ElementType;
  delta?: { current: number; prev: number };
  sub?: string;
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
        <h3 className="text-display-m font-bold text-white mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
        <p className="text-sm font-medium text-admin-text-secondary opacity-70">{label}</p>
        {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
      </div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-brand-cyan/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}

// ── Shared card chrome ────────────────────────────────────────────────────────

function Card({ title, headerRight, children }: {
  title?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
      {(title || headerRight) && (
        <div className="flex items-center justify-between mb-5">
          {title && (
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">{title}</h2>
          )}
          {headerRight}
        </div>
      )}
      {children}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-white/30">{msg}</div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.05] ${className}`} />;
}

// ── MRR line chart (SVG, no external library) ─────────────────────────────────

function MrrLineChart({ points }: { points: MrrPoint[] }) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 700, H = 220;
  const PAD = { top: 16, right: 16, bottom: 36, left: 56 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  if (!points.length) return <EmptyState msg="No data for this range" />;

  const maxMrr = Math.max(...points.map(p => p.mrr), 1);
  const xOf = (i: number) =>
    PAD.left + (points.length === 1 ? cW / 2 : (i / (points.length - 1)) * cW);
  const yOf = (v: number) => PAD.top + cH - (v / maxMrr) * cH;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(p.mrr).toFixed(1)}`)
    .join(' ');
  const areaD = points.length > 1
    ? `${pathD} L${xOf(points.length - 1).toFixed(1)},${(PAD.top + cH).toFixed(1)} L${xOf(0).toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`
    : '';

  const yTicks = [0, 0.5, 1].map(f => ({ v: maxMrr * f, y: yOf(maxMrr * f) }));

  const maxXLabels = 7;
  const xStep = Math.max(1, Math.floor(points.length / maxXLabels));
  const xLabelIdxs = points
    .map((_, i) => i)
    .filter(i => i % xStep === 0 || i === points.length - 1);

  const fmtDateLabel = (d: string) => {
    if (d.length === 7) {
      return new Date(d + '-02').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const fmtY = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length <= 1) {
      setHovIdx(points.length === 1 ? 0 : null);
      return;
    }
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const raw  = (relX - PAD.left) / cW * (points.length - 1);
    setHovIdx(Math.max(0, Math.min(points.length - 1, Math.round(raw))));
  };

  const hp   = hovIdx !== null ? points[hovIdx] : null;
  const tipW = 88, tipH = 44;
  const tipX = hp ? Math.min(Math.max(xOf(hovIdx!) - tipW / 2, 4), W - tipW - 4) : 0;
  const tipY = hp ? Math.max(yOf(hp.mrr) - tipH - 10, 2) : 0;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 220 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovIdx(null)}
    >
      <defs>
        <linearGradient id="mrrAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1DB6E0" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#1DB6E0" stopOpacity="0"    />
        </linearGradient>
      </defs>

      {yTicks.map(({ v, y }) => (
        <g key={v}>
          <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
            stroke="white" strokeOpacity="0.06" strokeWidth="1" />
          <text x={PAD.left - 6} y={y + 4}
            textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="10" fontFamily="system-ui">
            {fmtY(v)}
          </text>
        </g>
      ))}

      <line x1={PAD.left} y1={PAD.top + cH} x2={W - PAD.right} y2={PAD.top + cH}
        stroke="white" strokeOpacity="0.1" strokeWidth="1" />

      {areaD && <path d={areaD} fill="url(#mrrAreaGrad)" />}

      <path d={pathD} fill="none" stroke="#1DB6E0" strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />

      {xLabelIdxs.map(i => (
        <text key={i} x={xOf(i)} y={H - 6}
          textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="10" fontFamily="system-ui">
          {fmtDateLabel(points[i].date)}
        </text>
      ))}

      {/* Single point: show persistent dot + value */}
      {points.length === 1 && (
        <g>
          <circle cx={xOf(0)} cy={yOf(points[0].mrr)} r={5} fill="#1DB6E0" />
          <text x={xOf(0)} y={yOf(points[0].mrr) - 10}
            textAnchor="middle" fill="#1DB6E0" fontSize="12" fontWeight="bold" fontFamily="system-ui">
            ${points[0].mrr.toFixed(2)}
          </text>
        </g>
      )}

      {/* Hover: vertical guide, dot, tooltip */}
      {hp && hovIdx !== null && points.length > 1 && (
        <g>
          <line x1={xOf(hovIdx)} y1={PAD.top} x2={xOf(hovIdx)} y2={PAD.top + cH}
            stroke="white" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx={xOf(hovIdx)} cy={yOf(hp.mrr)} r={4} fill="#1DB6E0" />
          <rect x={tipX} y={tipY} width={tipW} height={tipH}
            rx={6} fill="#1A1A22" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <text x={tipX + tipW / 2} y={tipY + 15}
            textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="system-ui">
            {fmtDateLabel(hp.date)}
          </text>
          <text x={tipX + tipW / 2} y={tipY + 33}
            textAnchor="middle" fill="#1DB6E0" fontSize="12" fontWeight="bold" fontFamily="system-ui">
            ${hp.mrr.toFixed(2)}
          </text>
        </g>
      )}
    </svg>
  );
}

// ── Donut chart (SVG arc paths) ───────────────────────────────────────────────

function DonutChart({ monthly, yearly }: { monthly: number; yearly: number }) {
  const total = monthly + yearly;
  const cx = 80, cy = 80, r = 56, sw = 18;

  function toXY(angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arc(startDeg: number, spanDeg: number, color: string) {
    if (spanDeg <= 0) return null;
    if (spanDeg >= 360) {
      return <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw} />;
    }
    const s = toXY(startDeg);
    const e = toXY(startDeg + spanDeg);
    const large = spanDeg > 180 ? 1 : 0;
    return (
      <path
        d={`M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`}
        fill="none" stroke={color} strokeWidth={sw} strokeLinecap="butt"
      />
    );
  }

  const mAngle = total > 0 ? (monthly / total) * 360 : 0;
  const yAngle = total > 0 ? (yearly  / total) * 360 : 0;

  return (
    <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
      {total === 0 ? (
        <>
          <text x={cx} y={cy + 5} textAnchor="middle" fill="rgba(255,255,255,0.3)"
            fontSize="22" fontFamily="system-ui">0</text>
          <text x={cx} y={cy + 20} textAnchor="middle" fill="rgba(255,255,255,0.3)"
            fontSize="9" fontFamily="system-ui">active subs</text>
        </>
      ) : (
        <>
          {arc(0,      mAngle, '#FF8750')}
          {arc(mAngle, yAngle, '#1DB6E0')}
          <text x={cx} y={cy - 5} textAnchor="middle" fill="white"
            fontSize="22" fontWeight="bold" fontFamily="system-ui">{total}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.4)"
            fontSize="9" fontFamily="system-ui">active subs</text>
        </>
      )}
    </svg>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, string> = {
  paid:     'bg-status-success/10 text-status-success',
  failed:   'bg-status-error/10   text-status-error',
  refunded: 'bg-white/10           text-white/50',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize ${STATUS_CFG[status] ?? ''}`}>
      {status}
    </span>
  );
}

// ── Revenue page ──────────────────────────────────────────────────────────────

export default function Revenue() {
  const [range,       setRange]       = useState('30d');
  const [kpis,        setKpis]        = useState<KpiData | null>(null);
  const [trendPoints, setTrendPoints] = useState<MrrPoint[]>([]);
  const [txData,      setTxData]      = useState<TxResponse>({ transactions: [], total: 0, page: 1, totalPages: 0 });
  const [txStatus,    setTxStatus]    = useState('all');
  const [txPage,      setTxPage]      = useState(1);
  const [loadingTop,  setLoadingTop]  = useState(true);
  const [loadingTx,   setLoadingTx]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingTop(true);
    Promise.all([
      api.get<KpiData>(`/superadmin/revenue/kpis?range=${range}`),
      api.get<{ points: MrrPoint[] }>(`/superadmin/revenue/mrr-trend?range=${range}`),
    ])
      .then(([k, t]) => {
        if (cancelled) return;
        setKpis(k.data);
        setTrendPoints(t.data.points);
        setLoadingTop(false);
      })
      .catch(() => { if (!cancelled) setLoadingTop(false); });
    return () => { cancelled = true; };
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    setLoadingTx(true);
    api.get<TxResponse>(
      `/superadmin/revenue/transactions?range=${range}&status=${txStatus}&page=${txPage}`,
    )
      .then(r => { if (!cancelled) { setTxData(r.data); setLoadingTx(false); } })
      .catch(() => { if (!cancelled) setLoadingTx(false); });
    return () => { cancelled = true; };
  }, [range, txStatus, txPage]);

  const handleRangeChange = (r: string) => { setRange(r);    setTxPage(1); };
  const handleTxStatus    = (s: string) => { setTxStatus(s); setTxPage(1); };

  const fmtUsd  = (v: number) =>
    `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const monthly     = kpis?.activeSubscribers.monthly ?? 0;
  const yearly      = kpis?.activeSubscribers.yearly  ?? 0;
  const totalActive = kpis?.activeSubscribers.total   ?? 0;
  const monthlyMrr  = monthly * MONTHLY_USD;
  const yearlyMrr   = yearly  * (YEARLY_USD / 12);

  return (
    <div className="p-6 space-y-6 min-h-screen">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display-l font-bold text-white tracking-tight">Revenue</h1>
          <p className="text-admin-text-secondary font-medium opacity-70 mt-1">
            Subscription revenue and payment analytics.
          </p>
        </div>
        <select
          value={range}
          onChange={e => handleRangeChange(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-cyan/40 cursor-pointer"
        >
          {RANGES.map(r => (
            <option key={r.value} value={r.value} className="bg-[#0b0e14]">{r.label}</option>
          ))}
        </select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loadingTop
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)
          : (
            <>
              <StatCard
                Icon={DollarSign}
                label="Monthly Recurring Revenue"
                value={fmtUsd(kpis?.mrr ?? 0)}
              />
              <StatCard
                Icon={Users}
                label="Active Subscribers"
                value={totalActive}
                sub={`${monthly} monthly · ${yearly} yearly`}
              />
              <StatCard
                Icon={UserPlus}
                label="New This Period"
                value={kpis?.newThisPeriod ?? 0}
                delta={kpis ? { current: kpis.newThisPeriod, prev: kpis.prevPeriodNew } : undefined}
                sub={kpis
                  ? `vs previous period: ${kpis.newThisPeriod - kpis.prevPeriodNew >= 0 ? '+' : ''}${kpis.newThisPeriod - kpis.prevPeriodNew}`
                  : undefined}
              />
              <StatCard
                Icon={UserMinus}
                label="Churn (period)"
                value={kpis?.churnCount ?? 0}
                sub={`Cancellation rate: ${kpis?.churnRate ?? 0}%`}
              />
            </>
          )
        }
      </div>

      {/* MRR Trend */}
      <Card title="MRR Trend">
        {loadingTop
          ? <Skeleton className="h-[220px]" />
          : <MrrLineChart points={trendPoints} />
        }
      </Card>

      {/* Plan Mix */}
      <Card title="Plan Mix">
        {loadingTop ? (
          <Skeleton className="h-40" />
        ) : totalActive === 0 ? (
          <EmptyState msg="No active subscribers" />
        ) : (
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <DonutChart monthly={monthly} yearly={yearly} />
            <div className="flex-1 w-full min-w-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-white/30 border-b border-white/[0.06]">
                    <th className="pb-3 font-semibold">Plan</th>
                    <th className="pb-3 font-semibold text-right">Subscribers</th>
                    <th className="pb-3 font-semibold text-right">Share</th>
                    <th className="pb-3 font-semibold text-right">MRR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {[
                    { label: 'Monthly', color: '#FF8750', count: monthly, mrr: monthlyMrr },
                    { label: 'Yearly',  color: '#1DB6E0', count: yearly,  mrr: yearlyMrr  },
                  ].map(row => {
                    const pct = totalActive > 0
                      ? ((row.count / totalActive) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <tr key={row.label} className="text-white/70">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: row.color }} />
                            {row.label}
                          </div>
                        </td>
                        <td className="py-3 text-right font-semibold text-white">{row.count.toLocaleString()}</td>
                        <td className="py-3 text-right">{pct}%</td>
                        <td className="py-3 text-right font-semibold text-white">{fmtUsd(row.mrr)}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-white/[0.08]">
                    <td className="pt-3 font-semibold text-white/60 text-xs uppercase tracking-wide">Total</td>
                    <td className="pt-3 text-right font-semibold text-white">{totalActive.toLocaleString()}</td>
                    <td className="pt-3 text-right text-white/50">100%</td>
                    <td className="pt-3 text-right font-semibold text-white">{fmtUsd(kpis?.mrr ?? 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Recent Transactions */}
      <Card
        title="Recent Transactions"
        headerRight={
          <select
            value={txStatus}
            onChange={e => handleTxStatus(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-cyan/40 cursor-pointer"
          >
            {['all', 'paid', 'failed', 'refunded'].map(s => (
              <option key={s} value={s} className="bg-[#0b0e14] capitalize">
                {s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-white/30 border-b border-white/[0.06]">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">User</th>
                <th className="pb-3 font-semibold">Plan</th>
                <th className="pb-3 font-semibold text-right">Amount</th>
                <th className="pb-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loadingTx ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="py-3 pr-4"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : txData.transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-white/30">
                    No transactions for this range.
                  </td>
                </tr>
              ) : (
                txData.transactions.map(tx => (
                  <tr key={tx.id} className="text-white/70 hover:text-white transition-colors">
                    <td className="py-3 pr-4 whitespace-nowrap text-white/50 text-xs">{fmtDate(tx.date)}</td>
                    <td className="py-3 pr-4">
                      {tx.user.id ? (
                        <Link to={`/admin/users/${tx.user.id}`} className="text-brand-cyan hover:underline">
                          {tx.user.name}
                        </Link>
                      ) : (
                        <span className="text-white/40">{tx.user.name}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 capitalize">{tx.plan}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-white">{fmtUsd(tx.amount)}</td>
                    <td className="py-3 text-right"><StatusBadge status={tx.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {txData.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
            <span className="text-xs text-white/30">
              {txData.total} transaction{txData.total !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTxPage(p => Math.max(1, p - 1))}
                disabled={txPage === 1}
                className="p-1.5 rounded-lg border border-white/[0.08] text-white/40 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-white/50 px-2">{txPage} / {txData.totalPages}</span>
              <button
                onClick={() => setTxPage(p => Math.min(txData.totalPages, p + 1))}
                disabled={txPage === txData.totalPages}
                className="p-1.5 rounded-lg border border-white/[0.08] text-white/40 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

    </div>
  );
}
