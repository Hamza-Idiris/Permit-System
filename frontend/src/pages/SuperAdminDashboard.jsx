import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell
} from 'recharts';
import {
    Users, DollarSign, Clock, CheckCircle, TrendingUp, Download,
    Calendar, Search, Bell, Grid3X3, LayoutDashboard, BarChart2, FileText, Banknote, Settings, HelpCircle, LogOut, ChevronDown, User
} from 'lucide-react';
import LoadingScreen from '../components/LoadingScreen';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// ─── Top Header ─────────────────────────────────────────────────────────────────
// Deleted local DashHeader as we'll use global TopHeader

// ─── Donut Label ─────────────────────────────────────────────────────────────────
const DonutLabel = ({ viewBox, total }) => {
    const { cx, cy } = viewBox;
    return (
        <>
            <text x={cx} y={cy - 8} textAnchor="middle" fill="#0d1b2a" className="text-xl font-black" style={{ fontWeight: 900, fontSize: 26 }}>
                {total}%
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" fill="#9ca3af" style={{ fontWeight: 700, fontSize: 11, letterSpacing: 1 }}>
                Coverage
            </text>
        </>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────────
const SuperAdminDashboard = () => {
    const { token } = useContext(AuthContext);
    const { darkMode } = useTheme();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [range, setRange] = useState('30'); // today, 7, 30, custom
    const [isRangeOpen, setIsRangeOpen] = useState(false);
    const [customDates, setCustomDates] = useState({ start: '', end: '' });
    const [graphView, setGraphView] = useState('month'); // month, year
    const [graphMonth, setGraphMonth] = useState(new Date().getMonth() + 1);
    const [graphYear, setGraphYear] = useState(new Date().getFullYear());

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const config = { headers: { 'Authorization': `Bearer ${token}` } };
                let url = `http://localhost:5000/api/analytics?range=${range}&graphView=${graphView}&selectedMonth=${graphMonth}&selectedYear=${graphYear}`;
                if (range === 'custom' && customDates.start && customDates.end) {
                    url += `&startDate=${customDates.start}&endDate=${customDates.end}`;
                }
                const res = await axios.get(url, config);
                if (res.data.success) setStats(res.data);
            } catch (err) {
                console.error('Failed to fetch analytics', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [token, range, customDates, graphView, graphMonth, graphYear]);

    if (loading) return <LoadingScreen />;

    // Build chart data from API or use fallback
    // Real growth data from backend
    const growthData = stats?.charts?.growthTrends?.map((d) => ({
        name: d.name,
        active: d.applications,
        target: Math.round(d.applications * 1.2), // Simulated reference line
    })) ?? [
            { name: '1 May', active: 10, target: 12 },
            { name: '2 May', active: 15, target: 18 },
        ];

    const districtColors = ['#4f8ef7', '#1e3a5f', '#d1dff7', '#7c3aed', '#06b6d4'];
    const districtData = stats?.charts?.districtDistribution?.slice(0, 5).map((d, i) => ({
        name: d.name,
        value: d.value,
        color: districtColors[i % districtColors.length],
    })) ?? [
            { name: 'Hodan', value: 45, color: '#4f8ef7' },
            { name: 'Bondhere', value: 30, color: '#1e3a5f' },
            { name: 'Hamar Jajab', value: 25, color: '#d1dff7' },
        ];

    // Activity log (use real data or fallback)
    // Activity log using real application data
    const activityLog = stats?.charts?.recentApplications?.map((app) => ({
        id: app.applicationId,
        applicant: app.user?.fullName || app.formData?.fullName || 'N/A',
        initials: (app.user?.fullName || app.formData?.fullName || 'XX').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        district: app.district,
        status: app.status,
        fee: `$${(app.formData?.totalFee || 0).toLocaleString()}`,
        time: new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        expiry: app.expiryDate ? new Date(app.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
    })) ?? [
            { id: 'APP-1001', applicant: 'System Demo', initials: 'SD', district: 'Hodan', status: 'Approved', fee: '$500', time: 'Jun 01', expiry: 'Jun 01' },
        ];

    const statusStyle = (s) => {
        if (s === 'Approved') return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
        if (s === 'Pending') return 'bg-amber-500/10   text-amber-500   border border-amber-500/20';
        if (s === 'Returned') return 'bg-rose-500/10    text-rose-500    border border-rose-500/20';
        return 'bg-gray-500/10    text-text-muted    border border-border-color';
    };

    const statCards = [
        { label: 'Total Users', value: stats?.summary?.totalUsers?.toLocaleString() ?? '—', icon: Users, trend: '+12% vs last month', trendUp: true },
        { label: 'Total Revenue', value: `$${(stats?.summary?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, trend: '+8.4% monthly growth', trendUp: true },
        { label: 'Pending Applications', value: stats?.summary?.pendingApps?.toLocaleString() ?? '—', icon: Clock, trend: 'Requires Attention', trendUp: false },
        { label: 'Approved Permits', value: stats?.summary?.approvedApps?.toLocaleString() ?? '—', icon: CheckCircle, trend: '94% Success Rate', trendUp: true },
    ];

    return (
        <div className="flex min-h-screen bg-bg-soft font-inter transition-colors duration-300">
            <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <TopHeader
                    breadcrumbs={['Super Admin', 'System Overview']}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    placeholder="Global search system..."
                />

                <div className="flex-1 p-8 overflow-y-auto">
                    {/* Page Header */}
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h1 className="text-[28px] font-black text-navy tracking-tight">System Overview</h1>
                            <p className="text-text-muted font-medium text-[14px] mt-1">Real-time performance metrics and regional distribution data.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <button
                                    onClick={() => setIsRangeOpen(!isRangeOpen)}
                                    className="flex items-center gap-2 bg-card-bg border border-border-color px-4 py-2.5 rounded-xl text-[13px] font-bold text-text-muted hover:text-navy hover:bg-table-header-bg transition-all shadow-sm"
                                >
                                    <Calendar size={15} />
                                    {range === 'today' ? 'Today' : range === '7' ? 'Last 7 Days' : 'Last 30 Days'}
                                </button>

                                {isRangeOpen && (
                                    <div className="absolute right-0 mt-2 w-[220px] bg-white border border-gray-100 rounded-2xl shadow-xl z-[200] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        {[
                                            { label: 'Today', value: 'today' },
                                            { label: 'Last 7 Days', value: '7' },
                                            { label: 'Last 30 Days', value: '30' },
                                            { label: 'Custom Range', value: 'custom' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => {
                                                    setRange(opt.value);
                                                    if (opt.value !== 'custom') setIsRangeOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-[13px] font-bold transition-colors ${range === opt.value ? 'bg-navy text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}

                                        {range === 'custom' && (
                                            <div className="px-4 py-3 border-t border-border-color flex flex-col gap-2 bg-table-header-bg/30">
                                                <input
                                                    type="date"
                                                    value={customDates.start}
                                                    onChange={e => setCustomDates({ ...customDates, start: e.target.value })}
                                                    className="text-[11px] font-bold p-1.5 border border-border-color bg-card-bg text-text-main rounded-lg outline-none focus:ring-1 focus:ring-navy"
                                                />
                                                <input
                                                    type="date"
                                                    value={customDates.end}
                                                    onChange={e => setCustomDates({ ...customDates, end: e.target.value })}
                                                    className="text-[11px] font-bold p-1.5 border border-border-color bg-card-bg text-text-main rounded-lg outline-none focus:ring-1 focus:ring-navy"
                                                />
                                                <button
                                                    onClick={() => setIsRangeOpen(false)}
                                                    className="bg-navy text-white text-[11px] font-black py-1.5 rounded-lg mt-1"
                                                >
                                                    Apply Filters
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button className="flex items-center gap-2 bg-navy text-white px-4 py-2.5 rounded-xl text-[13px] font-bold hover:brightness-110 transition-all shadow-md">
                                <Download size={15} /> Export Report
                            </button>
                        </div>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
                        {statCards.map(({ label, value, icon: Icon, trend, trendUp }) => (
                            <div key={label} className="bg-card-bg rounded-2xl p-6 border border-border-color shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[12px] font-black text-text-muted uppercase tracking-widest">{label}</p>
                                    <div className="w-10 h-10 bg-table-header-bg rounded-xl flex items-center justify-center text-text-muted">
                                        <Icon size={18} />
                                    </div>
                                </div>
                                <h3 className="text-[32px] font-black text-navy tracking-tight leading-none mb-3">{value}</h3>
                                <p className={`text-[12px] font-bold flex items-center gap-1 ${trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {trendUp ? <TrendingUp size={12} /> : <span className="font-black">!</span>}
                                    {trend}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                        {/* Application Growth - takes 2/3 */}
                        <div className="xl:col-span-2 bg-card-bg rounded-2xl p-7 border border-border-color shadow-sm">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h3 className="text-[17px] font-black text-navy">Application Growth</h3>
                                    <p className="text-text-muted text-[13px] font-medium mt-0.5">Tracking volume trends by {graphView === 'month' ? 'Date' : 'Month'}.</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex bg-table-header-bg p-1 rounded-xl gap-1">
                                        {graphView === 'month' && (
                                            <select
                                                value={graphMonth}
                                                onChange={(e) => setGraphMonth(parseInt(e.target.value))}
                                                className="bg-transparent text-[11px] font-black text-navy outline-none cursor-pointer px-2"
                                            >
                                                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                                                    <option key={m} value={i + 1} className="bg-card-bg text-text-main">{m}</option>
                                                ))}
                                            </select>
                                        )}
                                        <select
                                            value={graphYear}
                                            onChange={(e) => setGraphYear(parseInt(e.target.value))}
                                            className="bg-transparent text-[11px] font-black text-navy outline-none cursor-pointer px-2 border-l border-border-color"
                                        >
                                            {[2024, 2025, 2026].map(y => (
                                                <option key={y} value={y} className="bg-card-bg text-text-main">{y}</option>
                                            ))}
                                        </select>
                                        <div className="w-[1px] bg-border-color my-1 mx-1"></div>
                                        <button
                                            onClick={() => setGraphView('month')}
                                            className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all ${graphView === 'month' ? 'bg-card-bg text-navy shadow-sm' : 'text-text-muted hover:text-navy'}`}
                                        >
                                            Month
                                        </button>
                                        <button
                                            onClick={() => setGraphView('year')}
                                            className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all ${graphView === 'year' ? 'bg-card-bg text-navy shadow-sm' : 'text-text-muted hover:text-navy'}`}
                                        >
                                            Year
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4 text-[12px] font-bold text-text-muted border-l border-border-color pl-4">
                                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Active</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#f3f4f6'} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }} dy={8} interval={graphView === 'month' ? 4 : 0} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', background: darkMode ? '#1e293b' : '#0d1b2a', color: 'white' }}
                                            labelStyle={{ color: '#93c5fd', fontWeight: 800, fontSize: 11 }}
                                            itemStyle={{ color: 'white', fontWeight: 700 }}
                                            formatter={(v) => [`${v} Applications`]}
                                        />
                                        <Area type="monotone" dataKey="target" stroke={darkMode ? '#475569' : '#d1dff7'} strokeWidth={2} fill="none" dot={false} />
                                        <Area type="monotone" dataKey="active" stroke="#4f8ef7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorActive)"
                                            dot={{ fill: '#4f8ef7', r: 4, strokeWidth: 0 }}
                                            activeDot={{ r: 6, fill: '#4f8ef7', strokeWidth: 2, stroke: '#fff' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Regional Distribution - takes 1/3 */}
                        <div className="bg-card-bg rounded-2xl p-7 border border-border-color shadow-sm flex flex-col transition-colors duration-300">
                            <h3 className="text-[17px] font-black text-navy mb-1">Regional Distribution</h3>
                            <p className="text-text-muted text-[13px] font-medium mb-6">System usage by sector.</p>
                            <div className="flex justify-center mb-6">
                                <div style={{ width: 180, height: 180, position: 'relative' }}>
                                    <PieChart width={180} height={180}>
                                        <Pie
                                            data={districtData}
                                            cx={85} cy={85}
                                            innerRadius={58} outerRadius={85}
                                            paddingAngle={2}
                                            dataKey="value"
                                            startAngle={90} endAngle={-270}
                                        >
                                            {districtData.map((d, i) => (
                                                <Cell key={i} fill={d.color} strokeWidth={0} />
                                            ))}
                                        </Pie>
                                        <text x={90} y={80} textAnchor="middle" fill={darkMode ? '#fff' : '#0d1b2a'} style={{ fontWeight: 900, fontSize: 24 }}>100%</text>
                                        <text x={90} y={98} textAnchor="middle" fill={darkMode ? '#9ca3af' : '#9ca3af'} style={{ fontWeight: 700, fontSize: 11 }}>Coverage</text>
                                    </PieChart>
                                </div>
                            </div>
                            <div className="space-y-3 mt-auto">
                                {districtData.map((d) => (
                                    <div key={d.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }}></span>
                                            <span className="text-[13px] font-bold text-text-muted">{d.name}</span>
                                        </div>
                                        <span className="text-[13px] font-black text-navy">{d.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Executive Activity Log */}
                    <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden transition-colors duration-300">
                        <div className="flex items-center justify-between px-7 py-5 border-b border-border-color">
                            <h3 className="text-[17px] font-black text-navy">Executive Activity Log</h3>
                            <Link to="/admin/all-permits" className="text-[13px] font-black text-blue-500 hover:underline no-underline">View All Logs</Link>
                        </div>
                        <table className="w-full">
                            <thead>
                                <tr className="text-[11px] font-black text-text-muted uppercase tracking-widest border-b border-border-color bg-table-header-bg/50">
                                    <th className="text-left px-7 py-3 w-[150px]">Application ID</th>
                                    <th className="text-left px-4 py-3">Applicant</th>
                                    <th className="text-left px-4 py-3">District</th>
                                    <th className="text-left px-4 py-3">Fee</th>
                                    <th className="text-left px-4 py-3">Status</th>
                                    <th className="text-left px-4 py-3">Expiry</th>
                                    <th className="text-right px-7 py-3">Submitted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activityLog.filter(row =>
                                    row.applicant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    row.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    row.district.toLowerCase().includes(searchTerm.toLowerCase())
                                ).map((row) => (
                                    <tr key={row.id} className="border-b border-border-color hover:bg-table-header-bg/30 transition-colors">
                                        <td className="px-7 py-4 text-[13px] font-black text-blue-500">{row.id}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-navy/5 border border-navy/10 flex items-center justify-center text-[11px] font-black text-text-muted">{row.initials}</div>
                                                <span className="text-[13px] font-bold text-text-main">{row.applicant}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-[13px] font-medium text-text-muted">{row.district}</td>
                                        <td className="px-4 py-4 text-[13px] font-black text-navy">{row.fee}</td>
                                        <td className="px-4 py-4">
                                            <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${statusStyle(row.status)}`}>{row.status}</span>
                                        </td>
                                        <td className="px-4 py-4 text-[13px] font-bold text-rose-500">{row.expiry}</td>
                                        <td className="px-7 py-4 text-right text-[12px] font-bold text-text-muted">{row.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
