import axios from 'axios';

/** Public (no-auth) API client for the marketing site. */
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

export interface SiteStats {
  total_properties: number;
  total_projects: number;
  total_locations: number;
  happy_customers: number;
  agents_count: number;
}

export interface LocationStat {
  name: string;
  city: string;
  property_count: number;
}

export interface PublicProject {
  id: string;
  name: string;
  builder: string;
  description: string | null;
  city: string;
  location: string;
  status: string;
  unit_count: number;
  min_price: number | null;
  max_price: number | null;
}

export interface PublicProperty {
  id: string;
  unit_number: string | null;
  configuration: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carpet_area: number | null;
  built_up_area: number | null;
  floor: number | null;
  facing: string | null;
  price: number | null;
  availability: boolean | null;
  amenities: string[] | null;
  project: PublicProject;
}

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  quote: string;
  rating: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface NewsItem {
  id: number;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  published_at: string;
}

export interface LeadEnquiry {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  preferred_location?: string;
  configuration?: string;
  bedrooms?: number;
  budget_min?: number;
  budget_max?: number;
  purpose?: string;
}

/** ₹ price -> "₹62.5 Lac" / "₹1.25 Cr" */
export function formatPrice(price?: number | null): string {
  if (price == null) return 'Price on request';
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1).replace(/\.0$/, '')} Lac`;
  return `₹${price.toLocaleString('en-IN')}`;
}

const LOCATION_IMAGES: Record<string, string> = {
  hinjewadi: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=900&q=70',
  wakad: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=70',
  baner: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=70',
  kharadi: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=900&q=70',
};

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=70',
];

/** Deterministic Unsplash image for a property/project. */
export function propertyImage(name: string, index?: number): string {
  const key = Object.keys(LOCATION_IMAGES).find((k) => name.toLowerCase().includes(k));
  if (key) return LOCATION_IMAGES[key];
  const i = index ?? Math.abs(hashString(name)) % FALLBACK_IMAGES.length;
  return FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export default publicApi;
