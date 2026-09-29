import { useEffect, useState } from 'react';
import { Activity, PhoneCall, Target, TrendingUp, Timer } from 'lucide-react';
import api from '../../services/api';

interface DashboardStats {
  total_leads: number;
  total_calls: number;
  total_projects: number;
  total_properties: number;
  hot_leads: number;
  won_leads: number;
  conversion_rate: number;
  connect_rate: number;
  avg_call_duration_sec: number;
}

interface PipelineStage {
  stage: string;
  label: string;
  count: number;
}

export const Analytics: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [callDays, setCallDays] = useState<{ labels: string[]; counts: number[] }>({ labels: [], counts: [] });

  useEffect(() => {
    api.get('/analytics/dashboard').then((r) => setStats(r.data)).catch(() => {});
    api.get('/analytics/pipeline').then((r) => setPipeline(r.data.stages)).catch(() => {});
    api.get('/analytics/calls-by-day', { params: { days: 14 } }).then((r) => setCallDays(r.data)).catch(() => {});
  }, []);

  const maxPipeline = Math.max(1, ...pipeline.map((p) => p.count));
  const maxCalls = Math.max(1, ...callDays.counts);

  // Line-chart geometry (pure SVG, 560x180 viewBox)
  const W = 560, H = 180, PAD = 28;
  const points = callDays.counts.map((c, i) => {
    const x = PAD + (i * (W - 2 * PAD)) / Math.max(1, callDays.counts.length - 1);
    const y = H - PAD - (c / maxCalls) * (H - 2 * PAD);
    return { x, y, c };
  });
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = points.length > 0 ? `${linePath} L${points[points.length - 1].x},${H - PAD} L${points[0].x},${H - PAD} Z` : '';

  const kpis = stats ? [
    { icon: Target, label: 'Conversion rate', value: `${stats.conversion_rate}%`, sub: `${stats.won_leads} deals won` },
    { icon: PhoneCall, label: 'Connect rate', value: `${stats.connect_rate}%`, sub: `${stats.total_calls} AI calls total` },
    { icon: Timer, label: 'Avg call duration', value: `${Math.round(stats.avg_call_duration_sec / 60)}m ${stats.avg_call_duration_sec % 60}s`, sub: 'Per AI-handled call' },
    { icon: TrendingUp, label: 'Hot leads (80+)', value: `${stats.hot_leads}`, sub: `${stats.total_leads} leads in CRM` },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Live funnel and call performance — computed from your real CRM data.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2.5 rounded-md"><k.icon className="w-5 h-5 text-blue-600" /></div>
              <p className="text-sm font-medium text-gray-500">{k.label}</p>
            </div>
            <p className="mt-4 text-3xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline bar chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-600" /> Lead pipeline</h3>
          <div className="mt-6 space-y-3">
            {pipeline.length === 0 && <div className="h-40 animate-pulse bg-gray-50 rounded" />}
            {pipeline.map((stage) => (
              <div key={stage.stage} className="flex items-center gap-3">
                <span className="w-28 text-xs font-semibold text-gray-600 text-right shrink-0">{stage.label}</span>
                <div className="flex-1 bg-gray-100 rounded-md h-7 overflow-hidden">
                  <div
                    className={`h-7 rounded-md flex items-center justify-end pr-2 text-xs font-bold text-white transition-all duration-700 ${
                      stage.stage === 'WON' ? 'bg-green-500' : stage.stage === 'LOST' ? 'bg-red-400' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.max(4, (stage.count / maxPipeline) * 100)}%` }}
                  >
                    {stage.count > 0 && stage.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calls line chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><PhoneCall className="w-4 h-4 text-blue-600" /> AI calls — last 14 days</h3>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full">
            <defs>
              <linearGradient id="callFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((f) => (
              <line key={f} x1={PAD} x2={W - PAD} y1={H - PAD - f * (H - 2 * PAD)} y2={H - PAD - f * (H - 2 * PAD)} stroke="#e5e7eb" strokeWidth="1" />
            ))}
            {areaPath && <path d={areaPath} fill="url(#callFill)" />}
            {linePath && <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="3.5" fill="#2563eb" />
                {p.c > 0 && <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fill="#374151" fontWeight="600">{p.c}</text>}
                {i % 3 === 0 && <text x={p.x} y={H - 8} textAnchor="middle" fontSize="9" fill="#9ca3af">{callDays.labels[i]}</text>}
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
