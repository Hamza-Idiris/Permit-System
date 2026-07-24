import { useState, useContext, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { useTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import {
  Bell, Menu, Search, Clock, CheckCircle2,
  XCircle, RefreshCw, Trash2, ChevronDown
} from 'lucide-react';

const API = 'http://localhost:5000/api/notifications';
const PAGE_SIZE = 10;

// ── helpers ───────────────────────────────────────────────────────────────────

function getRelativeTime(dateString) {
  const diffSec = Math.floor((Date.now() - new Date(dateString)) / 1000);
  if (diffSec < 60) return 'Hadda';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} daqiiqo ka hor`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} saacadood ka hor`;
  const d = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// Renders the notification message with the application ID bolded
function MessageText({ message }) {
  // Match patterns like MOG-2026-4078 or MUBP-2026-ABC12
  const parts = message.split(/(MOG-\d{4}-\d{4}|MUBP-\d{4}-[A-Z0-9]{5})/g);
  return (
    <span>
      {parts.map((part, i) =>
        /^(MOG-|MUBP-)/.test(part)
          ? <strong key={i} className="font-bold text-navy transition-colors">{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

// Icon circle for each notification type
function NotifIcon({ type }) {
  const { darkMode } = useTheme();
  const map = {
    Success: {
      bg: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-100',
      color: 'text-emerald-500',
      Icon: CheckCircle2,
    },
    Alert: {
      bg: darkMode ? 'bg-rose-500/10' : 'bg-rose-100',
      color: 'text-rose-500',
      Icon: XCircle,
    },
    Resubmitted: {
      bg: darkMode ? 'bg-amber-500/10' : 'bg-amber-100',
      color: 'text-amber-500',
      Icon: RefreshCw,
    },
    Info: {
      bg: darkMode ? 'bg-blue-500/10' : 'bg-blue-100',
      color: 'text-blue-500',
      Icon: Clock,
    },
  };
  const { bg, color, Icon } = map[type] || map.Info;
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg} transition-colors duration-300`}>
      <Icon size={20} className={`${color} transition-colors duration-300`} />
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

const Notifications = () => {
  const { token } = useAuth();
  const { wsData } = useWebSocket();
  const { darkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');

  const pollingRef = useRef(null);
  const headers = { Authorization: `Bearer ${token}` };

  // ── fetch (initial + polling) ───────────────────────────────────────────────
  const fetchFresh = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const { data } = await axios.get(API, {
        params: { limit: PAGE_SIZE, skip: 0 },
        headers,
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
  }, [token]);

  // first load
  useEffect(() => { fetchFresh(); }, [fetchFresh]);

  // live updates
  useEffect(() => {
    if (wsData && wsData.type === 'NOTIFICATION_CREATED') {
      fetchFresh(true);
    }
  }, [wsData, fetchFresh]);

  // ── load more (older) ───────────────────────────────────────────────────────
  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { data } = await axios.get(API, {
        params: { limit: PAGE_SIZE, skip },
        headers,
      });
      if (data.success) {
        setNotifications(prev => [...prev, ...data.data]);
        setHasMore(data.hasMore);
        setSkip(prev => prev + data.count);
      }
    } catch (err) {
      console.error('Load more failed', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // ── mark as read ────────────────────────────────────────────────────────────
  const markAsRead = async (notif) => {
    try {
      if (!notif.isRead) {
        await axios.put(`${API}/${notif._id}/read`, {}, { headers });
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Add navigation logic
      if (notif.relatedId) {
        // Use window.location as a fallback if navigate is not easy to inject
        window.location.href = `/staff/review/${notif.relatedId}`;
      }
    } catch (err) {
      console.error('Mark read failed', err);
    }
  };

  // ── delete ──────────────────────────────────────────────────────────────────
  const deleteNotif = async (id) => {
    setDeletingId(id);
    try {
      await axios.delete(`${API}/${id}`, { headers });
      const wasUnread = notifications.find(n => n._id === id && !n.isRead);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeletingId(null);
    }
  };

  // ── filtered list ────────────────────────────────────────────────────────────
  const filtered = searchTerm
    ? notifications.filter(n =>
      n.message.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : notifications;

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-bg-soft overflow-hidden text-text-main transition-colors duration-300">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="flex-1 flex flex-col overflow-y-auto w-full">
        {/* ── Top Header ── */}
        <header className="w-full bg-card-bg border-b border-border-color px-6 lg:px-10 h-[68px] flex items-center justify-between shrink-0 sticky top-0 z-40 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-text-muted mr-1" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={22} />
            </button>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={15} />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-[280px] sm:w-[340px] pl-9 pr-4 py-2 bg-table-header-bg border border-border-color rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/5 transition-all text-text-main placeholder:text-text-muted/50"
              />
            </div>
          </div>

          {/* Bell with badge */}
          <div className="relative">
            <Bell size={22} className="text-text-muted" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </header>

        {/* ── Page Body ── */}
        <div className="flex-1 px-6 lg:px-10 py-8 max-w-[860px] w-full mx-auto">

          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-2xl font-black text-navy transition-colors">Fariimaha (Notifications)</h1>
            <div className="mt-2 w-12 h-[3px] bg-navy rounded-full transition-colors" />
          </div>

          {/* ── Notification cards ── */}
          {loading ? (
            /* Skeleton */
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card-bg rounded-xl border border-border-color p-5 flex gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-table-header-bg shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 bg-table-header-bg rounded w-3/4" />
                    <div className="h-2.5 bg-table-header-bg/50 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-text-muted opacity-40">
              <Bell size={48} className="mb-4" />
              <p className="text-sm font-black">Ma jiraan wax farriin ah</p>
              <p className="text-xs mt-1">No notifications found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(notif => (
                <div
                  key={notif._id}
                  onClick={() => markAsRead(notif)}
                  className={`group bg-card-bg rounded-xl border transition-all duration-300 cursor-pointer
                    ${notif.isRead
                      ? 'border-border-color hover:brightness-95'
                      : 'border-border-color shadow-sm ring-1 ring-border-color'
                    }`}
                >
                  <div className="flex items-start gap-4 p-5">
                    {/* Icon */}
                    <NotifIcon type={notif.type} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-[14px] leading-snug font-bold ${notif.isRead ? 'text-text-muted' : 'text-text-main'}`}>
                        <MessageText message={notif.message} />
                      </p>
                      <p className="mt-1.5 text-[12px] text-text-muted font-black opacity-60">
                        {getRelativeTime(notif.createdAt)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notif.isRead && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    )}

                    {/* Delete */}
                    <button
                      onClick={e => { e.stopPropagation(); deleteNotif(notif._id); }}
                      disabled={deletingId === notif._id}
                      className="p-1.5 text-text-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 rounded-lg hover:bg-rose-500/10"
                      title="Delete notification"
                    >
                      {deletingId === notif._id
                        ? <RefreshCw size={15} className="animate-spin" />
                        : <Trash2 size={15} />
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Load Previous ── */}
          {!loading && hasMore && !searchTerm && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:border-[#002147] hover:text-[#002147] hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                {loadingMore
                  ? <><RefreshCw size={14} className="animate-spin" /> Loading...</>
                  : <><ChevronDown size={14} /> Load Previous Notifications</>
                }
              </button>
            </div>
          )}

          {/* Live indicator */}
          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-text-muted font-black uppercase tracking-wider transition-colors">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Real-time live updates active
          </div>
        </div>
      </main>
    </div>
  );
};

export default Notifications;
