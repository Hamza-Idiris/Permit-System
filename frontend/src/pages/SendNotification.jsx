import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { Megaphone, Send, CheckCircle2, XCircle, Info } from 'lucide-react';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'staff', label: 'Staff' },
  { value: 'inspector', label: 'Inspectors' },
  { value: 'applicant', label: 'Applicants' },
];

const SendNotification = () => {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'superadmin';
  const isStaff = user?.role === 'staff';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const [role, setRole] = useState('all');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);

  const breadcrumbs = isAdmin
    ? ['Admin', 'Send Notification']
    : ['Staff', 'Send Notification'];

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setBanner({ type: 'error', text: 'Message is required.' });
      return;
    }

    setLoading(true);
    setBanner(null);
    try {
      const body = isStaff
        ? { message: trimmed, role: 'applicant' }
        : { message: trimmed, role };

      const res = await axios.post(
        'http://localhost:5000/api/notifications/send',
        body,
        { headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` } }
      );

      if (res.data.success) {
        setBanner({
          type: 'success',
          text: res.data.message || `Sent to ${res.data.sent} recipient(s).`,
          sent: res.data.sent,
        });
        setMessage('');
      } else {
        setBanner({ type: 'error', text: res.data.message || 'Failed to send.' });
      }
    } catch (err) {
      setBanner({
        type: 'error',
        text: err.response?.data?.message || 'Unable to send notification.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-bg-soft font-sans transition-colors duration-300">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader
          breadcrumbs={breadcrumbs}
          searchTerm={headerSearch}
          setSearchTerm={setHeaderSearch}
          placeholder="Search..."
        />

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-2xl mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-black text-navy tracking-tight mb-1">Send Notification</h1>
              <p className="text-sm text-text-muted font-bold">
                Broadcast a message to selected recipients across the permit system.
              </p>
            </div>

            {banner && (
              <div
                className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${
                  banner.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                }`}
              >
                {banner.type === 'success'
                  ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                  : <XCircle size={18} className="shrink-0 mt-0.5" />}
                <div>
                  <p className="text-sm font-bold">{banner.text}</p>
                  {banner.sent != null && (
                    <p className="text-xs font-bold opacity-80 mt-1">{banner.sent} recipient(s) notified</p>
                  )}
                </div>
              </div>
            )}

            <form
              onSubmit={handleSend}
              className="bg-card-bg rounded-2xl border border-border-color p-6 shadow-sm space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-table-header-bg">
                  <Megaphone size={20} className="text-navy" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Broadcast</p>
                  <p className="text-sm font-bold text-navy">Compose & send</p>
                </div>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                    Audience
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-card-bg border border-border-color rounded-xl px-4 py-3 text-sm font-bold text-navy outline-none focus:ring-2 focus:ring-navy/20"
                  >
                    {AUDIENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {isStaff && (
                <div className="flex items-start gap-3 rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3">
                  <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-navy">
                    Sends to registered applicants in your district only
                    {user?.district ? ` (${user.district})` : ''}.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Write the notification message…"
                  className="w-full bg-bg-soft border border-border-color rounded-xl px-4 py-3 text-sm font-medium text-navy outline-none focus:ring-2 focus:ring-navy/20 resize-y min-h-[120px]"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="w-full sm:w-auto bg-navy text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-navy/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send size={16} />
                {loading ? 'Sending…' : 'Send Notification'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SendNotification;
