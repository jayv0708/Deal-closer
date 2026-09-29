import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, FileText, DoorOpen, Loader2, Plus } from 'lucide-react';
import api from '../../services/api';
import { formatPrice } from '../../services/publicApi';

interface Project {
  id: string;
  name: string;
  builder: string;
  city: string;
  location: string;
  status: string;
  description: string | null;
}

interface Property {
  id: string;
  unit_number: string | null;
  configuration: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carpet_area: number | null;
  price: number | null;
  availability: boolean | null;
}

interface DocumentRow {
  id: string;
  filename: string;
  document_type: string;
  processing_status: string;
}

export const ProjectDetail: React.FC = () => {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ unit_number: '', configuration: '2 BHK', bedrooms: '2', bathrooms: '2', carpet_area: '', price: '' });

  const load = async () => {
    try {
      const [p, props, docs] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/properties/projects/${id}/properties`),
        api.get(`/documents/project/${id}`),
      ]);
      setProject(p.data);
      setProperties(props.data);
      setDocuments(docs.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/properties/projects/${id}/properties`, {
        unit_number: form.unit_number || null,
        configuration: form.configuration,
        bedrooms: Number(form.bedrooms) || null,
        bathrooms: Number(form.bathrooms) || null,
        carpet_area: form.carpet_area ? Number(form.carpet_area) : null,
        price: form.price ? Number(form.price) : null,
        availability: true,
      });
      setShowAdd(false);
      setForm({ unit_number: '', configuration: '2 BHK', bedrooms: '2', bathrooms: '2', carpet_area: '', price: '' });
      await load();
    } catch (err) {
      console.error('Failed to add property', err);
      alert('Failed to add unit. Check the values and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }
  if (error || !project) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Project not found.</p>
        <Link to="/admin/projects" className="mt-4 inline-block text-blue-600 font-medium">Back to projects</Link>
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/projects" className="text-gray-400 hover:text-gray-600 transition-colors"><ArrowLeft className="w-6 h-6" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" /> {project.name}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> {project.location}, {project.city} · {project.builder}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Unit
        </button>
      </div>

      {/* Add unit form */}
      {showAdd && (
        <form onSubmit={addProperty} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">New unit in {project.name}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <input placeholder="Unit no." value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} className={inputCls} />
            <select value={form.configuration} onChange={(e) => setForm({ ...form, configuration: e.target.value })} className={inputCls}>
              {['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Penthouse', 'Villa'].map((c) => <option key={c}>{c}</option>)}
            </select>
            <input type="number" min="1" placeholder="Beds" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} className={inputCls} />
            <input type="number" min="1" placeholder="Baths" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} className={inputCls} />
            <input type="number" placeholder="Carpet sq.ft" value={form.carpet_area} onChange={(e) => setForm({ ...form, carpet_area: e.target.value })} className={inputCls} />
            <input type="number" placeholder="Price ₹" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} />
            <button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-md px-4 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
            </button>
          </div>
        </form>
      )}

      {/* Units */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><DoorOpen className="w-4 h-4 text-blue-600" /> Units ({properties.length})</h2>
        </div>
        {properties.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-500">No units yet. Click "Add Unit" to create inventory — units appear on the public site instantly.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Unit', 'Config', 'Beds/Baths', 'Carpet', 'Price', 'Availability'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {properties.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{u.unit_number || '—'}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-600">{u.configuration || '—'}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-600">{u.bedrooms ?? '—'} / {u.bathrooms ?? '—'}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-600">{u.carpet_area ? `${u.carpet_area} sq.ft` : '—'}</td>
                    <td className="px-6 py-3.5 text-sm font-semibold text-gray-900">{formatPrice(u.price != null ? Number(u.price) : null)}</td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${u.availability ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {u.availability ? 'Available' : 'Sold'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" /> Knowledge Base Documents ({documents.length})</h2>
        </div>
        {documents.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">No documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {documents.map((d) => (
              <li key={d.id} className="px-6 py-3.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-700"><FileText className="w-4 h-4 text-gray-400" /> {d.filename}</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  d.processing_status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                  d.processing_status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {d.processing_status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
