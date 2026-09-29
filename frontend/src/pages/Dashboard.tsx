import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Users, Building, PhoneIncoming, MessageSquare } from 'lucide-react';
import api from '../services/api';
import { VoiceWidget } from '../components/VoiceWidget';

interface RecentCall {
  id: string;
  lead_name: string | null;
  duration: number | null;
  started_at: string | null;
  status: string | null;
  summary: string | null;
}

function fmtDuration(sec: number | null): string {
  if (!sec || sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export const Dashboard: React.FC = () => {
  const [showVoiceTest, setShowVoiceTest] = useState(false);
  const [data, setData] = useState({
    total_projects: 0,
    total_leads: 0,
    total_calls: 0,
    hot_leads: 0,
    conversion_rate: 0,
  });
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);

  useEffect(() => {
    api.get('/analytics/dashboard').then((res) => setData(res.data)).catch((e) => console.error('Failed to fetch analytics', e));
    api.get('/crm/calls', { params: { limit: 5 } })
      .then((res) => setRecentCalls(res.data))
      .catch((e) => console.error('Failed to fetch recent calls', e));
  }, []);

  const stats = [
    { name: 'Total Active Projects', stat: data.total_projects, icon: Building, change: 'live', changeType: 'increase' as const },
    { name: 'Total Leads Generated', stat: data.total_leads, icon: Users, change: 'live', changeType: 'increase' as const },
    { name: 'Calls Handled by AI', stat: data.total_calls, icon: Phone, change: 'live', changeType: 'increase' as const },
    { name: 'Hot Leads (Score > 80)', stat: data.hot_leads, icon: PhoneIncoming, change: `${data.conversion_rate}% won`, changeType: 'increase' as const },
  ];

  return (
    <div className="space-y-6">
      {showVoiceTest && <VoiceWidget onClose={() => setShowVoiceTest(false)} />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Overview</h1>
        <button
          onClick={() => setShowVoiceTest(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          Test Voice Agent
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow-sm rounded-lg border border-gray-200 overflow-hidden"
          >
            <dt>
              <div className="absolute bg-blue-50 rounded-md p-3">
                <item.icon className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <p className="ml-16 text-sm font-medium text-gray-500 truncate">{item.name}</p>
            </dt>
            <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">{item.stat}</p>
              <p className="ml-2 flex items-baseline text-xs font-semibold text-gray-400">
                {item.change}
              </p>
            </dd>
          </div>
        ))}
      </div>

      {/* Recent Calls Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent AI Interactions</h3>
          <Link to="/admin/calls" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Caller', 'Started', 'Duration', 'Status', 'Summary'].map((h) => (
                  <th key={h} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentCalls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                    No calls yet — click "Test Voice Agent" to talk to Priya, or enquire on the public site.
                  </td>
                </tr>
              ) : (
                recentCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {call.lead_name || 'Guest caller'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {call.started_at
                        ? new Date(call.started_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmtDuration(call.duration)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        call.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        call.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                        call.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {call.status ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {call.summary || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
