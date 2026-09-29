import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, Bath, Ruler, MapPin, CheckCircle2, Loader2, X } from 'lucide-react';
import publicApi, { formatPrice, propertyImage, type PublicProperty, type LeadEnquiry } from '../../services/publicApi';

export function SectionHeading({ eyebrow, title, subtitle, light = false }: { eyebrow: string; title: string; subtitle?: string; light?: boolean }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-12">
      <p className={`text-xs font-bold tracking-[0.2em] uppercase ${light ? 'text-sky-300' : 'text-sky-600'}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-3xl sm:text-4xl font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
      <div className="flex items-center justify-center gap-2 mt-5">
        <span className={`h-px w-16 ${light ? 'bg-sky-400/60' : 'bg-slate-300'}`} />
        <span className={`h-px w-6 ${light ? 'bg-sky-400' : 'bg-sky-500'}`} />
        <span className={`h-px w-16 ${light ? 'bg-sky-400/60' : 'bg-slate-300'}`} />
      </div>
      {subtitle && <p className={`mt-5 text-sm leading-relaxed ${light ? 'text-sky-100' : 'text-gray-500'}`}>{subtitle}</p>}
    </div>
  );
}

export function PropertyCard({ property, index }: { property: PublicProperty; index?: number }) {
  const p = property;
  return (
    <Link
      to={`/properties/${p.id}`}
      className="group bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-300 flex flex-col"
    >
      <div className="relative h-52 overflow-hidden">
        <img
          src={propertyImage(p.project?.name ?? p.unit_number ?? 'p', index)}
          alt={p.project?.name ?? 'Property'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <span className="absolute top-3 left-3 bg-sky-600 text-white text-xs font-bold px-2.5 py-1 rounded">
          FOR SALE
        </span>
        {!p.availability && (
          <span className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded">SOLD</span>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
          {p.project?.name} {p.unit_number ? `· ${p.unit_number}` : ''}
        </h3>
        <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {p.project?.location}, {p.project?.city}
        </p>
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
          {p.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="w-4 h-4 text-sky-600" />{p.bedrooms} Beds</span>}
          {p.bathrooms != null && <span className="flex items-center gap-1"><Bath className="w-4 h-4 text-sky-600" />{p.bathrooms} Baths</span>}
          {p.carpet_area != null && <span className="flex items-center gap-1"><Ruler className="w-4 h-4 text-sky-600" />{p.carpet_area} sq.ft</span>}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-lg font-bold text-slate-900">{formatPrice(p.price)}</span>
          <span className="text-sm font-semibold text-sky-600 group-hover:translate-x-1 transition-transform">More details →</span>
        </div>
      </div>
    </Link>
  );
}

/** Reusable enquiry form -> POST /public/leads (lands in the admin CRM). */
export function EnquiryForm({
  defaults,
  compact = false,
  onDone,
}: {
  defaults?: LeadEnquiry;
  compact?: boolean;
  onDone?: () => void;
}) {
  const [form, setForm] = useState<LeadEnquiry>({ name: '', phone: '', email: '', message: '', ...defaults });
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    try {
      await publicApi.post('/public/leads', form);
      setState('done');
      onDone?.();
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
        <h3 className="mt-4 text-lg font-bold text-slate-900">Enquiry received!</h3>
        <p className="mt-2 text-sm text-gray-500">
          Our consultant (or Priya, our AI agent) will call you shortly. Your enquiry is now in our CRM.
        </p>
        {onDone && (
          <button onClick={onDone} className="mt-6 text-sm font-semibold text-sky-600 hover:text-sky-700">
            Close
          </button>
        )}
      </div>
    );
  }

  const inputCls =
    'w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500';

  return (
    <form onSubmit={submit} className={compact ? 'space-y-3' : 'space-y-4'}>
      {state === 'error' && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          Something went wrong. Please try again.
        </p>
      )}
      <div className={compact ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
        <input required placeholder="Your name *" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
        <input required placeholder="Phone number *" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
      </div>
      <input type="email" placeholder="Email address" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
      {!compact && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input placeholder="Preferred location" value={form.preferred_location ?? ''} onChange={(e) => setForm({ ...form, preferred_location: e.target.value })} className={inputCls} />
          <select value={form.configuration ?? ''} onChange={(e) => setForm({ ...form, configuration: e.target.value })} className={inputCls}>
            <option value="">Configuration</option>
            <option>1 BHK</option>
            <option>2 BHK</option>
            <option>3 BHK</option>
            <option>4 BHK</option>
            <option>Villa</option>
            <option>Plot</option>
          </select>
        </div>
      )}
      <textarea placeholder={compact ? 'I am interested in this property...' : 'Your message (optional)'} rows={compact ? 2 : 3} value={form.message ?? ''} onChange={(e) => setForm({ ...form, message: e.target.value })} className={inputCls} />
      <button
        type="submit"
        disabled={state === 'sending'}
        className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-semibold py-3 rounded-md transition-colors flex items-center justify-center gap-2"
      >
        {state === 'sending' && <Loader2 className="w-4 h-4 animate-spin" />}
        {state === 'sending' ? 'Sending...' : 'Request a Call Back'}
      </button>
    </form>
  );
}

export function EnquiryModal({ open, onClose, title, defaults }: { open: boolean; onClose: () => void; title: string; defaults?: LeadEnquiry }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-5">Fill in your details — we call you back within 30 minutes (9 AM – 9 PM).</p>
        <EnquiryForm defaults={defaults} compact onDone={onClose} />
      </div>
    </div>
  );
}

/** Animated number used in the stats band. Uses setInterval (not rAF) so it
 *  still completes in background/occluded tabs, with a final snap fallback. */
export function CountUp({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const done = () => setDisplay(value);
    const timer = setInterval(() => {
      const p = Math.min((Date.now() - start) / duration, 1);
      if (p >= 1) {
        done();
      } else {
        setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      }
    }, 50);
    const fallback = setTimeout(done, duration + 750);
    return () => {
      clearInterval(timer);
      clearTimeout(fallback);
    };
  }, [value, duration]);
  return <>{display.toLocaleString('en-IN')}</>;
}
