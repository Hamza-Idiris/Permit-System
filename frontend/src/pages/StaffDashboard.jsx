import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
    Clock, CheckCircle2, CornerDownLeft, FileSearch,
    ClipboardList, QrCode, BarChart3, Plus, MapPin, ArrowRight
} from 'lucide-react';
import TopHeader from '../components/TopHeader';
import LoadingScreen from '../components/LoadingScreen';
import { useTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';

const StatCard = ({ icon: Icon, label, value, color, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="bg-card-bg p-7 rounded-[28px] border border-border-color hover:border-navy/20 text-left w-full transition-all duration-300 flex flex-col group"
    >
        <div className="flex items-center justify-between mb-6 w-full">
            <div className={`p-3 rounded-2xl ${color} bg-opacity-20 shrink-0`}>
                <Icon size={20} className="text-white" />
            </div>
            <ArrowRight size={16} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="mt-auto w-full">
            <h4 className="text-4xl font-black text-navy tracking-tighter">{value ?? '—'}</h4>
            <p className="text-[11px] font-black text-text-muted mt-1 uppercase tracking-widest opacity-70">{label}</p>
            <div className={`h-1.5 rounded-full mt-5 ${color} w-10 opacity-20 group-hover:w-full transition-all duration-700`} />
        </div>
    </button>
);

const StaffDashboard = () => {
    const { user } = useAuth();
    const { wsData } = useWebSocket();
    useTheme();
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const appRes = await axios.get('http://localhost:5000/api/permits/all', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setApplications(appRes.data.data || []);
            setLoading(false);
        } catch (err) {
            console.error('Fetch Data Error:', err);
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (wsData && (wsData.type === 'GLOBAL_PERMIT_APPLICATION_UPDATED' || wsData.type === 'PERMIT_APPLICATION_UPDATED')) {
            fetchData();
        }
    }, [wsData, fetchData]);

    if (loading) return <LoadingScreen />;

    const stats = {
        all: applications.length,
        pending: applications.filter(app => app.status === 'Pending' || app.status === 'In Review').length,
        approved: applications.filter(app => app.status === 'Approved').length,
        returned: applications.filter(app => app.status === 'Returned').length,
        revenue: applications.reduce((sum, app) => sum + (Number(app.formData?.totalFee) || 0), 0)
    };

    const recent = [...applications]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    return (
        <div className="flex min-h-screen bg-bg-soft font-sans transition-colors duration-300">
            <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <TopHeader
                    breadcrumbs={['Staff', 'Dashboard']}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    placeholder="Quick search..."
                />

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="flex items-start justify-between mb-7 gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-navy tracking-tight mb-1">District Overview</h1>
                            <p className="text-sm text-text-muted font-bold flex items-center gap-2">
                                <MapPin size={14} />
                                {user?.district || 'Your district'} — stats only. Review applications from the Applications page.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/staff/new-application')}
                            className="flex items-center gap-2 bg-navy text-white rounded-xl px-5 py-2.5 text-[13px] font-bold hover:brightness-110 transition-all shadow-lg shadow-navy/20"
                        >
                            <Plus size={15} /> New Application
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard icon={FileSearch} label="All Applications" value={stats.all} color="bg-indigo-500" onClick={() => navigate('/staff/applications')} />
                        <StatCard icon={Clock} label="Pending Review" value={stats.pending} color="bg-amber-500" onClick={() => navigate('/staff/applications')} />
                        <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} color="bg-emerald-500" onClick={() => navigate('/staff/approved')} />
                        <StatCard icon={CornerDownLeft} label="Returned" value={stats.returned} color="bg-rose-500" onClick={() => navigate('/staff/applications')} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <div className="bg-card-bg border border-border-color rounded-2xl p-6">
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">District Revenue</p>
                            <p className="text-3xl font-black text-navy">${stats.revenue.toLocaleString()}</p>
                            <p className="text-[12px] text-text-muted font-bold mt-2">From applications in {user?.district || 'your district'}</p>
                        </div>
                        <button onClick={() => navigate('/staff/verify')} className="bg-card-bg border border-border-color rounded-2xl p-6 text-left hover:border-navy/30 transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                                <QrCode size={20} />
                            </div>
                            <p className="font-black text-navy text-[15px]">Verify Permit / QR</p>
                            <p className="text-[12px] text-text-muted font-bold mt-1">Check permit ID or QR payload</p>
                        </button>
                        <button onClick={() => navigate('/staff/reports')} className="bg-card-bg border border-border-color rounded-2xl p-6 text-left hover:border-navy/30 transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-4">
                                <BarChart3 size={20} />
                            </div>
                            <p className="font-black text-navy text-[15px]">District Reports</p>
                            <p className="text-[12px] text-text-muted font-bold mt-1">Filter and download district data</p>
                        </button>
                    </div>

                    <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-border-color">
                            <h3 className="text-xs font-black text-navy uppercase tracking-[0.2em]">Recent Activity</h3>
                            <button
                                onClick={() => navigate('/staff/applications')}
                                className="text-[11px] font-black text-navy uppercase tracking-wider flex items-center gap-1 hover:underline"
                            >
                                <ClipboardList size={13} /> Open Applications
                            </button>
                        </div>
                        <div className="divide-y divide-border-color">
                            {recent.length === 0 ? (
                                <p className="p-8 text-center text-text-muted text-sm font-bold">No applications in your district yet.</p>
                            ) : (
                                recent.map(app => (
                                    <div key={app._id} className="px-5 py-4 flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-black text-navy truncate">#{app.applicationId}</p>
                                            <p className="text-[12px] text-text-muted font-bold truncate">
                                                {app.user?.fullName || app.formData?.fullName} · {app.formData?.buildingCategory}
                                            </p>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                            app.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                            app.status === 'Returned' ? 'bg-rose-500/10 text-rose-500' :
                                            'bg-amber-500/10 text-amber-500'
                                        }`}>
                                            {app.status}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StaffDashboard;
