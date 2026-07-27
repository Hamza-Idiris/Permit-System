import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Shield,
  Briefcase,
  FileText,
  BarChart3,
  LogOut,
  Bell,
  CheckCircle,
  MapPin,
  Building2,
  Users,
  Menu,
  GitBranch,
  X,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

// ─── Admin Nav Config ─────────────────────────────────────────────────────────
const ADMIN_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/admin/dashboard' },
  { icon: Briefcase, label: 'Staff Management', to: '/admin/staff' },
  { icon: MapPin, label: 'District Management', to: '/admin/districts' },
  { icon: GitBranch, label: 'District Branches', to: '/admin/district-branches' },
  { icon: Building2, label: 'New Construction', to: '/admin/building-types' },
  { icon: Wrench, label: 'Renovation', to: '/admin/renovation' },
  { icon: ClipboardList, label: 'Applicant Management', to: '/admin/applicants' },
  { icon: Shield, label: 'Inspector Management', to: '/admin/inspectors' },
  { icon: FileText, label: 'All Applications', to: '/admin/all-permits' },
  { icon: BarChart3, label: 'Reports', to: '/admin/reports' },
];

// ─── Staff Nav Config ─────────────────────────────────────────────────────────
const STAFF_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/staff/dashboard' },
  { icon: CheckCircle, label: 'Approved Permits', to: '/staff/approved' },
  { icon: Bell, label: 'Notifications', to: '/staff/notifications', badge: true },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'superadmin';
  const isStaff = user?.role === 'staff';
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/notifications/unread', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setUnreadCount(data.count ?? 0);
      } catch (err) { /* silent */ }
    };
    if (user) {
      fetchUnread();
      const iv = setInterval(fetchUnread, 15000);
      return () => clearInterval(iv);
    }
  }, [user]);

  const NAV = isAdmin ? ADMIN_NAV : STAFF_NAV;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
          w-[220px] shrink-0 bg-[#0d1b2a] flex flex-col text-white min-h-screen z-50
          fixed lg:static inset-y-0 left-0 transition-transform duration-300
          ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-4 right-4 lg:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
        >
          <X size={18} />
        </button>

        {/* ── Brand ─────────────────────────────────────────── */}
        <div className="px-6 pt-8 pb-8 border-b border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <p className="font-black text-[14px] leading-tight text-white">Sovereign Ledger</p>
              <p className="text-[9px] text-white/35 font-black uppercase tracking-[0.2em] mt-0.5">Urban Permit Authority</p>
            </div>
          </div>
          {/* Role badge */}
          <div className="mt-3 px-2 py-1 bg-white/5 rounded-lg inline-flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
              {isAdmin ? 'Super Admin Console' : 'Staff Console'}
            </span>
          </div>
        </div>

        {/* ── Navigation ────────────────────────────────────── */}
        <nav className="flex-1 px-3 pt-5 space-y-0.5 overflow-y-auto">
          {NAV.map(({ icon: Icon, label, to, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsMobileMenuOpen?.(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all no-underline group ${isActive
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-white/45 hover:text-white hover:bg-white/6'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon size={16} />
                <span>{label}</span>
              </div>
              {badge && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Footer: User + Logout ─────────────────────────── */}
        <div className="px-3 pb-6 pt-4 border-t border-white/5 space-y-1">
          {/* User info card */}
          <div className="flex items-center gap-3 px-4 py-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-[12px] font-black text-white shrink-0">
              {user?.fullName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-[12px] font-black text-white truncate leading-none capitalize">{user?.fullName || 'User'}</p>
              <p className="text-[9px] text-white/35 font-black uppercase tracking-widest mt-0.5 truncate">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
