import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { DashboardLayout } from './layouts/DashboardLayout';
import { PublicNavbar, PublicFooter } from './layouts/PublicLayout';
import { VoiceWidget } from './components/VoiceWidget';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectCreation } from './pages/ProjectCreation';
import { Login } from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Public marketing site
import { Home } from './pages/public/Home';
import { Properties } from './pages/public/Properties';
import { PropertyDetail } from './pages/public/PropertyDetail';
import { About, Agents, News, NewsDetail, Register, Contact, NotFound } from './pages/public/Misc';

// Admin
import { Leads } from './pages/admin/Leads';
import { Calls } from './pages/admin/Calls';
import { Analytics } from './pages/admin/Analytics';
import { Settings } from './pages/admin/Settings';
import { ProjectDetail } from './pages/admin/ProjectDetail';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const PublicShell = () => {
  const [showVoice, setShowVoice] = useState(false);
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
      {/* Floating AI consultant launcher — talks to the real LiveKit agent */}
      <button
        onClick={() => setShowVoice(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold px-5 py-3.5 rounded-full shadow-2xl hover:scale-105 transition-all"
      >
        <MessageSquareText className="w-5 h-5" />
        Talk to Priya
      </button>
      {showVoice && <VoiceWidget onClose={() => setShowVoice(false)} />}
    </div>
  );
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public marketing site */}
      <Route element={<PublicShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/:id" element={<PropertyDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:slug" element={<NewsDetail />} />
        <Route path="/register" element={<Register />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/login" element={<Login />} />

      {/* Admin CRM — scoped under /admin so it never collides with the public site */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="projects" element={<Projects />} />
                <Route path="projects/new" element={<ProjectCreation />} />
                <Route path="projects/:id" element={<ProjectDetail />} />
                <Route path="leads" element={<Leads />} />
                <Route path="calls" element={<Calls />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
