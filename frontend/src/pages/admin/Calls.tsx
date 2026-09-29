import { useEffect, useState } from 'react';
import { Phone, Clock, Calendar, FileText, X } from 'lucide-react';
import api from '../../services/api';

interface CallRecord {
  id: string;
  call_id: string | null;
  direction: string | null;
  status: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration: number | null;
  transcript: string | null;
  summary: string | null;
  lead_id: string | null;
  lead_name: string | null;
}

function fmtDuration(sec: number | null): string {
  if (!sec || sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Transcript rows look like "PRIYA: ..." / "CUSTOMER: ..." separated by newlines. */
function parseTranscript(text: string | null): { speaker: string; text: string }[] {
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(PRIYA|CUSTOMER|AGENT|USER|AI)\s*[:\-]\s*(.*)$/i);
      if (m) return { speaker: m[1].toUpperCase(), text: m[2] };
      return { speaker: 'CALL', text: line };
    });
}

export const Calls: React.FC = () => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CallRecord | null>(null);

  useEffect(() => {
    api
      .get('/crm/calls', { params: { limit: 200 } })
      .then((res) => setCalls(res.data))
      .catch((e) => console.error('Failed to fetch calls', e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Call History</h1>
        <p className="text-sm text-gray-500 mt-1">
          Every AI-handled call with duration, transcript and the Gemini-written summary. Click a row for details.
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : calls.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Phone className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            No calls yet. Calls taken by the voice agent appear here automatically after each session ends.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Caller', 'Direction', 'Started', 'Duration', 'Status', ''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calls.map((call) => (
                  <tr key={call.id} onClick={() => setSelected(call)} className="hover:bg-blue-50/50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {call.lead_name || 'Guest caller'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${call.direction === 'OUTBOUND' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {call.direction ?? 'INBOUND'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {call.started_at ? new Date(call.started_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{fmtDuration(call.duration)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        call.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        call.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                        call.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {call.status ?? 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-blue-600">View</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-full max-w-xl h-full shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{selected.lead_name || 'Guest caller'}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtDuration(selected.duration)}</span>
                  {selected.started_at && (
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(selected.started_at).toLocaleString('en-IN')}</span>
                  )}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 text-gray-400 hover:text-gray-600" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selected.summary && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> AI Summary</h4>
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">{selected.summary}</p>
                </div>
              )}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Transcript</h4>
                <div className="space-y-3">
                  {parseTranscript(selected.transcript).map((row, i) => {
                    const isPriya = row.speaker.includes('PRIYA') || row.speaker === 'AI' || row.speaker === 'AGENT';
                    return (
                      <div key={i} className={`flex ${isPriya ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                          isPriya ? 'bg-gray-100 text-slate-800' : 'bg-blue-600 text-white'
                        }`}>
                          <p className={`text-[10px] font-bold uppercase mb-0.5 ${isPriya ? 'text-gray-500' : 'text-blue-200'}`}>{row.speaker}</p>
                          {row.text}
                        </div>
                      </div>
                    );
                  })}
                  {!selected.transcript && <p className="text-sm text-gray-400">No transcript recorded for this call.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calls;
