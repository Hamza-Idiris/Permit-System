import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import {
  Users, FileText, Clock, Download,
  Printer, Share2, History, CheckCircle, Search
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import LoadingScreen from '../components/LoadingScreen';
import TopHeader from '../components/TopHeader';
import { useTheme } from '../context/ThemeContext';

const Reports = () => {
  const { token } = useContext(AuthContext);
  const { darkMode } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        const res = await axios.get('http://localhost:5000/api/analytics', config);
        if (res.data.success) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  if (loading) return <LoadingScreen />;

  const formatCurrency = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
    return `$${val}`;
  };

  const formatNumber = (val) => {
    return new Intl.NumberFormat().format(val || 0);
  };

  // Prepare Bar Chart Data
  // We'll show the last 7 months for the bar chart to match the design (JAN to JUL)
  // or we can just use the returned monthlyRevenue.
  const barData = stats?.charts?.monthlyRevenue || [];
  // Find max revenue index to color it dark blue
  let maxRevenueIndex = 0;
  let maxRev = 0;
  barData.forEach((d, i) => {
    if (d.revenue > maxRev) { maxRev = d.revenue; maxRevenueIndex = i; }
  });

  // Prepare Doughnut Chart Data
  const pieColors = ['#0a2647', '#3b82f6', '#93c5fd', '#e2e8f0', '#cbd5e1'];
  const districtData = stats?.charts?.districtDistribution?.slice(0, 5) || [];
  const totalApps = districtData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="flex min-h-screen bg-bg-soft font-inter transition-colors duration-300">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden container-padding">
        {/* Top Navigation */}
        <TopHeader
          breadcrumbs={['Global', 'Analytics', 'Reports']}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search records..."
        />

        <div className="flex-1 overflow-y-auto pt-10 pb-20">
          <div className="max-w-6xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div className="space-y-1">
                <h1 className="text-4xl font-black text-navy tracking-tight transition-colors">Reports & Analytics</h1>
                <p className="text-text-muted font-medium text-sm transition-colors">Comprehensive municipal performance and revenue ledger.</p>
              </div>
              <button className="bg-navy text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-navy/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
                <Download size={16} /> Export to PDF/Excel
              </button>
            </div>

            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card-bg rounded-2xl p-6 border border-border-color shadow-sm flex flex-col justify-between h-[140px] transition-colors">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-table-header-bg rounded-xl">
                    <Users size={20} className="text-navy" />
                  </div>
                  <span className="text-[11px] font-black text-text-main flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                    +12%
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Registered Users</p>
                  <h3 className="text-3xl font-black text-navy tracking-tighter transition-colors">{formatNumber(stats?.summary?.totalUsers)}</h3>
                </div>
              </div>

              <div className="bg-card-bg rounded-2xl p-6 border border-border-color shadow-sm flex flex-col justify-between h-[140px] transition-colors">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-table-header-bg rounded-xl">
                    <FileText size={20} className="text-navy" />
                  </div>
                  <span className="text-[11px] font-black text-text-main flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                    +8.4%
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Actual Applicants</p>
                  <h3 className="text-3xl font-black text-navy tracking-tighter transition-colors">{formatNumber(stats?.summary?.actualApplicants || 18245)}</h3>
                </div>
              </div>

              <div className="bg-card-bg rounded-2xl p-6 border border-border-color shadow-sm flex flex-col justify-between h-[140px] transition-colors">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-table-header-bg rounded-xl">
                    <Clock size={20} className="text-navy" />
                  </div>
                  <span className="text-[11px] font-black text-rose-500 flex items-center gap-1 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline><polyline points="16 17 22 17 22 11"></polyline></svg>
                    -2d
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1 transition-colors">Avg. Processing Time</p>
                  <h3 className="text-3xl font-black text-navy tracking-tighter transition-colors">4.2 Days</h3>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar Chart */}
              <div className="bg-card-bg rounded-2xl p-8 border border-border-color shadow-sm lg:col-span-2 transition-colors duration-300">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xl font-black text-navy transition-colors">Monthly Revenue Collected</h3>
                    <p className="text-sm text-text-muted font-medium transition-colors">Figures represented in USD (Millions)</p>
                  </div>
                  <span className="px-3 py-1 bg-table-header-bg text-text-main text-xs font-bold rounded-lg transition-colors">Fiscal Year {new Date().getFullYear()}</span>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData.slice(0, 7)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#0a2647' }} labelStyle={{ color: darkMode ? '#93c5fd' : '#0a2647' }} formatter={(val) => [`$${val.toLocaleString()}`, 'Revenue']} />
                      <Bar dataKey="revenue" radius={[6, 6, 6, 6]} barSize={45}>
                        {barData.slice(0, 7).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === maxRevenueIndex ? (darkMode ? '#4f8ef7' : '#0a2647') : (darkMode ? '#334155' : '#e2e8f0')} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="bg-card-bg rounded-2xl p-8 border border-border-color shadow-sm flex flex-col transition-colors duration-300">
                <div>
                  <h3 className="text-lg font-black text-navy mb-1 transition-colors">Applications per District</h3>
                  <p className="text-xs text-text-muted font-medium mb-6 transition-colors">Total volume distribution</p>
                </div>

                <div className="relative flex-1 flex items-center justify-center min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={districtData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {districtData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-colors">
                    <span className="text-xl font-black text-navy tracking-tighter">
                      {totalApps >= 1000 ? `${(totalApps / 1000).toFixed(1)}k` : totalApps}
                    </span>
                    <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Total Apps</span>
                  </div>
                </div>

                {/* Custom Legend */}
                <div className="space-y-2 mt-4">
                  {districtData.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: pieColors[idx] }}></div>
                        <span className="font-bold text-navy text-xs transition-colors">{item.name}</span>
                      </div>
                      <span className="font-bold text-text-muted text-xs transition-colors">
                        {Math.round((item.value / totalApps) * 100) || 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-center -mt-3 relative z-10 transition-colors duration-300">
              <div className="bg-card-bg rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] py-3 px-6 flex items-center gap-6 border border-border-color transition-colors">
                <div className="flex items-center gap-2 pr-6 border-r border-border-color">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-navy tracking-widest uppercase transition-colors">Live Sync: Active</span>
                </div>
                <button className="flex items-center gap-2 text-[11px] font-bold text-text-muted hover:text-navy transition-colors">
                  <Printer size={14} /> Print Page
                </button>
                <button className="flex items-center gap-2 text-[11px] font-bold text-text-muted hover:text-navy transition-colors">
                  <Share2 size={14} /> Share Report
                </button>
                <button className="flex items-center gap-2 text-[11px] font-bold text-text-muted hover:text-navy transition-colors">
                  <History size={14} /> View History
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden mt-2 transition-colors duration-300">
              <div className="p-6 flex justify-between items-center border-b border-border-color">
                <h3 className="text-lg font-black text-navy transition-colors">District Performance Breakdown</h3>
                <button className="text-xs font-bold text-navy hover:underline transition-colors">View All Districts</button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-table-header-bg/50 transition-colors">
                    <th className="py-4 px-6 text-[10px] font-black text-text-muted uppercase tracking-widest transition-colors">District Name</th>
                    <th className="py-4 px-6 text-[10px] font-black text-text-muted uppercase tracking-widest transition-colors">Volume</th>
                    <th className="py-4 px-6 text-[10px] font-black text-text-muted uppercase tracking-widest transition-colors">Avg. Time</th>
                    <th className="py-4 px-6 text-[10px] font-black text-text-muted uppercase tracking-widest transition-colors">Conversion Rate</th>
                    <th className="py-4 px-6 text-[10px] font-black text-text-muted uppercase tracking-widest transition-colors text-right transition-colors">Revenue Yield</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {stats?.tables?.districtPerformance?.filter(row => row.district?.toLowerCase().includes(searchTerm?.toLowerCase() || '')).map((row, idx) => (
                    <tr key={idx} className="hover:bg-table-header-bg/30 transition-colors">
                      <td className="py-5 px-6">
                        <span className="font-bold text-navy text-sm transition-colors">{row.district}</span>
                      </td>
                      <td className="py-5 px-6 text-sm text-text-muted font-medium transition-colors">
                        {formatNumber(row.volume)}
                      </td>
                      <td className="py-5 px-6 text-sm text-text-muted font-medium transition-colors">
                        {row.avgTime}
                      </td>
                      <td className="py-5 px-6 text-sm text-text-muted font-medium transition-colors">
                        <div className="w-32 bg-table-header-bg rounded-full h-1.5 flex overflow-hidden transition-colors">
                          <div
                            className="bg-navy h-full transition-colors"
                            style={{ width: `${row.conversionRate || 0}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <span className="font-bold text-navy text-sm transition-colors">{formatCurrency(row.revenueYield)}</span>
                      </td>
                    </tr>
                  ))}
                  {!stats?.tables?.districtPerformance?.length && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-400 text-sm font-medium">No performance data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reports;
