import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
  Bell, CheckCircle2, RefreshCw, Trash2, ChevronDown,
  Filter, Calendar, ArrowRight, AlertCircle, FileText,
  CheckCircle, Info, Archive, History, Inbox, Megaphone, Undo2,
  Send, XCircle, Users
} from 'lucide-react';

const API = 'http://localhost:5000/api/notifications';
const BASE = 'http://localhost:5000/api';
const PAGE_SIZE = 15;

function getRelativeTime(dateString) {
  const diffSec = Math.floor((Date.now() - new Date(dateString)) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  const d = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function MessageText({ message }) {
  const parts = message.split(/(MOG-\d{4}-\d{4}|MUBP-\d{4}-[A-Z0-9]{5})/g);
  return (
    <span className="leading-relaxed">
      {parts.map((part, i) =>
        /^(MOG-|MUBP-)/.test(part)
          ? <strong key={i} className="font-extrabold text-navy px-1.5 py-0.5 bg-navy/5 rounded mx-0.5">{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

const StatCard = ({ icon: Icon, label, count, color, bg, borderColor, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-1 min-w-[140px] p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 text-left
      ${isActive
        ? `${borderColor} ${bg} shadow-md scale-[1.02] ring-2 ring-current ring-opacity-10`
        : 'border-border-color bg-card-bg hover:border-navy/20'}`}
  >
    <div className={`p-2.5 rounded-xl ${isActive ? 'bg-white shadow-sm' : bg} ${color}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-navy' : 'text-text-muted'}`}>{label}</p>
      <p className={`text-xl font-black ${isActive ? 'text-navy' : 'text-text-main'}`}>{count}</p>
    </div>
  </button>
);

const ADMIN_AUDIENCE = [
  { value: 'all', label: 'All Users' },
  { value: 'staff', label: 'Staff' },
  { value: 'inspector', label: 'Inspectors' },
  { value: 'applicant', label: 'Applicants' },
];

const NotificationsHub = () => {
  const { user, token } = useAuth();
  const { wsData } = useWebSocket();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'superadmin';
  const isStaff = user?.role === 'staff';

  const [segment, setSegment] = useState('inbox');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Inbox state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [showArchived, setShowArchived] = useState(false);

  // Compose state
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState(isAdmin ? 'all' : 'admin');
  const [district, setDistrict] = useState('');
  const [adminId, setAdminId] = useState('');
  const [targetScope, setTargetScope] = useState('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [districts, setDistricts] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState(null);

  const authHeaders = { Authorization: `Bearer ${token || localStorage.getItem('token')}` };

  const fetchFresh = useCallback(async (silent = false) => {
    if (!localStorage.getItem('token')) return;
    if (!silent) setLoading(true);
    try {
      const { data } = await axios.get(API, {
        params: { limit: PAGE_SIZE, skip: 0, archived: showArchived },
        headers: authHeaders,
      });
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
        setHasMore(data.hasMore);
        setSkip(data.count);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showArchived]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchFresh(); }, [fetchFresh]);

  useEffect(() => {
    if (wsData && wsData.type === 'NOTIFICATION_CREATED') fetchFresh(true);
  }, [wsData, fetchFresh]);

  useEffect(() => {
    if (segment !== 'compose') return;
    const load = async () => {
      try {
        const distRes = await axios.get(`${BASE}/districts`, { headers: authHeaders });
        if (distRes.data.success) setDistricts(distRes.data.data || []);
      } catch (_) { /* silent */ }
      if (isAdmin) {
        try {
          const usersRes = await axios.get(`${BASE}/users`, { headers: authHeaders });
          if (usersRes.data.success) setUsersList(usersRes.data.data || []);
        } catch (_) { /* silent */ }
      }
      if (isStaff) {
        try {
          const admRes = await axios.get(`${BASE}/users/admins`, { headers: authHeaders });
          if (admRes.data.success) setAdmins(admRes.data.data || []);
        } catch (_) { /* silent */ }
      }
    };
    load();
  }, [segment, isStaff, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { data } = await axios.get(API, {
        params: { limit: PAGE_SIZE, skip },
        headers: authHeaders,
      });
      if (data.success) {
        setNotifications((prev) => [...prev, ...data.data]);
        setHasMore(data.hasMore);
        setSkip((prev) => prev + data.count);
      }
    } catch (err) {
      console.error('Load more failed', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const markAsRead = async (notif) => {
    if (!notif.isRead) {
      try {
        await axios.put(`${API}/${notif._id}/read`, {}, { headers: authHeaders });
        setNotifications((prev) => prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Mark read failed', err);
      }
    }
  };

  const handleViewDetails = async (notif) => {
    await markAsRead(notif);
    if (notif.relatedId) {
      navigate(`/staff/review/${notif.relatedId}`);
    }
  };

  const deleteNotif = async (e, id) => {
    e.stopPropagation();
    setActionId(id);
    try {
      await axios.delete(`${API}/${id}`, { headers: authHeaders });
      const wasUnread = notifications.find((n) => n._id === id && !n.isRead);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setActionId(null);
    }
  };

  const archiveNotif = async (e, id) => {
    e.stopPropagation();
    setActionId(id);
    try {
      await axios.put(`${API}/${id}/archive`, {}, { headers: authHeaders });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      const notif = notifications.find((n) => n._id === id);
      if (notif && !notif.isRead) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Archive failed', err);
    } finally {
      setActionId(null);
    }
  };

  const unarchiveNotif = async (e, id) => {
    e.stopPropagation();
    setActionId(id);
    try {
      await axios.put(`${API}/${id}/unarchive`, {}, { headers: authHeaders });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error('Unarchive failed', err);
    } finally {
      setActionId(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.isRead);
      for (const n of unread) {
        await axios.put(`${API}/${n._id}/read`, {}, { headers: authHeaders });
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all read failed', err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setBanner({ type: 'error', text: 'Message is required.' });
      return;
    }

    let body;
    if (isStaff) {
      if (audience === 'admin') {
        if (!adminId) {
          setBanner({ type: 'error', text: 'Please select an admin.' });
          return;
        }
        body = { message: trimmed, target: 'admin', adminId };
      } else {
        body = { message: trimmed, target: 'district' };
      }
    } else {
      if (audience !== 'all' && targetScope === 'district') {
        if (!district) {
          setBanner({ type: 'error', text: 'Please select a district.' });
          return;
        }
        body = { message: trimmed, target: 'district', district, role: audience };
      } else if (audience !== 'all' && targetScope === 'specific') {
        if (!targetUserId) {
          setBanner({ type: 'error', text: 'Please select a user.' });
          return;
        }
        body = { message: trimmed, userIds: [targetUserId] };
      } else {
        body = { message: trimmed, role: audience };
      }
    }

    setSending(true);
    setBanner(null);
    try {
      const res = await axios.post(`${API}/send`, body, { headers: authHeaders });
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
      setSending(false);
    }
  };

  const filtered = notifications.filter((n) => {
    const matchesSearch =
      n.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.senderName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.senderDistrict || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (activeFilter === 'Unread') return matchesSearch && !n.isRead;
    const matchesFilter = activeFilter === 'All' || n.type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    All: notifications.length,
    Unread: unreadCount,
    Alert: notifications.filter((n) => n.type === 'Alert').length,
    Success: notifications.filter((n) => n.type === 'Success').length,
    Info: notifications.filter((n) => n.type === 'Info').length,
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Alert': return { Icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
      case 'Success': return { Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
      case 'Applied': return { Icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
      case 'Approved': return { Icon: CheckCircle2, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' };
      case 'Returned': return { Icon: RefreshCw, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
      case 'Broadcast': return { Icon: Megaphone, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20' };
      default: return { Icon: Info, color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
    }
  };

  const breadcrumbs = isAdmin
    ? ['Admin', segment === 'inbox' ? 'Notifications' : 'Compose']
    : ['Staff', segment === 'inbox' ? 'Notifications' : 'Compose'];

  return (
    <div className="flex h-screen bg-bg-soft font-sans transition-colors duration-300">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader
          breadcrumbs={breadcrumbs}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder={segment === 'inbox' ? 'Search in notifications...' : 'Search...'}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-navy tracking-tight mb-1 flex items-center gap-3">
                Notifications
                {unreadCount > 0 && segment === 'inbox' && (
                  <span className="text-[10px] bg-rose-500 text-white px-2.5 py-1 rounded-full uppercase tracking-widest animate-pulse shadow-lg shadow-rose-500/20">
                    {unreadCount} New
                  </span>
                )}
              </h1>
              <p className="text-sm text-text-muted font-bold">
                Inbox alerts and broadcast compose in one place.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1.5 bg-card-bg border border-border-color rounded-2xl shadow-sm">
              <button
                onClick={() => setSegment('inbox')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-black transition-all ${segment === 'inbox'
                  ? 'bg-navy text-white shadow-md shadow-navy/20'
                  : 'text-text-muted hover:text-navy'
                  }`}
              >
                <Inbox size={15} /> Inbox
              </button>
              <button
                onClick={() => { setSegment('compose'); setBanner(null); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-black transition-all ${segment === 'compose'
                  ? 'bg-navy text-white shadow-md shadow-navy/20'
                  : 'text-text-muted hover:text-navy'
                  }`}
              >
                <Megaphone size={15} /> Compose
              </button>
            </div>
          </div>

          {segment === 'inbox' && (
            <>
              <div className="flex gap-3 mb-8 flex-wrap justify-end">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`flex items-center gap-2 border rounded-xl px-5 py-2.5 text-[13px] font-bold transition-all ${showArchived
                    ? 'bg-navy text-white border-navy shadow-lg shadow-navy/20'
                    : 'bg-card-bg border-border-color text-text-muted hover:text-navy'
                    }`}
                >
                  {showArchived ? <Bell size={15} /> : <History size={15} />}
                  {showArchived ? 'Return to Center' : 'View Archive'}
                </button>
                {!showArchived && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-2 bg-card-bg border border-border-color rounded-xl px-5 py-2.5 text-[13px] font-bold text-text-muted hover:text-navy transition-all"
                  >
                    <CheckCircle size={15} /> Mark All Read
                  </button>
                )}
                <button
                  onClick={() => fetchFresh()}
                  className="flex items-center gap-2 bg-navy text-white rounded-xl px-5 py-2.5 text-[13px] font-bold hover:brightness-110 transition-all shadow-lg shadow-navy/20"
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>

              <div className="flex flex-wrap gap-4 mb-8">
                <StatCard icon={Bell} label="All" count={stats.All} color="text-navy" bg="bg-navy/5" borderColor="border-navy/20" isActive={activeFilter === 'All'} onClick={() => setActiveFilter('All')} />
                <StatCard icon={AlertCircle} label="Unread" count={stats.Unread} color="text-rose-500" bg="bg-rose-500/5" borderColor="border-rose-500/20" isActive={activeFilter === 'Unread'} onClick={() => setActiveFilter('Unread')} />
                <StatCard icon={AlertCircle} label="Alerts" count={stats.Alert} color="text-rose-500" bg="bg-rose-500/5" borderColor="border-rose-500/20" isActive={activeFilter === 'Alert'} onClick={() => setActiveFilter('Alert')} />
                <StatCard icon={CheckCircle} label="Success" count={stats.Success} color="text-emerald-500" bg="bg-emerald-500/5" borderColor="border-emerald-500/20" isActive={activeFilter === 'Success'} onClick={() => setActiveFilter('Success')} />
                <StatCard icon={Info} label="Updates" count={stats.Info} color="text-blue-500" bg="bg-blue-500/5" borderColor="border-blue-500/20" isActive={activeFilter === 'Info'} onClick={() => setActiveFilter('Info')} />
              </div>

              <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between p-6 border-b border-border-color">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-table-header-bg rounded-lg">
                      <Filter size={14} className="text-navy" />
                    </div>
                    <span className="text-xs font-black text-navy uppercase tracking-[0.2em]">
                      {showArchived ? 'Archive List' : `${activeFilter} Notifications`}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider">
                    {filtered.length} Results Found
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                      <RefreshCw size={24} className="animate-spin text-navy" />
                      <p className="text-xs font-black text-text-muted uppercase tracking-widest">Loading notifications...</p>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-3 opacity-40">
                      <div className="w-16 h-16 bg-table-header-bg rounded-2xl flex items-center justify-center mb-2">
                        <Bell size={32} className="text-text-muted" />
                      </div>
                      <p className="text-sm font-black text-text-muted uppercase tracking-widest">No notifications here</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border-color">
                      {filtered.map((notif) => {
                        const { Icon, color, bg, border } = getIcon(notif.type);
                        return (
                          <div
                            key={notif._id}
                            onClick={() => markAsRead(notif)}
                            className={`group flex items-center gap-5 p-6 transition-all duration-300 cursor-pointer border-l-4 ${notif.isRead ? 'border-transparent opacity-70 grayscale-[0.3]' : 'border-navy bg-navy/[0.02]'
                              } hover:bg-table-header-bg/40`}
                          >
                            <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 border ${bg} ${color} ${border} shadow-sm`}>
                              <Icon size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${color}`}>{notif.type}</span>
                                <span className="text-[10px] text-text-muted font-bold">•</span>
                                <div className="flex items-center gap-1 text-[10px] text-text-muted font-bold">
                                  <Calendar size={10} />
                                  {getRelativeTime(notif.createdAt)}
                                </div>
                              </div>
                              <p className={`text-[13.5px] leading-relaxed ${notif.isRead ? 'text-text-muted font-bold' : 'text-text-main font-bold'}`}>
                                <MessageText message={notif.message} />
                              </p>
                              {notif.senderName && (
                                <p className="mt-1.5 text-[11px] font-black text-navy/80">
                                  From {notif.senderName}
                                  {notif.senderDistrict ? ` · ${notif.senderDistrict}` : ''}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {!notif.isRead && !showArchived && (
                                <div className="w-2.5 h-2.5 rounded-full bg-navy animate-pulse" title="Unread" />
                              )}
                              <div className={`flex items-center gap-1 transition-all ${showArchived ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                {showArchived ? (
                                  <button
                                    onClick={(e) => unarchiveNotif(e, notif._id)}
                                    disabled={actionId === notif._id}
                                    className="p-2.5 text-navy hover:text-navy hover:bg-navy/10 rounded-xl"
                                    title="Unarchive"
                                  >
                                    {actionId === notif._id ? <RefreshCw size={14} className="animate-spin" /> : <Undo2 size={14} />}
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => archiveNotif(e, notif._id)}
                                    disabled={actionId === notif._id}
                                    className="p-2.5 text-text-muted hover:text-navy hover:bg-navy/5 rounded-xl"
                                    title="Archive"
                                  >
                                    {actionId === notif._id ? <RefreshCw size={14} className="animate-spin" /> : <Archive size={14} />}
                                  </button>
                                )}
                                <button
                                  onClick={(e) => deleteNotif(e, notif._id)}
                                  disabled={actionId === notif._id}
                                  className="p-2.5 text-text-muted hover:text-rose-500 hover:bg-rose-50 rounded-xl"
                                  title="Delete"
                                >
                                  {actionId === notif._id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                                {notif.relatedId && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleViewDetails(notif); }}
                                    className="p-2.5 text-text-muted hover:text-navy hover:bg-navy/5 rounded-xl"
                                    title="View Application"
                                  >
                                    <ArrowRight size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!loading && hasMore && !searchTerm && (
                    <div className="p-8 flex justify-center border-t border-border-color bg-table-header-bg/10">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-8 py-3 bg-white border border-border-color rounded-2xl text-[13px] font-black text-navy hover:shadow-md transition-all disabled:opacity-50"
                      >
                        {loadingMore
                          ? <><RefreshCw size={16} className="animate-spin" /> Loading...</>
                          : <><ChevronDown size={16} /> Load Older Items</>}
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-border-color bg-table-header-bg/30 flex items-center justify-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                    {showArchived ? 'Archive mode active' : 'Real-time live updates active'}
                  </p>
                </div>
              </div>
            </>
          )}

          {segment === 'compose' && (
            <div className="max-w-2xl mx-auto space-y-6">
              {banner && (
                <div
                  className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${banner.type === 'success'
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
                className="bg-card-bg rounded-2xl border border-border-color p-8 shadow-sm space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-table-header-bg">
                    <Users size={20} className="text-navy" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Broadcast</p>
                    <p className="text-sm font-bold text-navy">Compose & send</p>
                  </div>
                </div>

                {isAdmin && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                        Audience
                      </label>
                      <select
                        value={audience}
                        onChange={(e) => { setAudience(e.target.value); setTargetScope('all'); setDistrict(''); setTargetUserId(''); }}
                        className="w-full bg-bg-soft border border-border-color rounded-xl px-4 py-3 text-sm font-bold text-navy outline-none focus:ring-2 focus:ring-navy/20"
                      >
                        {ADMIN_AUDIENCE.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {audience !== 'all' && (
                      <div>
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                          Target Scope
                        </label>
                        <select
                          value={targetScope}
                          onChange={(e) => { setTargetScope(e.target.value); setDistrict(''); setTargetUserId(''); }}
                          className="w-full bg-bg-soft border border-border-color rounded-xl px-4 py-3 text-sm font-bold text-navy outline-none focus:ring-2 focus:ring-navy/20"
                        >
                          <option value="all">All {ADMIN_AUDIENCE.find(a => a.value === audience)?.label}</option>
                          <option value="district">By District</option>
                          <option value="specific">Specific User</option>
                        </select>
                      </div>
                    )}

                    {audience !== 'all' && targetScope === 'district' && (
                      <div>
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                          District
                        </label>
                        <select
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="w-full bg-bg-soft border border-border-color rounded-xl px-4 py-3 text-sm font-bold text-navy outline-none focus:ring-2 focus:ring-navy/20"
                        >
                          <option value="">Select district…</option>
                          {districts.map((d) => (
                            <option key={d._id} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {audience !== 'all' && targetScope === 'specific' && (
                      <div>
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                          Specific User
                        </label>
                        <select
                          value={targetUserId}
                          onChange={(e) => setTargetUserId(e.target.value)}
                          className="w-full bg-bg-soft border border-border-color rounded-xl px-4 py-3 text-sm font-bold text-navy outline-none focus:ring-2 focus:ring-navy/20"
                        >
                          <option value="">Select a user…</option>
                          {usersList.filter(u => u.role === audience).map((u) => (
                            <option key={u._id} value={u._id}>{u.fullName} ({u.role})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {isStaff && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                        Send To
                      </label>
                      <select
                        value={audience}
                        onChange={(e) => { setAudience(e.target.value); setAdminId(''); setDistrict(''); }}
                        className="w-full bg-bg-soft border border-border-color rounded-xl px-4 py-3 text-sm font-bold text-navy outline-none focus:ring-2 focus:ring-navy/20"
                      >
                        <option value="admin">Select Admin</option>
                        <option value="district">My District Applicants</option>
                      </select>
                    </div>
                    {audience === 'admin' && (
                      <div>
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                          Admin
                        </label>
                        <select
                          value={adminId}
                          onChange={(e) => setAdminId(e.target.value)}
                          className="w-full bg-bg-soft border border-border-color rounded-xl px-4 py-3 text-sm font-bold text-navy outline-none focus:ring-2 focus:ring-navy/20"
                        >
                          <option value="">Select admin…</option>
                          {admins.map((a) => (
                            <option key={a._id} value={a._id}>
                              {a.fullName} ({a.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
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
                  disabled={sending || !message.trim()}
                  className="w-full sm:w-auto bg-navy text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-navy/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send size={16} />
                  {sending ? 'Sending…' : 'Send Notification'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main >
    </div >
  );
};

export default NotificationsHub;
