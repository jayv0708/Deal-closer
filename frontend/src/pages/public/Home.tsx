import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, TrendingUp, Compass, UserCheck, Play, Quote, Star, ArrowRight,
  PhoneCall, MessageSquareText, IndianRupee, ShieldCheck,
} from 'lucide-react';
import publicApi, { type SiteStats, type LocationStat, type PublicProperty, type Testimonial, type Agent, type NewsItem } from '../../services/publicApi';
import { SectionHeading, PropertyCard, CountUp } from '../../components/public/Shared';

const SEARCH_LOCATIONS = ['Hinjewadi', 'Wakad', 'Baner', 'Kharadi', 'Hadapsar', 'Balewadi'];

const HOW_STEPS = [
  {
    icon: Search,
    title: 'Search for an appropriate property',
    desc: 'Filter verified, RERA-registered inventory by location, budget and configuration. Every listing is price-verified against the builder\u2019s sheet.',
  },
  {
    icon: MessageSquareText,
    title: 'Talk to Priya, your AI consultant',
    desc: 'She speaks Hinglish, knows every unit\u2019s price and floor plan, answers instantly at any hour, and never loses your context.',
  },
  {
    icon: PhoneCall,
    title: 'Book your site visit',
    desc: 'Priya books your visit, our human expert picks up from there \u2014 negotiation to registration, handled end to end.',
  },
];

export function Home() {
  const navigate = useNavigate();
  const [dealType, setDealType] = useState('buy');
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [locations, setLocations] = useState<LocationStat[]>([]);
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [tIndex, setTIndex] = useState(0);

  useEffect(() => {
    publicApi.get('/public/stats').then((r) => setStats(r.data)).catch(() => {});
    publicApi.get('/public/locations').then((r) => setLocations(r.data)).catch(() => {});
    publicApi.get('/public/properties?limit=5').then((r) => setProperties(r.data)).catch(() => {});
    publicApi.get('/public/properties', { params: { limit: 6 } }).then((r) => setProperties(r.data)).catch(() => {});
    publicApi.get('/public/testimonials').then((r) => setTestimonials(r.data)).catch(() => {});
    publicApi.get('/public/agents').then((r) => setAgents(r.data.slice(0, 4))).catch(() => {});
    publicApi.get('/public/news', { params: { limit: 3 } }).then((r) => setNews(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (testimonials.length < 2) return;
    const t = setInterval(() => setTIndex((i) => (i + 1) % testimonials.length), 6000);
    return () => clearInterval(t);
  }, [testimonials.length]);

  const runSearch = () => navigate(`/properties?q=${encodeURIComponent(query)}`);

  const featureCards = [
    { icon: TrendingUp, title: 'Price lookup', desc: 'Real-time prices verified against builder sheets — no stale listings, no bait pricing.', link: '/properties', cta: 'TRY IT NOW' },
    { icon: Compass, title: 'Discover', desc: 'Explore every micro-market we cover with inventory heat maps and honest price trends.', link: '/properties', cta: 'ADVANCED SEARCH' },
    { icon: UserCheck, title: 'Find an agent', desc: 'Human experts backed by AI — instant answers, site visits booked in minutes.', link: '/agents', cta: 'GET STARTED' },
  ];

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="relative bg-slate-800">
        <img
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=70"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900/85" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-28 text-center">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight">
            DISCOVER YOUR SWEET HOME
          </h1>
          <p className="mt-4 text-sky-100 text-lg">Look for 50,000+ properties to find the most suitable</p>
          <div className="mt-10 max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
            <select
              value={dealType}
              onChange={(e) => setDealType(e.target.value)}
              className="px-4 py-3.5 rounded-md bg-white text-slate-800 text-sm font-semibold focus:outline-none"
            >
              <option value="buy">BUY</option>
              <option value="rent">RENT</option>
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="Search by state, suburb or postcode..."
              className="flex-1 px-5 py-3.5 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              onClick={runSearch}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-8 py-3.5 rounded-md transition-colors"
            >
              SEARCH
            </button>
          </div>
          <div className="mt-4 text-xs text-sky-200/80 flex flex-wrap justify-center gap-2">
            Trending:
            {SEARCH_LOCATIONS.map((loc) => (
              <button key={loc} onClick={() => navigate(`/properties?location=${loc}`)} className="underline hover:text-white">
                {loc}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURE CARDS (overlapping hero) ============ */}
      <section className="relative z-10 -mt-14 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featureCards.map((card) => (
            <Link
              key={card.title}
              to={card.link}
              className="bg-slate-900/95 backdrop-blur border border-slate-700 hover:border-sky-500 transition-colors p-7 group"
            >
              <div className="flex items-start gap-5">
                <card.icon className="w-9 h-9 text-sky-400 shrink-0" strokeWidth={1.5} />
                <div>
                  <h3 className="text-white font-bold text-lg">{card.title}</h3>
                  <p className="mt-2 text-sm text-gray-400 leading-relaxed">{card.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold tracking-widest text-sky-400 group-hover:gap-2 transition-all">
                    {card.cta} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ WHERE TO FIND A HOME (locations mosaic) ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-8">
        <SectionHeading
          eyebrow="Best places in town"
          title="Where to find dream home"
          subtitle="From the IT buzz of Hinjewadi to Wakad's family-friendly lanes — explore real inventory counts from our live database, not marketing fluff."
        />
        {locations.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {locations.slice(0, 8).map((loc, i) => (
              <Link
                key={loc.name}
                to={`/properties?location=${encodeURIComponent(loc.name)}`}
                className="group relative h-44 md:h-52 overflow-hidden rounded-lg"
              >
                <img
                  src={`https://images.unsplash.com/photo-${['1545324418-cc1a3fa10c00', '1600585152220-90363fe7e115', '1512917774080-9991f1c4c750', '1487958449943-2429e8be8625', '1580587771525-78b9dba3b914', '1560448204-e02f11c3d0e2', '1522708323590-d24dbb6b0267', '1613490493576-7fde63acd811'][i % 8]}?auto=format&fit=crop&w=800&q=70`}
                  alt={loc.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4">
                  <h3 className="text-white font-bold uppercase tracking-wide text-sm">{loc.name}</h3>
                  <p className="text-sky-300 text-xs mt-0.5">{loc.property_count} properties</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="h-40 animate-pulse bg-gray-100 rounded-lg" />
        )}
        <div className="text-center mt-10">
          <Link to="/properties" className="inline-block bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold px-8 py-3 rounded-md transition-colors">
            All places
          </Link>
        </div>
      </section>

      {/* ============ 3 SIMPLE STEPS ============ */}
      <section className="mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="bg-sky-500 text-white p-10 lg:p-16">
            <p className="text-xs font-bold tracking-[0.25em] uppercase text-sky-100">How to start</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">3 simple steps</h2>
            <div className="mt-10 space-y-8">
              {HOW_STEPS.map((step, i) => (
                <div key={step.title} className="flex gap-5">
                  <div className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <step.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">{step.title}</h3>
                    <p className="mt-1 text-sm text-sky-100 leading-relaxed">{step.desc}</p>
                  </div>
                  <span className="ml-auto text-3xl font-extrabold text-white/30">{i + 1}</span>
                </div>
              ))}
            </div>
            <Link to="/contact" className="mt-10 inline-block bg-white text-sky-600 font-bold text-sm px-7 py-3 rounded-md hover:bg-sky-50 transition-colors">
              Get Started Today
            </Link>
          </div>
          <div className="relative min-h-[320px] bg-slate-800 group cursor-pointer" onClick={() => navigate('/about')}>
            <img
              src="https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1400&q=70"
              alt="Our story"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-slate-900/55 group-hover:bg-slate-900/45 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-sky-500 group-hover:scale-110 transition-transform flex items-center justify-center shadow-2xl">
                  <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                </div>
                <p className="mt-5 text-white text-sm font-semibold tracking-[0.25em] uppercase">A story of</p>
                <p className="text-white/80 text-xs tracking-[0.35em] uppercase mt-1">trust &amp; keys</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHAT'S NEW TODAY (property tabs) ============ */}
      <section className="bg-gray-50 mt-16 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading eyebrow="Recent properties" title="What's new today" />
          <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
            {[
              { key: 'new', label: 'NEWEST LISTINGS' },
              { key: '2', label: '2 BHK' },
              { key: '3', label: '3 BHK' },
              { key: 'budget', label: 'UNDER ₹75 LAC' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key === 'new') publicApi.get('/public/properties', { params: { limit: 6 } }).then((r) => setProperties(r.data));
                  else if (tab.key === 'budget') publicApi.get('/public/properties', { params: { limit: 6, max_price: 7500000 } }).then((r) => setProperties(r.data));
                  else publicApi.get('/public/properties', { params: { limit: 6, bedrooms: tab.key } }).then((r) => setProperties(r.data));
                }}
                className="px-4 py-2 text-xs font-bold tracking-wider rounded-md transition-colors text-slate-600 hover:text-sky-600 hover:bg-sky-50"
              >
                {tab.label}
              </button>
            ))}
          </div>
          {properties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((p, i) => (
                <PropertyCard key={p.id} property={p} index={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => <div key={i} className="h-80 bg-white rounded-lg animate-pulse" />)}
            </div>
          )}
          <div className="text-center mt-10">
            <Link to="/properties" className="inline-block border-2 border-sky-600 text-sky-600 hover:bg-sky-600 hover:text-white text-sm font-bold px-8 py-3 rounded-md transition-colors">
              View all properties
            </Link>
          </div>
        </div>
      </section>

      {/* ============ WHY CHOOSE US / TESTIMONIALS ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <SectionHeading
          eyebrow="Why choose us"
          title="What others say about us"
          subtitle="Real feedback from families who found their home with Deal Closer."
        />
        {testimonials.length > 0 && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-xl p-8 sm:p-10 text-center shadow-sm">
              <Quote className="w-8 h-8 text-sky-500 mx-auto" />
              <p className="mt-5 text-lg text-slate-700 leading-relaxed min-h-[96px]">
                “{testimonials[tIndex % testimonials.length].quote}”
              </p>
              <div className="flex justify-center gap-1 mt-4">
                {[...Array(testimonials[tIndex % testimonials.length].rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400" fill="currentColor" />
                ))}
              </div>
              <p className="mt-4 font-bold text-slate-900 text-sm">{testimonials[tIndex % testimonials.length].name}</p>
              <p className="text-xs text-gray-500">{testimonials[tIndex % testimonials.length].role}</p>
            </div>
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTIndex(i)}
                  aria-label={`Testimonial ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${i === tIndex % testimonials.length ? 'w-6 bg-sky-600' : 'w-2 bg-gray-300 hover:bg-gray-400'}`}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ============ TWO CTA BANNERS ============ */}
      <section className="grid grid-cols-1 lg:grid-cols-2">
        <div className="relative bg-slate-800 min-h-[280px]">
          <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=70" alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-slate-900/70" />
          <div className="relative p-10 lg:p-14 flex flex-col justify-center h-full">
            <p className="text-sky-300 text-xs font-bold tracking-[0.25em] uppercase">I'm a home seeker</p>
            <h3 className="mt-3 text-3xl font-bold text-white leading-tight">LOOKING FOR<br />A SWEET HOME</h3>
            <p className="mt-3 text-gray-300 text-sm">Your happiness is our highest priority.</p>
            <Link to="/register" className="mt-6 inline-block w-fit bg-white text-slate-900 font-bold text-sm px-7 py-3 rounded-md hover:bg-sky-50 transition-colors">
              Register
            </Link>
          </div>
        </div>
        <div className="relative bg-sky-500 min-h-[280px]">
          <div className="relative p-10 lg:p-14 flex flex-col justify-center h-full">
            <p className="text-sky-100 text-xs font-bold tracking-[0.25em] uppercase">I'm an agent</p>
            <h3 className="mt-3 text-3xl font-bold text-white leading-tight">WANT TO JOIN<br />DEAL CLOSER NETWORK</h3>
            <p className="mt-3 text-sky-100 text-sm">Ride the AI wave — let Priya qualify leads while you close.</p>
            <Link to="/register" className="mt-6 inline-block w-fit bg-white text-sky-600 font-bold text-sm px-7 py-3 rounded-md hover:bg-sky-50 transition-colors">
              Join Us
            </Link>
          </div>
        </div>
      </section>

      {/* ============ OUR AGENTS ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <SectionHeading eyebrow="Our agents" title="We're passionate about helping you" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {agents.map((agent, i) => (
            <Link key={agent.id} to={`/agents#agent-${agent.id}`} className="group">
              <div className="rounded-xl overflow-hidden bg-gray-100 aspect-[3/4]">
                <img
                  src={`https://images.unsplash.com/photo-${['1560250097-0b93528c311a', '1573496359142-b8d87734a5a2', '1507003211169-0a1dd7228f2d', '1573497019940-1c28c88b4f3e'][i % 4]}?auto=format&fit=crop&w=500&q=70`}
                  alt={agent.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="text-center mt-4">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide group-hover:text-sky-600 transition-colors">{agent.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{agent.role}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ LATEST NEWS ============ */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading eyebrow="Latest news" title="Keep updated with us" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {news.map((item) => (
              <Link key={item.id} to={`/news/${item.slug}`} className="bg-white rounded-lg border border-gray-200 p-7 hover:shadow-lg transition-shadow group">
                <p className="text-xs font-bold text-sky-600 tracking-widest">{item.category}</p>
                <h3 className="mt-3 font-bold text-slate-900 leading-snug group-hover:text-sky-600 transition-colors line-clamp-2">{item.title}</h3>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed line-clamp-3">{item.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold tracking-widest text-slate-700 group-hover:text-sky-600">
                  CONTINUE READING <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/news" className="text-sm font-bold tracking-widest text-slate-700 hover:text-sky-600 transition-colors">
              VIEW ALL NEWS
            </Link>
          </div>
        </div>
      </section>

      {/* ============ STATS BAND ============ */}
      <section className="relative bg-slate-900 py-16 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1920&q=60" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" loading="lazy" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats && (
            <>
              {[
                { value: stats.happy_customers, suffix: '+', label: 'HAPPY CUSTOMERS' },
                { value: Math.max(stats.agents_count, 4), suffix: '+', label: 'EXPERIENCED AGENTS' },
                { value: stats.total_properties, suffix: '+', label: 'LISTED PROPERTIES' },
                { value: stats.total_locations, suffix: '', label: 'MICRO-MARKETS COVERED' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-4xl sm:text-5xl font-extrabold text-white">
                    <CountUp value={s.value} />{s.suffix}
                  </p>
                  <p className="mt-2 text-xs font-bold tracking-[0.2em] text-sky-400">{s.label}</p>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <section className="bg-white border-t border-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: ShieldCheck, label: 'RERA-verified inventory' },
            { icon: IndianRupee, label: 'Transparent pricing' },
            { icon: MessageSquareText, label: 'AI consultant 24/7' },
            { icon: PhoneCall, label: 'Callback in 30 min' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-700">
              <item.icon className="w-5 h-5 text-sky-600" />
              {item.label}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
