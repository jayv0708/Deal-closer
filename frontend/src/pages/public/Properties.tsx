import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, MessageSquareText, RotateCcw } from 'lucide-react';
import publicApi, { type LocationStat, type PublicProperty } from '../../services/publicApi';
import { PropertyCard, EnquiryModal } from '../../components/public/Shared';

const BUDGETS = [
  { label: 'Any budget', min: '', max: '' },
  { label: 'Under ₹50 Lac', min: '', max: '5000000' },
  { label: '₹50 Lac – ₹75 Lac', min: '5000000', max: '7500000' },
  { label: '₹75 Lac – ₹1 Cr', min: '7500000', max: '10000000' },
  { label: '₹1 Cr – ₹1.5 Cr', min: '10000000', max: '15000000' },
  { label: 'Above ₹1.5 Cr', min: '15000000', max: '' },
];

export function Properties() {
  const [params, setParams] = useSearchParams();
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [locations, setLocations] = useState<LocationStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnquiry, setShowEnquiry] = useState(false);

  const q = params.get('q') ?? '';
  const location = params.get('location') ?? '';
  const bedrooms = params.get('bedrooms') ?? '';
  const minPrice = params.get('min_price') ?? '';
  const maxPrice = params.get('max_price') ?? '';

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await publicApi.get('/public/properties', {
        params: {
          q: q || undefined,
          location: location || undefined,
          bedrooms: bedrooms || undefined,
          min_price: minPrice || undefined,
          max_price: maxPrice || undefined,
          limit: 60,
        },
      });
      setProperties(res.data);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [q, location, bedrooms, minPrice, maxPrice]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    publicApi.get('/public/locations').then((r) => setLocations(r.data)).catch(() => {});
  }, []);

  const activeFilters = [q, location, bedrooms && `${bedrooms} BHK`, (minPrice || maxPrice) && 'budget'].filter(Boolean).length;
  const budgetValue = BUDGETS.findIndex((b) => b.min === minPrice && b.max === maxPrice);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header band */}
      <div className="bg-slate-900 text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Find your new home</h1>
          <p className="mt-2 text-gray-300 text-sm">Every listing is live in our CRM and verified against the builder's price sheet.</p>
          <div className="mt-6 max-w-2xl flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                defaultValue={q}
                onKeyDown={(e) => e.key === 'Enter' && setParam('q', (e.target as HTMLInputElement).value)}
                placeholder="Search project, location or city..."
                className="w-full pl-10 pr-4 py-3 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <button
              onClick={() => setShowEnquiry(true)}
              className="hidden sm:flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold px-5 py-3 rounded-md transition-colors"
            >
              <MessageSquareText className="w-4 h-4" />
              Request callback
            </button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </span>
          <select
            value={location}
            onChange={(e) => setParam('location', e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.name} value={l.name}>{l.name}, {l.city}</option>
            ))}
          </select>
          <div className="flex gap-1">
            {['', '2', '3', '4'].map((b) => (
              <button
                key={b || 'any'}
                onClick={() => setParam('bedrooms', b)}
                className={`px-3 py-2 text-xs font-bold rounded-md transition-colors ${
                  bedrooms === b ? 'bg-sky-600 text-white' : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                }`}
              >
                {b ? `${b} BHK` : 'ANY'}
              </button>
            ))}
          </div>
          <select
            value={budgetValue >= 0 ? budgetValue : 0}
            onChange={(e) => {
              const b = BUDGETS[Number(e.target.value)];
              setParam('min_price', b.min);
              setParam('max_price', b.max);
            }}
            className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {BUDGETS.map((b, i) => (
              <option key={b.label} value={i}>{b.label}</option>
            ))}
          </select>
          {activeFilters > 0 && (
            <button
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
              className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear all ({activeFilters})
            </button>
          )}
          <span className="ml-auto text-sm text-gray-500">
            {loading ? 'Searching…' : `${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} found`}
          </span>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-80 bg-white rounded-lg animate-pulse" />)}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-slate-900">No properties match those filters</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Try widening the budget or location — or leave your requirement and our AI consultant will call you the moment a match lands.
            </p>
            <button onClick={() => setShowEnquiry(true)} className="mt-6 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold px-6 py-3 rounded-md transition-colors">
              Tell us what you need
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((p, i) => <PropertyCard key={p.id} property={p} index={i} />)}
          </div>
        )}
      </div>

      <EnquiryModal
        open={showEnquiry}
        onClose={() => setShowEnquiry(false)}
        title="Request a callback"
        defaults={{ preferred_location: location || undefined, bedrooms: bedrooms ? Number(bedrooms) : undefined, budget_min: minPrice ? Number(minPrice) : undefined, budget_max: maxPrice ? Number(maxPrice) : undefined }}
      />
    </div>
  );
}

export default Properties;
