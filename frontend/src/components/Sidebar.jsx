import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Shield,
  Briefcase,
  FileText,
  BarChart3,
  Bell,
  CheckCircle,
  MapPin,
  Building2,
  X,
  Layers,
  QrCode,
  FilePlus2,
  ScanLine,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

const ADMIN_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/admin/dashboard' },
  { icon: Briefcase, label: 'Staff Management', to: '/admin/staff' },
  { icon: MapPin, label: 'District Management', to: '/admin/districts' },
  { icon: Layers, label: 'Permit Types', to: '/admin/permit-types' },
  { icon: ClipboardList, label: 'Applicant Management', to: '/admin/applicants' },
  { icon: Shield, label: 'Inspector Management', to: '/admin/inspectors' },
  { icon: FileText, label: 'All Applications', to: '/admin/all-permits' },
  { icon: FilePlus2, label: 'New Application', to: '/admin/new-application' },
  { icon: QrCode, label: 'Verify Permit', to: '/admin/verify' },
  { icon: ScanLine, label: 'All Scans', to: '/admin/inspector-scans' },
  { icon: Bell, label: 'Notifications', to: '/admin/notifications', badge: true },
  { icon: BarChart3, label: 'Reports', to: '/admin/reports' },
];

const STAFF_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/staff/dashboard' },
  { icon: ClipboardList, label: 'Applications', to: '/staff/applications' },
  { icon: FilePlus2, label: 'New Application', to: '/staff/new-application' },
  { icon: CheckCircle, label: 'Approved Permits', to: '/staff/approved' },
  { icon: QrCode, label: 'Verify Permit', to: '/staff/verify' },
  { icon: BarChart3, label: 'Reports', to: '/staff/reports' },
  { icon: Bell, label: 'Notifications', to: '/staff/notifications', badge: true },
];

const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { user, logout } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'superadmin';
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
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
          sidebar-shell w-[240px] shrink-0 flex flex-col h-screen z-50
          fixed lg:static inset-y-0 left-0 transition-transform duration-300 ease-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${darkMode ? 'sidebar-shell--dark' : 'sidebar-shell--light'}
        `}
      >
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(false)}
          className={`absolute top-3.5 right-3.5 lg:hidden p-1.5 rounded-md transition-colors ${
            darkMode
              ? 'text-white/40 hover:text-white hover:bg-white/10'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
          aria-label="Close menu"
        >
          <X size={16} strokeWidth={1.75} />
        </button>

        {/* Brand */}
        <div className={`px-5 pt-6 pb-5 ${darkMode ? 'border-b border-white/10' : 'border-b border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/35 ring-1 ring-blue-400/30">
              <Building2 size={16} className="text-white" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className={`text-[13px] font-semibold tracking-tight leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                M-DBPS
              </p>
              <p className={`text-[10px] mt-1 truncate ${darkMode ? 'text-white/40' : 'text-slate-400'}`}>
                Building Permit System
              </p>
            </div>
          </div>

          <p className={`mt-4 text-[10px] font-medium uppercase tracking-[0.14em] ${darkMode ? 'text-white/30' : 'text-slate-400'}`}>
            {isAdmin ? 'Administration' : 'Staff'}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto sidebar-scroll">
          {NAV.map(({ icon: Icon, label, to, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsMobileMenuOpen?.(false)}
              className={({ isActive }) =>
                [
                  'group relative flex items-center justify-between gap-2 px-3 py-[9px] rounded-xl text-[12.5px] font-medium no-underline transition-all duration-200',
                  isActive
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/25'
                    : darkMode
                      ? 'text-white/50 hover:text-white hover:bg-white/8'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={15}
                      strokeWidth={1.75}
                      className={
                        isActive
                          ? 'text-white drop-shadow-[0_0_6px_rgba(191,219,254,0.8)]'
                          : darkMode
                            ? 'text-white/40 group-hover:text-blue-200'
                            : 'text-slate-400 group-hover:text-blue-500'
                      }
                    />
                    <span className="truncate">{label}</span>
                  </div>
                  {badge && unreadCount > 0 && (
                    <span
                      className={`shrink-0 text-[10px] font-semibold tabular-nums min-w-[18px] h-[18px] px-1.5 rounded-full flex items-center justify-center shadow-md ${
                        isActive
                          ? 'bg-white text-blue-600 shadow-white/30'
                          : 'bg-rose-500 text-white shadow-rose-500/35'
                      }`}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className={`px-3 py-4 ${darkMode ? 'border-t border-white/10' : 'border-t border-slate-100'}`}>
          <div
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl ${
              darkMode
                ? 'bg-white/5 ring-1 ring-white/10'
                : 'bg-white ring-1 ring-slate-200/80 shadow-sm shadow-slate-200/60'
            }`}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0 bg-blue-500 text-white shadow-md shadow-blue-500/30">
              {user?.fullName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[12px] font-medium truncate leading-tight ${darkMode ? 'text-white/90' : 'text-slate-800'}`}>
                {user?.fullName || 'User'}
              </p>
              <p className={`text-[10px] truncate mt-0.5 capitalize ${darkMode ? 'text-white/35' : 'text-slate-400'}`}>
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
