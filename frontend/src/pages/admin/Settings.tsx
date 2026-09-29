import { useEffect, useState } from 'react';
import { User, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';
import api from '../../services/api';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const Settings: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then((r) => setProfile(r.data)).catch(() => {});
  }, []);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirmPassword) {
      setMsg({ kind: 'err', text: 'New passwords do not match.' });
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/me/password', { current_password: currentPassword, new_password: newPassword });
      setMsg({ kind: 'ok', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMsg({ kind: 'err', text: err.response?.data?.detail || 'Failed to update password.' });
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Your account and security preferences.</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><User className="w-4 h-4 text-blue-600" /> Profile</h2>
        {profile ? (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Name</p>
              <p className="mt-1 font-medium text-gray-900">{profile.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Email</p>
              <p className="mt-1 font-medium text-gray-900">{profile.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Role</p>
              <span className="mt-1 inline-block px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                {profile.role}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-5 h-16 animate-pulse bg-gray-50 rounded" />
        )}
      </div>

      {/* Password */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Lock className="w-4 h-4 text-blue-600" /> Change password</h2>
        <form onSubmit={changePassword} className="mt-5 space-y-4 max-w-md">
          {msg && (
            <div className={`text-sm rounded-md px-3 py-2 flex items-center gap-2 ${msg.kind === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg.kind === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              {msg.text}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Current password</label>
            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New password (min 6 chars)</label>
            <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirm new password</label>
            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-md transition-colors"
          >
            {saving ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
