import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Building2, Phone } from 'lucide-react';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/properties', label: 'Buy' },
  { to: '/agents', label: 'Agents' },
  { to: '/about', label: 'About' },
  { to: '/news', label: 'News' },
  { to: '/contact', label: 'Contact' },
];

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Building2 className="w-6 h-6 text-sky-400" />
          Deal Closer
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `px-3 py-2 text-[13px] font-semibold tracking-wide uppercase transition-colors rounded-md ${
                  isActive ? 'text-sky-400' : 'text-gray-300 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        <a
          href="tel:+919876543210"
          className="ml-3 hidden lg:flex items-center gap-2 bg-sky-600 hover:bg-sky-500 transition-colors px-4 py-2 rounded-md text-sm font-semibold"
        >
            <Phone className="w-4 h-4" />
            +91 98765 43210
          </a>
          <button
            onClick={() => navigate('/login')}
            className="ml-2 px-4 py-2 rounded-md text-sm font-semibold border border-slate-600 hover:border-sky-400 hover:text-sky-400 transition-colors"
          >
            Admin Login
          </button>
        </nav>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pb-4">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm font-semibold uppercase tracking-wide text-gray-300 hover:text-sky-400 border-b border-slate-800"
            >
              {item.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-4">
            <a href="tel:+919876543210" className="flex-1 text-center bg-sky-600 px-4 py-2 rounded-md text-sm font-semibold">
              Call Us
            </a>
            <button
              onClick={() => { setOpen(false); navigate('/login'); }}
              className="flex-1 text-center border border-slate-600 px-4 py-2 rounded-md text-sm font-semibold"
            >
              Admin Login
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 text-xl font-bold text-white mb-4">
            <Building2 className="w-6 h-6 text-sky-400" />
            Deal Closer
          </div>
          <p className="text-sm leading-relaxed">
            AI-powered real estate sales. Talk to Priya, our Hinglish-speaking consultant, 24/7 — or browse verified,
            RERA-registered inventory across Pune.
          </p>
          <p className="mt-4 text-sm">1166 Wellington Street, Pune, MH 411045</p>
          <p className="mt-2 text-sm">+91 98765 43210</p>
          <p className="text-sm">hello@dealcloser.example</p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Explore</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/properties?purpose=buy" className="hover:text-sky-400 transition-colors">Properties for Sale</Link></li>
            <li><Link to="/properties?bedrooms=2" className="hover:text-sky-400 transition-colors">2 BHK Homes</Link></li>
            <li><Link to="/properties?bedrooms=3" className="hover:text-sky-400 transition-colors">3 BHK Homes</Link></li>
            <li><Link to="/agents" className="hover:text-sky-400 transition-colors">Our Agents</Link></li>
            <li><Link to="/news" className="hover:text-sky-400 transition-colors">Latest News</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-sky-400 transition-colors">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-sky-400 transition-colors">Contact</Link></li>
            <li><Link to="/register" className="hover:text-sky-400 transition-colors">Join Our Network</Link></li>
            <li><Link to="/login" className="hover:text-sky-400 transition-colors">Team Login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Talk to Priya 24/7</h4>
          <p className="text-sm leading-relaxed mb-4">
            Our AI consultant answers calls instantly, in Hinglish, books site visits, and never sleeps.
          </p>
          <Link
            to="/properties"
            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition-colors"
          >
            Start Browsing
          </Link>
          <div className="flex gap-3 mt-6">
            <a href="#" aria-label="Facebook" className="p-2 bg-slate-800 hover:bg-sky-600 rounded-md transition-colors"><svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.7c0-.9.3-1.6 1.7-1.6h1.5V3.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.7H7.8V13h2.7v8h3z"/></svg></a>
            <a href="#" aria-label="Twitter" className="p-2 bg-slate-800 hover:bg-sky-600 rounded-md transition-colors"><svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.9 4h2.9l-6.4 7.3L23 20h-5.9l-4.6-6-5.3 6H4.3l6.9-7.8L4 4h6.1l4.1 5.5L18.9 4zm-1 14.2h1.6L8.7 5.7H7L17.9 18.2z"/></svg></a>
            <a href="#" aria-label="Instagram" className="p-2 bg-slate-800 hover:bg-sky-600 rounded-md transition-colors"><svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.8.1-1.1.1-1.5.2-1.9.3-.5.2-.8.4-1.1.7-.3.3-.5.6-.7 1.1-.1.4-.3.8-.3 1.9-.1 1.3-.1 1.6-.1 4.8s0 3.5.1 4.8c.1 1.1.2 1.5.3 1.9.2.5.4.8.7 1.1.3.3.6.5 1.1.7.4.1.8.3 1.9.3 1.3.1 1.6.1 4.8.1s3.5 0 4.8-.1c1.1-.1 1.5-.2 1.9-.3.5-.2.8-.4 1.1-.7.3-.3.5-.6.7-1.1.1-.4.3-.8.3-1.9.1-1.3.1-1.6.1-4.8s0-3.5-.1-4.8c-.1-1.1-.2-1.5-.3-1.9-.2-.5-.4-.8-.7-1.1-.3-.3-.6-.5-1.1-.7-.4-.1-.8-.3-1.9-.3-1.3-.1-1.6-.1-4.8-.1zm0 3.1a4.9 4.9 0 110 9.8 4.9 4.9 0 010-9.8zm0 8.1a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zm6.2-8.3a1.1 1.1 0 11-2.3 0 1.1 1.1 0 012.3 0z"/></svg></a>
            <a href="#" aria-label="LinkedIn" className="p-2 bg-slate-800 hover:bg-sky-600 rounded-md transition-colors"><svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6.9 8.6H3.6V21h3.3V8.6zM5.3 3a2 2 0 100 4.1 2 2 0 000-4.1zM20.9 13.9c0-3.2-1.7-4.7-4-4.7-1.8 0-2.7 1-3.1 1.7V8.6h-3.4V21h3.4v-6.5c0-1.7.3-3.4 2.4-3.4 2 0 2.1 1.9 2.1 3.5V21h3.3v-7.1z"/></svg></a>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 py-6 text-center text-xs">
        <p>© 2026 Deal Closer Inc. All rights reserved. RERA-registered listings only.</p>
      </div>
    </footer>
  );
}
