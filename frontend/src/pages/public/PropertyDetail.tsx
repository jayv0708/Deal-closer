import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BedDouble, Bath, Ruler, MapPin, Building2, ArrowLeft, Compass,
  Calculator, PhoneCall, CheckCircle2,
} from 'lucide-react';
import publicApi, { formatPrice, propertyImage, type PublicProperty } from '../../services/publicApi';
import { EnquiryForm, PropertyCard } from '../../components/public/Shared';

export function PropertyDetail() {
  const { id } = useParams();
  const [property, setProperty] = useState<PublicProperty | null>(null);
  const [similar, setSimilar] = useState<PublicProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    publicApi
      .get(`/public/properties/${id}`)
      .then((r) => {
        setProperty(r.data);
        const loc = r.data?.project?.location;
        return publicApi.get('/public/properties', { params: { location: loc, limit: 4 } });
      })
      .then((r) => setSimilar((r?.data ?? []).filter((p: PublicProperty) => p.id !== id).slice(0, 3)))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (notFound || !property) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Property not found</h1>
        <p className="mt-2 text-gray-500">It may have been sold or the link is incorrect.</p>
        <Link to="/properties" className="mt-6 inline-block bg-sky-600 hover:bg-sky-500 text-white font-semibold px-6 py-3 rounded-md transition-colors">
          Browse all properties
        </Link>
      </div>
    );
  }

  const p = property;
  const principal = p.price ?? 0;
  const monthlyRate = rate / 12 / 100;
  const nMonths = years * 12;
  const emi = principal > 0 ? Math.round((principal * monthlyRate * Math.pow(1 + monthlyRate, nMonths)) / (Math.pow(1 + monthlyRate, nMonths) - 1)) : 0;
  const specs = [
    { icon: BedDouble, label: 'Bedrooms', value: p.bedrooms != null ? `${p.bedrooms}` : '—' },
    { icon: Bath, label: 'Bathrooms', value: p.bathrooms != null ? `${p.bathrooms}` : '—' },
    { icon: Ruler, label: 'Carpet area', value: p.carpet_area != null ? `${p.carpet_area} sq.ft` : '—' },
    { icon: Compass, label: 'Facing', value: p.facing || '—' },
    { icon: Building2, label: 'Floor', value: p.floor != null ? `${p.floor}` : '—' },
    { icon: MapPin, label: 'Unit', value: p.unit_number || '—' },
  ];

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* Hero image */}
      <div className="relative h-[380px] bg-slate-800">
        <img src={propertyImage(p.project?.name ?? 'x')} alt={p.project?.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-slate-900/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-end pb-8">
          <Link to="/properties" className="absolute top-6 left-4 sm:left-6 flex items-center gap-2 text-white/90 hover:text-white text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to listings
          </Link>
          <span className="w-fit bg-sky-600 text-white text-xs font-bold px-3 py-1.5 rounded">FOR SALE</span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white">{p.project?.name} {p.unit_number ? `· ${p.unit_number}` : ''}</h1>
          <p className="mt-2 text-gray-200 flex items-center gap-1.5">
            <MapPin className="w-4 h-4" /> {p.project?.location}, {p.project?.city} · by {p.project?.builder}
          </p>
          <p className="mt-2 text-2xl font-bold text-sky-300">{formatPrice(p.price)}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-0 pt-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-10">
          <div className="bg-white rounded-xl border border-gray-200 p-7">
            <h2 className="font-bold text-slate-900 text-lg">Overview</h2>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-5">
              {specs.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="bg-sky-50 p-2.5 rounded-lg"><s.icon className="w-5 h-5 text-sky-600" /></div>
                  <div>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="font-semibold text-slate-900 text-sm">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-3 text-sm">
              <span className={`px-3 py-1.5 rounded-full font-semibold ${p.availability ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {p.availability ? '✓ Available now' : '✗ Sold out'}
              </span>
              <span className="px-3 py-1.5 rounded-full font-semibold bg-blue-50 text-blue-700">{p.project?.status.replace(/_/g, ' ')}</span>
              {p.configuration && <span className="px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-slate-700">{p.configuration}</span>}
            </div>
          </div>

          {p.amenities && p.amenities.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-7">
              <h2 className="font-bold text-slate-900 text-lg">Amenities</h2>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {p.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> {a}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EMI calculator */}
          <div className="bg-white rounded-xl border border-gray-200 p-7">
            <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Calculator className="w-5 h-5 text-sky-600" /> EMI calculator
            </h2>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-600">Interest rate: <span className="font-bold text-slate-900">{rate}%</span></label>
                <input type="range" min="7" max="12" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full mt-2 accent-sky-600" />
                <label className="text-sm text-gray-600 block mt-4">Tenure: <span className="font-bold text-slate-900">{years} years</span></label>
                <input type="range" min="5" max="30" step="1" value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full mt-2 accent-sky-600" />
              </div>
              <div className="bg-sky-50 rounded-lg p-5 text-center flex flex-col justify-center">
                <p className="text-sm text-gray-600">Monthly EMI</p>
                <p className="text-3xl font-extrabold text-sky-700 mt-1">₹{emi.toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-500 mt-2">Full price {formatPrice(p.price)} · {years} yrs @ {rate}%</p>
              </div>
            </div>
          </div>

          {/* About project */}
          {p.project?.description && (
            <div className="bg-white rounded-xl border border-gray-200 p-7">
              <h2 className="font-bold text-slate-900 text-lg">About {p.project.name}</h2>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">{p.project.description}</p>
            </div>
          )}
        </div>

        {/* Right column: sticky enquiry */}
        <div>
          <div className="lg:sticky lg:top-24 bg-white rounded-xl border border-gray-200 p-7 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="font-bold text-slate-900 text-lg">Interested?</h2>
              <span className="text-xl font-extrabold text-slate-900">{formatPrice(p.price)}</span>
            </div>
            <p className="mt-1 text-sm text-gray-500">Share your details — Priya or a human consultant calls you back within 30 minutes.</p>
            <div className="mt-5">
              <EnquiryForm
                compact
                defaults={{ preferred_location: p.project?.location, configuration: p.configuration ?? undefined, bedrooms: p.bedrooms ?? undefined, budget_min: p.price ?? undefined, message: `I'm interested in ${p.project?.name} ${p.unit_number ?? ''} (${formatPrice(p.price)})` }}
              />
            </div>
            <a href="tel:+919876543210" className="mt-4 flex items-center justify-center gap-2 w-full border-2 border-slate-300 hover:border-sky-600 hover:text-sky-600 text-slate-700 font-semibold py-3 rounded-md transition-colors text-sm">
              <PhoneCall className="w-4 h-4" /> Call +91 98765 43210
            </a>
          </div>
        </div>
      </div>

      {/* Similar properties */}
      {similar.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Similar properties in {p.project?.location}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {similar.map((s, i) => <PropertyCard key={s.id} property={s} index={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertyDetail;
