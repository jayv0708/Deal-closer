import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Star, Quote, Mail, CalendarDays, ArrowRight, PhoneCall } from 'lucide-react';
import publicApi, { type Agent, type NewsItem } from '../../services/publicApi';
import { EnquiryForm } from '../../components/public/Shared';

/* ---------------- About ---------------- */
export function About() {
  return (
    <div>
      <div className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-sky-400">About us</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold">A STORY OF TRUST &amp; KEYS</h1>
          <p className="mt-5 max-w-2xl mx-auto text-gray-300 text-sm leading-relaxed">
            Deal Closer blends human expertise with an AI consultant who never sleeps. We list only
            RERA-registered inventory, quote builder-verified prices, and answer every enquiry — day or night —
            in the language you're comfortable with.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: 'Verified inventory only', desc: 'Every project and unit is cross-checked against the builder\u2019s RERA filing and live price sheet before it appears here. No stale listings, ever.' },
          { title: 'AI + human, not AI vs human', desc: 'Priya qualifies every lead instantly at any hour; our human consultants take over for negotiations, site visits and registration. You get speed and judgement.' },
          { title: 'Radical transparency', desc: 'Published prices, real EMI math, honest availability. If nothing matches your budget, we say so instead of pushing you into a bad buy.' },
        ].map((item) => (
          <div key={item.title} className="bg-white border border-gray-200 rounded-xl p-7">
            <h3 className="font-bold text-slate-900">{item.title}</h3>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Quote className="w-10 h-10 text-sky-500 mx-auto" />
          <p className="mt-6 text-2xl font-semibold text-slate-800 leading-relaxed">
            “Every family deserves an advisor who answers at midnight, remembers their budget, and never
            upsells them into the wrong home.”
          </p>
          <p className="mt-6 text-sm font-bold tracking-widest text-slate-500 uppercase">— The Deal Closer Team</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Agents ---------------- */
const AGENT_PHOTOS = [
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=600&q=70',
];

export function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.get('/public/agents')
      .then((r) => setAgents(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-sky-400">Our agents</p>
          <h1 className="mt-3 text-4xl font-extrabold">WE'RE PASSIONATE ABOUT HELPING YOU</h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {loading
          ? [...Array(4)].map((_, i) => <div key={i} className="h-96 bg-white rounded-xl animate-pulse" />)
          : agents.map((agent, i) => (
              <div key={agent.id} id={`agent-${agent.id}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                <div className="aspect-[4/5] bg-gray-100">
                  <img src={AGENT_PHOTOS[i % AGENT_PHOTOS.length]} alt={agent.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-5 text-center">
                  <h3 className="font-bold text-slate-900 uppercase text-sm tracking-wide">{agent.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{agent.role}</p>
                  <a
                    href={`mailto:${agent.email}`}
                    className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-sky-600 hover:text-sky-700 border border-gray-200 rounded-md py-2.5 hover:border-sky-600 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" /> {agent.email}
                  </a>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

/* ---------------- News list + detail ---------------- */
export function News() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.get('/public/news').then((r) => setNews(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-sky-400">Latest news</p>
          <h1 className="mt-3 text-4xl font-extrabold">KEEP UPDATED WITH US</h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading
          ? [...Array(6)].map((_, i) => <div key={i} className="h-64 bg-white rounded-lg animate-pulse" />)
          : news.map((item) => (
              <Link key={item.id} to={`/news/${item.slug}`} className="bg-white rounded-lg border border-gray-200 p-7 hover:shadow-lg transition-shadow group flex flex-col">
                <p className="text-xs font-bold text-sky-600 tracking-widest">{item.category}</p>
                <h3 className="mt-3 font-bold text-slate-900 leading-snug group-hover:text-sky-600 transition-colors">{item.title}</h3>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed flex-1">{item.excerpt}</p>
                <div className="mt-5 flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{new Date(item.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="inline-flex items-center gap-1 font-bold text-slate-700 group-hover:text-sky-600">READ <ArrowRight className="w-3.5 h-3.5" /></span>
                </div>
              </Link>
            ))}
      </div>
    </div>
  );
}

export function NewsDetail() {
  const { slug } = useParams();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [others, setOthers] = useState<NewsItem[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setNotFound(false);
    publicApi.get(`/public/news/${slug}`)
      .then((r) => {
        setItem(r.data);
        return publicApi.get('/public/news');
      })
      .then((r) => setOthers((r.data as NewsItem[]).filter((n) => n.slug !== slug).slice(0, 3)))
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Article not found</h1>
        <Link to="/news" className="mt-6 inline-block bg-sky-600 text-white font-semibold px-6 py-3 rounded-md">Back to news</Link>
      </div>
    );
  }
  if (!item) return <div className="max-w-3xl mx-auto px-4 py-24"><div className="h-96 bg-gray-100 animate-pulse rounded-xl" /></div>;

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
        <Link to="/news" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-sky-600"><ArrowLeft className="w-4 h-4" /> All news</Link>
        <p className="mt-8 text-xs font-bold text-sky-600 tracking-widest">{item.category}</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">{item.title}</h1>
        <p className="mt-4 text-xs text-gray-400 flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5" />
          {new Date(item.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <p className="mt-8 text-lg text-slate-600 leading-relaxed border-l-4 border-sky-500 pl-5">{item.excerpt}</p>
        <p className="mt-6 text-slate-700 leading-relaxed">{item.body}</p>
      </div>
      {others.length > 0 && (
        <div className="bg-gray-50 py-14">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">More reading</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {others.map((o) => (
                <Link key={o.id} to={`/news/${o.slug}`} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-sky-600 tracking-widest">{o.category}</p>
                  <h3 className="mt-2 font-bold text-slate-900 text-sm leading-snug">{o.title}</h3>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Register (sales CTA) ---------------- */
export function Register() {
  const [sent, setSent] = useState(false);
  return (
    <div className="bg-sky-500 min-h-[70vh] flex items-center py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="text-white">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-sky-100">Join our network</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight">WANT TO JOIN DEAL CLOSER NETWORK?</h1>
          <p className="mt-5 text-sky-100 text-sm leading-relaxed">
            Agents and channel partners: let Priya qualify your leads 24/7 while you focus on closing.
            Home seekers: register to get priority callbacks and early access to pre-launch inventory.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {['Priority access to pre-launch inventory', 'AI-qualified leads with full requirement context', 'Site visits booked automatically by Priya'].map((li) => (
              <li key={li} className="flex items-center gap-2"><Star className="w-4 h-4 text-white" fill="currentColor" /> {li}</li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center py-10">
              <Star className="w-12 h-12 text-amber-400 mx-auto" fill="currentColor" />
              <h3 className="mt-4 text-lg font-bold text-slate-900">Welcome aboard!</h3>
              <p className="mt-2 text-sm text-gray-500">You're on the priority list. Expect a call within one working day.</p>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-bold text-slate-900 mb-5">Join the priority list</h3>
              <EnquiryFormInline onDone={() => setSent(true)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EnquiryFormInline({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: 'WANT TO JOIN DEAL CLOSER NETWORK' });
  const [sending, setSending] = useState(false);
  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500';
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setSending(true);
        try {
          await publicApi.post('/public/leads', form);
          onDone();
        } finally {
          setSending(false);
        }
      }}
    >
      <input required placeholder="Full name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
      <input required placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
      <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
      <button type="submit" disabled={sending} className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-semibold py-3 rounded-md transition-colors">
        {sending ? 'Joining...' : 'Join the Network'}
      </button>
    </form>
  );
}

/* ---------------- 404 ---------------- */
export function NotFound() {
  return (
    <div className="bg-gray-50 min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-7xl font-extrabold text-sky-600">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">This page moved out of inventory</h1>
        <p className="mt-3 text-sm text-gray-500 max-w-md mx-auto">
          The page you're looking for doesn't exist. Browse verified listings or talk to Priya — she's always in.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link to="/" className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold px-6 py-3 rounded-lg transition-colors">
            Back to Home
          </Link>
          <Link to="/properties" className="border border-slate-300 hover:border-sky-500 hover:text-sky-600 text-sm font-bold px-6 py-3 rounded-lg text-slate-700 transition-colors">
            Browse Properties
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Contact ---------------- */
export function Contact() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-sky-400">Contact</p>
          <h1 className="mt-3 text-4xl font-extrabold">GET IN TOUCH WITH US</h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Send us your requirement</h2>
          <EnquiryForm />
        </div>
        <div className="lg:col-span-2 space-y-6">
          {[
            { icon: Mail, title: 'Email', lines: ['hello@dealcloser.example', 'We reply within one working day.'] },
            { icon: PhoneCall, title: 'Phone', lines: ['+91 98765 43210', 'Mon–Sun, 9 AM – 9 PM IST'] },
            { icon: CalendarDays, title: 'Office', lines: ['1166 Wellington Street', 'Pune, MH 411045, India'] },
          ].map((c) => (
            <div key={c.title} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="bg-sky-50 p-2.5 rounded-lg"><c.icon className="w-5 h-5 text-sky-600" /></div>
                <h3 className="font-bold text-slate-900">{c.title}</h3>
              </div>
              <div className="mt-3 text-sm text-gray-500">
                <p>{c.lines[0]}</p>
                <p className="mt-1">{c.lines[1]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
