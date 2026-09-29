import { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import api from '../../services/api';

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_location: string | null;
  configuration: string | null;
  bedrooms: number | null;
  purpose: string | null;
  lead_score: number | null;
  lead_status: string;
  created_at: string;
}

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'SITE_VISIT', 'NEGOTIATING', 'WON', 'LOST'];

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-cyan-100 text-cyan-800',
  QUALIFIED: 'bg-indigo-100 text-indigo-800',
  SITE_VISIT: 'bg-purple-100 text-purple-800',
  NEGOTIATING: 'bg-amber-100 text-amber-800',
  WON: 'bg-green-100 text-green-800',
  LOST: 'bg-red-100 text-red-800',
};

function budgetLabel(min: number | null, max: number | null): string {
  const fmt = (v: number) => (v >= 10000000 ? `₹${(v / 10000000).toFixed(2)}Cr` : `₹${(v / 100000).toFixed(0)}L`);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return '—';
}

export const Leads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/crm/leads', { params: { limit: 200 } });
      setLeads(res.data);
    } catch (e) {
      console.error('Failed to fetch leads', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeStatus = async (id: string, lead_status: string) => {
    setUpdatingId(id);
    try {
      await api.put(`/crm/leads/${id}`, { lead_status });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, lead_status } : l)));
    } catch (e) {
      console.error('Failed to update lead', e);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(
    () =>
      leads.filter((l) => {
        const hay = `${l.name ?? ''} ${l.phone ?? ''} ${l.email ?? ''} ${l.preferred_location ?? ''}`.toLowerCase();
        return hay.includes(query.toLowerCase()) && (!statusFilter || l.lead_status === statusFilter);
      }),
    [leads, query, statusFilter]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">Every enquiry from the website, voice agent and callbacks — one pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, email..."
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Users className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            No leads found. They appear here automatically when visitors enquire on the website or talk to Priya.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Lead', 'Contact', 'Requirement', 'Budget', 'Score', 'Status', 'Added'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">{lead.name || 'Anonymous'}</p>
                      <p className="text-xs text-gray-400">{lead.purpose || 'ENQUIRY'}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <p>{lead.phone || '—'}</p>
                      <p className="text-xs">{lead.email || ''}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {[lead.configuration || (lead.bedrooms ? `${lead.bedrooms} BHK` : null), lead.preferred_location].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {budgetLabel(lead.budget_min != null ? Number(lead.budget_min) : null, lead.budget_max != null ? Number(lead.budget_max) : null)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-bold ${(lead.lead_score ?? 0) >= 80 ? 'text-green-600' : (lead.lead_score ?? 0) >= 50 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {lead.lead_score != null ? Math.round(lead.lead_score) : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={lead.lead_status}
                        disabled={updatingId === lead.id}
                        onChange={(e) => changeStatus(lead.id, e.target.value)}
                        className={`text-xs font-semibold rounded-full px-2.5 py-1.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${STATUS_STYLES[lead.lead_status] ?? 'bg-gray-100 text-gray-800'}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400">{filtered.length} of {leads.length} leads</p>
    </div>
  );
};

export default Leads;
