import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Bell, User, Lock, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

const TopHeader = ({ breadcrumbs = [], searchTerm, setSearchTerm, placeholder = "Search..." }) => {
    const { user, logout } = useAuth();
    const { darkMode, toggleDarkMode } = useTheme();
    const navigate = useNavigate();
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/notifications', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setNotifications(res.data.data);
                setUnreadCount(res.data.unreadCount);
            } catch (err) {
                console.error('Error fetching notifications:', err);
            }
        };

        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000); // Pulse every 30s
            return () => clearInterval(interval);
        }
    }, [user]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowUserDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (notif) => {
        try {
            if (!notif.isRead) {
                await axios.put(`http://localhost:5000/api/notifications/${notif._id}/read`, {}, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }

            // Navigation logic
            if (notif.relatedId) {
                if (user?.role === 'staff' || user?.role === 'superadmin') {
                    navigate(`/staff/review/${notif.relatedId}`);
                } else if (user?.role === 'applicant') {
                    navigate(`/applicant/applications`);
                    // Optional: could add ?highlight=notif.relatedId
                }
            }

            setShowNotifications(false);
        } catch (err) {
            console.error('Error marking read:', err);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="bg-header-bg border-b border-border-color px-8 h-16 flex items-center justify-between gap-4 sticky top-0 z-[100] transition-colors duration-300">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2">
                {breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && <span className="text-gray-300">/</span>}
                        <span className={`text-[12px] font-bold tracking-wider uppercase ${idx === breadcrumbs.length - 1 ? 'text-navy' : 'text-gray-400'
                            }`}>
                            {crumb}
                        </span>
                    </React.Fragment>
                ))}
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md relative">
                <Search size={15} color="#94A3B8" className="absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-table-header-bg/50 border border-border-color rounded-xl pl-11 pr-4 py-2 text-[13px] font-semibold text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-navy/5 transition-all"
                />
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-6">
                {/* Theme Toggle */}
                <button
                    onClick={toggleDarkMode}
                    className="p-2 text-text-muted hover:text-navy hover:bg-table-header-bg rounded-xl transition-all"
                    title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Notifications */}
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-2 text-text-muted hover:text-navy hover:bg-table-header-bg rounded-xl transition-all relative"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-3 w-80 bg-card-bg rounded-[24px] shadow-2xl border border-border-color p-4 z-[110] animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between border-b border-border-color pb-3 mb-3 px-2">
                                <h4 className="font-black text-navy text-[14px]">Notifications</h4>
                                {unreadCount > 0 && (
                                    <span className="text-[10px] bg-rose-50 text-rose-500 font-bold px-2 py-0.5 rounded-full uppercase">
                                        {unreadCount} New
                                    </span>
                                )}
                            </div>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="text-center py-6 text-text-muted text-[12px] font-black uppercase tracking-widest opacity-50">No new updates</div>
                                ) : (
                                    notifications.map(notif => (
                                        <div
                                            key={notif._id}
                                            onClick={() => handleMarkAsRead(notif)}
                                            className={`p-3 rounded-xl border transition-all cursor-pointer ${notif.isRead ? 'bg-table-header-bg/50 border-border-color opacity-60' : 'bg-navy/5 border-navy/10 hover:bg-navy/10'
                                                }`}
                                        >
                                            <p className={`text-[12px] leading-relaxed ${notif.isRead ? 'text-text-muted font-bold opacity-60' : 'text-navy font-black'}`}>
                                                {notif.message}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                        className="flex items-center gap-3 p-1 rounded-xl hover:bg-table-header-bg transition-all text-left"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-[13px] font-black text-text-main leading-none mb-1">{user?.fullName || 'Anas Cabdi'}</p>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none">
                                {user?.role || 'SUPERADMIN'}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[15px] font-black shadow-lg relative" style={{ background: 'linear-gradient(135deg, #001F3F, #003366)' }}>
                            {user?.fullName?.[0]?.toUpperCase() || 'A'}
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-header-bg rounded-full"></div>
                        </div>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 ${showUserDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showUserDropdown && (
                        <div className="absolute right-0 mt-3 w-56 bg-card-bg rounded-[24px] shadow-2xl border border-border-color py-3 z-[110] animate-in slide-in-from-top-2 duration-200">
                            <div className="px-5 py-2 mb-2">
                                <p className="text-[13px] font-black text-text-main truncate">{user?.fullName}</p>
                                <p className="text-[10px] font-black text-text-muted truncate">{user?.email}</p>
                            </div>
                            <div className="border-t border-border-color my-1"></div>

                            <Link to="/profile" className="flex items-center gap-3 px-5 py-2.5 text-text-muted hover:text-navy hover:bg-table-header-bg transition-all no-underline">
                                <User size={16} />
                                <span className="text-[13px] font-bold">My Profile Account</span>
                            </Link>

                            <Link to="/change-password" className="flex items-center gap-3 px-5 py-2.5 text-text-muted hover:text-navy hover:bg-table-header-bg transition-all no-underline">
                                <Lock size={16} />
                                <span className="text-[13px] font-bold">Change Password</span>
                            </Link>

                            <div className="border-t border-border-color my-1"></div>

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-5 py-2.5 text-rose-500 hover:bg-rose-500/10 transition-all"
                            >
                                <LogOut size={16} />
                                <span className="text-[13px] font-black">Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default TopHeader;
