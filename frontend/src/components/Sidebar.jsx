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
  GitBranch,
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
  { icon: GitBranch, label: 'District Branches', to: '/admin/district-branches' },
  { icon: Layers, label: 'Permit Types', to: '/admin/permit-types' },
  { icon: ClipboardList, label: 'Applicant Management', to: '/admin/applicants' },
  { icon: Shield, label: 'Inspector Management', to: '/admin/inspectors' },
  { icon: FileText, label: 'All Applications', to: '/admin/all-permits' },
  { icon: FilePlus2, label: 'New Application', to: '/admin/new-application' },
  { icon: QrCode, label: 'Verify Permit', to: '/admin/verify' },
  { icon: ScanLine, label: 'Inspector Scans', to: '/admin/inspector-scans' },
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
          w-[220px] shrink-0 flex flex-col min-h-screen z-50
          fixed lg:static inset-y-0 left-0 transition-all duration-300
          ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${darkMode
            ? 'bg-[#0d1b2a] text-white border-r border-white/5'
            : 'bg-white text-navy border-r border-gray-200 shadow-[1px_0_0_0_rgba(0,0,0,0.03)]'
          }
        `}
      >
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className={`absolute top-4 right-4 lg:hidden p-1.5 rounded-lg transition-all ${
            darkMode
              ? 'text-white/40 hover:text-white hover:bg-white/5'
              : 'text-gray-400 hover:text-navy hover:bg-gray-100'
          }`}
        >
          <X size={18} />
        </button>

        <div className={`px-6 pt-8 pb-8 border-b ${darkMode ? 'border-white/5' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <p className={`font-black text-[14px] leading-tight ${darkMode ? 'text-white' : 'text-navy'}`}>
                Sovereign Ledger
              </p>
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-0.5 ${darkMode ? 'text-white/35' : 'text-gray-400'}`}>
                Urban Permit Authority
              </p>
            </div>
          </div>
          <div className={`mt-3 px-2 py-1 rounded-lg inline-flex items-center gap-1.5 ${darkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-white/40' : 'text-gray-500'}`}>
              {isAdmin ? 'Super Admin Console' : 'Staff Console'}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 pt-5 space-y-0.5 overflow-y-auto">
          {NAV.map(({ icon: Icon, label, to, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsMobileMenuOpen?.(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all no-underline group ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : darkMode
                      ? 'text-white/45 hover:text-white hover:bg-white/6'
                      : 'text-gray-500 hover:text-navy hover:bg-gray-100'
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

        <div className={`px-3 pb-6 pt-4 border-t space-y-1 ${darkMode ? 'border-white/5' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3 px-4 py-3 mb-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-black shrink-0 ${
              darkMode
                ? 'bg-white/10 border border-white/10 text-white'
                : 'bg-navy/5 border border-navy/10 text-navy'
            }`}>
              {user?.fullName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className={`text-[12px] font-black truncate leading-none capitalize ${darkMode ? 'text-white' : 'text-navy'}`}>
                {user?.fullName || 'User'}
              </p>
              <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 truncate ${darkMode ? 'text-white/35' : 'text-gray-400'}`}>
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
