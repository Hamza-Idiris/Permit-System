import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import LoadingScreen from '../components/LoadingScreen';
import {
  FileText, DollarSign, Download, Search, MapPin, Layers, Users,
  TrendingUp, TrendingDown, Building2, Trophy
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { useTheme } from '../context/ThemeContext';

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7', label: '7 Days' },
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

const STATUS_OPTIONS = ['all', 'Pending', 'In Review', 'Approved', 'Returned'];
const REQUEST_TYPES = ['all', 'New Construction', 'Renovation'];

const StatusBadge = ({ status }) => {
  const map = {
    Pending: 'bg-amber-500/10 text-amber-500',
    'In Review': 'bg-blue-500/10 text-blue-500',
    Approved: 'bg-emerald-500/10 text-emerald-500',
    Returned: 'bg-rose-500/10 text-rose-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase border border-border-color/10 ${map[status] || 'bg-table-header-bg text-text-muted'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status || '—'}
    </span>
  );
};

const Reports = () => {
  const { token, user } = useAuth();
  const { darkMode } = useTheme();
  const isAdmin = user?.role === 'superadmin';
  const isStaff = user?.role === 'staff';

  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [data, setData] = useState(null);

  const [range, setRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [district, setDistrict] = useState(isStaff ? (user?.district || '') : 'all');
  const [status, setStatus] = useState('all');
  const [requestType, setRequestType] = useState('all');
  const [buildingCategory, setBuildingCategory] = useState('all');
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState('applications');

  useEffect(() => {
    if (isStaff && user?.district) setDistrict(user.district);
  }, [isStaff, user?.district]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    axios
      .get('http://localhost:5000/api/districts', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data.success) setDistricts(res.data.data || []);
      })
      .catch(() => {});
  }, [isAdmin, token]);

  const apiSection = activeTab === 'users' ? 'users' : 'applications';

  const fetchReports = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = {
        range,
        status,
        requestType,
        search,
        section: apiSection,
        limit: 2000,
      };
      if (range === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      if (isAdmin && district && district !== 'all') {
        params.district = district;
      }
      if (buildingCategory && buildingCategory !== 'all') {
        params.buildingCategory = buildingCategory;
      }

      const res = await axios.get('http://localhost:5000/api/analytics/reports', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
        params,
      });
      if (res.data.success) {
        setData(res.data);
        // Keep a stable category list (don't shrink when filtered)
        if (!buildingCategory || buildingCategory === 'all') {
          const cats = (res.data.breakdowns?.byCategory || [])
            .map((c) => c.category)
            .filter(Boolean);
          setCategoryOptions([...new Set(cats)].sort());
        } else {
          setCategoryOptions((prev) => {
            const next = new Set(prev);
            (res.data.breakdowns?.byCategory || []).forEach((c) => {
              if (c.category) next.add(c.category);
            });
            if (buildingCategory) next.add(buildingCategory);
            return [...next].sort();
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  }, [token, range, startDate, endDate, district, status, requestType, buildingCategory, search, apiSection, isAdmin]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const summary = data?.summary || {
    total: 0, pending: 0, approved: 0, returned: 0, revenue: 0,
    highestRevenueDistrict: null, lowestRevenueDistrict: null, mostPermitsDistrict: null,
  };
  const rows = data?.rows || [];
  const byDistrict = data?.breakdowns?.byDistrict || [];
  const byCategory = data?.breakdowns?.byCategory || [];
  const revenueByDistrict = data?.breakdowns?.revenueByDistrict || [];
  const topApplicants = data?.breakdowns?.topApplicants || [];
  const usersList = data?.users || [];

  const formatCurrency = (val) => {
    const n = Number(val) || 0;
    if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
    return `$${n.toLocaleString()}`;
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleDownloadCSV = () => {
    const headers = [
      'Application ID', 'Permit ID', 'Applicant', 'District', 'Category',
      'Floors', 'Land Area', 'Fee', 'Status', 'Submitted', 'Approved By',
    ];
    const csvRows = rows.map((r) => [
      r.applicationId,
      r.permitId,
      r.applicant,
      r.district,
      r.buildingCategory,
      r.floors === '—' ? '' : r.floors,
      r.landArea,
      r.totalFee,
      r.status,
      formatDate(r.submittedAt),
      r.reviewedBy,
    ]);
    const csv = [
      headers.join(','),
      ...csvRows.map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const title = isStaff
    ? `District Reports${user?.district ? ` — ${user.district}` : ''}`
    : 'System Reports';
  const breadcrumbs = isStaff
    ? ['Staff', 'Reports', user?.district].filter(Boolean)
    : ['Admin', 'Analytics', 'Reports'];

  const tabs = useMemo(() => {
    const base = [
      { id: 'applications', label: 'Applications', icon: FileText },
      { id: 'district', label: 'By District', icon: MapPin },
      { id: 'category', label: 'By Category', icon: Layers },
      { id: 'revenue', label: 'Revenue', icon: DollarSign },
      { id: 'applicants', label: 'Top Applicants', icon: Trophy },
    ];
    if (isAdmin) base.push({ id: 'users', label: 'Users', icon: Users });
    return base;
  }, [isAdmin]);

  const mostPermitsName = summary.mostPermitsDistrict?.district;
  const pieColors = ['#0a2647', '#3b82f6', '#93c5fd', '#64748b', '#cbd5e1', '#1e40af'];
  const selectCls =
    'bg-card-bg border border-border-color rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy outline-none focus:ring-2 focus:ring-navy/20 transition-colors';
  const tooltipStyle = {
    borderRadius: '12px',
    border: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    background: darkMode ? '#1e293b' : '#fff',
    color: darkMode ? '#fff' : '#0a2647',
  };

  if (loading && !data) return <LoadingScreen />;

  return (
    <div className="flex min-h-screen bg-bg-soft font-sans transition-colors duration-300">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader
          breadcrumbs={breadcrumbs}
          searchTerm={searchInput}
          setSearchTerm={setSearchInput}
          placeholder="Search application, permit, applicant..."
        />

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-navy tracking-tight mb-1">{title}</h1>
                <p className="text-sm text-text-muted font-bold">
                  {isStaff
                    ? 'Filtered performance and application ledger for your district.'
                    : 'System-wide municipal permit analytics and exportable ledgers.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadCSV}
                disabled={!rows.length}
                className="bg-navy text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-navy/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none shrink-0"
              >
                <Download size={16} /> Download CSV
              </button>
            </div>

            {/* Filters */}
            <div className="bg-card-bg rounded-2xl border border-border-color p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRange(opt.value)}
                    className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                      range === opt.value
                        ? 'bg-navy text-white shadow-md shadow-navy/20'
                        : 'bg-table-header-bg text-text-muted hover:text-navy'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {range === 'custom' && (
                <div className="flex flex-wrap gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5">Start Date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={selectCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5">End Date</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={selectCls} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {isAdmin ? (
                  <div>
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5">District</label>
                    <select value={district} onChange={(e) => setDistrict(e.target.value)} className={`w-full ${selectCls}`}>
                      <option value="all">All Districts</option>
                      {districts.map((d) => (
                        <option key={d._id || d.name} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5">District</label>
                    <input
                      readOnly
                      value={user?.district || '—'}
                      className={`w-full ${selectCls} opacity-80 cursor-not-allowed`}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={`w-full ${selectCls}`}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5">Request Type</label>
                  <select value={requestType} onChange={(e) => setRequestType(e.target.value)} className={`w-full ${selectCls}`}>
                    {REQUEST_TYPES.map((t) => (
                      <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5">Building Category</label>
                  <select value={buildingCategory} onChange={(e) => setBuildingCategory(e.target.value)} className={`w-full ${selectCls}`}>
                    <option value="all">All Categories</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5">Search</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="ID, name, plot..."
                      className={`w-full pl-9 ${selectCls}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              {[
                {
                  label: 'Total Apps',
                  value: summary.total ?? 0,
                  icon: FileText,
                  sub: null,
                },
                {
                  label: 'Revenue',
                  value: formatCurrency(summary.revenue),
                  icon: DollarSign,
                  sub: null,
                },
                {
                  label: 'Highest Revenue',
                  value: summary.highestRevenueDistrict?.district || '—',
                  icon: TrendingUp,
                  sub: summary.highestRevenueDistrict
                    ? formatCurrency(summary.highestRevenueDistrict.revenue)
                    : null,
                },
                {
                  label: 'Lowest Revenue',
                  value: summary.lowestRevenueDistrict?.district || '—',
                  icon: TrendingDown,
                  sub: summary.lowestRevenueDistrict
                    ? formatCurrency(summary.lowestRevenueDistrict.revenue)
                    : null,
                },
                {
                  label: 'Most Permits',
                  value: summary.mostPermitsDistrict?.district || '—',
                  icon: Building2,
                  sub: summary.mostPermitsDistrict
                    ? `${summary.mostPermitsDistrict.count} apps`
                    : null,
                },
              ].map((card) => (
                <div key={card.label} className="bg-card-bg rounded-2xl p-5 border border-border-color shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-table-header-bg">
                      <card.icon size={16} className="text-navy" />
                    </div>
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{card.label}</span>
                  </div>
                  <h3 className="text-xl font-black text-navy tracking-tighter truncate" title={String(card.value)}>
                    {card.value}
                  </h3>
                  {card.sub && (
                    <p className="text-sm font-bold text-text-muted mt-1">{card.sub}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-black transition-all border ${
                    activeTab === id
                      ? 'bg-navy text-white border-navy shadow-md shadow-navy/20'
                      : 'bg-card-bg text-text-muted border-border-color hover:text-navy'
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {loading && (
              <p className="text-sm font-bold text-text-muted">Refreshing…</p>
            )}

            {activeTab === 'applications' && (
              <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden">
                <div className="p-6 flex justify-between items-center border-b border-border-color">
                  <h3 className="text-lg font-black text-navy">Applications</h3>
                  <span className="text-[11px] font-black text-text-muted uppercase tracking-widest">
                    {rows.length} rows
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[960px]">
                    <thead>
                      <tr className="bg-table-header-bg/50">
                        {['Application ID', 'Permit ID', 'Applicant', 'District', 'Category', 'Floors', 'Land Area', 'Fee', 'Status', 'Submitted', 'Approved By'].map((h) => (
                          <th key={h} className="py-4 px-5 text-[10px] font-black text-text-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                      {rows.map((r, idx) => (
                        <tr key={`${r.applicationId}-${idx}`} className="hover:bg-table-header-bg/30 transition-colors">
                          <td className="py-4 px-5 text-sm font-bold text-navy whitespace-nowrap">{r.applicationId || '—'}</td>
                          <td className="py-4 px-5 text-sm font-medium text-text-muted whitespace-nowrap">{r.permitId || '—'}</td>
                          <td className="py-4 px-5 text-sm font-bold text-navy">{r.applicant || '—'}</td>
                          <td className="py-4 px-5 text-sm text-text-muted font-medium">{r.district || '—'}</td>
                          <td className="py-4 px-5 text-sm text-text-muted font-medium">{r.buildingCategory || '—'}</td>
                          <td className="py-4 px-5 text-sm text-text-muted font-medium">
                            {r.floors && r.floors !== '—' ? r.floors : ''}
                          </td>
                          <td className="py-4 px-5 text-sm text-text-muted font-medium">
                            {r.landArea != null ? `${r.landArea}` : '—'}
                          </td>
                          <td className="py-4 px-5 text-sm font-bold text-navy whitespace-nowrap">
                            {r.totalFee != null ? formatCurrency(r.totalFee) : '—'}
                          </td>
                          <td className="py-4 px-5"><StatusBadge status={r.status} /></td>
                          <td className="py-4 px-5 text-sm text-text-muted font-medium whitespace-nowrap">{formatDate(r.submittedAt)}</td>
                          <td className="py-4 px-5 text-sm text-text-muted font-medium">{r.reviewedBy || '—'}</td>
                        </tr>
                      ))}
                      {!rows.length && (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-text-muted text-sm font-medium">
                            No applications match the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'district' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-card-bg rounded-2xl border border-border-color p-6 lg:col-span-2 shadow-sm">
                  <h3 className="text-lg font-black text-navy mb-6">Applications by District</h3>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byDistrict} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                        <XAxis dataKey="district" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={36}>
                          {byDistrict.map((d, i) => (
                            <Cell
                              key={i}
                              fill={
                                d.district === mostPermitsName
                                  ? (darkMode ? '#4f8ef7' : '#0a2647')
                                  : (darkMode ? '#334155' : '#e2e8f0')
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-border-color">
                    <h3 className="text-base font-black text-navy">District Breakdown</h3>
                  </div>
                  <div className="overflow-x-auto max-h-[320px]">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-table-header-bg/50 sticky top-0">
                          {['District', 'Count', 'Approved', 'Revenue'].map((h) => (
                            <th key={h} className="py-3 px-4 text-[10px] font-black text-text-muted uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-color">
                        {byDistrict.map((d, i) => {
                          const isTop = d.district === mostPermitsName;
                          return (
                            <tr
                              key={i}
                              className={`hover:bg-table-header-bg/30 ${isTop ? 'bg-emerald-500/10' : ''}`}
                            >
                              <td className="py-3 px-4 text-sm font-bold text-navy">
                                {d.district || '—'}
                                {isTop && (
                                  <span className="ml-2 text-[9px] font-black uppercase tracking-wider text-emerald-600">
                                    Most
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-text-muted font-medium">{d.count}</td>
                              <td className="py-3 px-4 text-sm text-text-muted font-medium">{d.approved}</td>
                              <td className="py-3 px-4 text-sm font-bold text-navy">{formatCurrency(d.revenue)}</td>
                            </tr>
                          );
                        })}
                        {!byDistrict.length && (
                          <tr><td colSpan={4} className="py-8 text-center text-text-muted text-sm">No district data.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'category' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-card-bg rounded-2xl border border-border-color p-6 shadow-sm flex flex-col">
                  <h3 className="text-lg font-black text-navy mb-4">By Category</h3>
                  <div className="relative flex-1 min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={byCategory.map((c) => ({ name: c.category || 'Unknown', value: c.count }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {byCategory.map((_, i) => (
                            <Cell key={i} fill={pieColors[i % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden lg:col-span-2">
                  <div className="p-5 border-b border-border-color flex justify-between items-center">
                    <h3 className="text-base font-black text-navy">Category Breakdown</h3>
                    {buildingCategory !== 'all' && (
                      <span className="text-[11px] font-black text-navy uppercase tracking-widest bg-table-header-bg px-3 py-1 rounded-full">
                        Filtered: {buildingCategory}
                      </span>
                    )}
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-table-header-bg/50">
                        {['Category', 'Count', 'Revenue'].map((h) => (
                          <th key={h} className="py-3 px-5 text-[10px] font-black text-text-muted uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                      {byCategory.map((c, i) => (
                        <tr key={i} className="hover:bg-table-header-bg/30">
                          <td className="py-4 px-5 text-sm font-bold text-navy">{c.category || '—'}</td>
                          <td className="py-4 px-5 text-sm text-text-muted font-medium">{c.count}</td>
                          <td className="py-4 px-5 text-sm font-bold text-navy">{formatCurrency(c.revenue)}</td>
                        </tr>
                      ))}
                      {!byCategory.length && (
                        <tr><td colSpan={3} className="py-8 text-center text-text-muted text-sm">No category data.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'revenue' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card-bg rounded-2xl border border-border-color p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10">
                        <TrendingUp size={18} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Highest Revenue District</p>
                        <h3 className="text-xl font-black text-navy">
                          {summary.highestRevenueDistrict?.district || '—'}
                        </h3>
                      </div>
                    </div>
                    <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                      {summary.highestRevenueDistrict
                        ? formatCurrency(summary.highestRevenueDistrict.revenue)
                        : '$0'}
                    </p>
                  </div>
                  <div className="bg-card-bg rounded-2xl border border-border-color p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-rose-500/10">
                        <TrendingDown size={18} className="text-rose-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Lowest Revenue District</p>
                        <h3 className="text-xl font-black text-navy">
                          {summary.lowestRevenueDistrict?.district || '—'}
                        </h3>
                      </div>
                    </div>
                    <p className="text-3xl font-black text-rose-500 tracking-tighter">
                      {summary.lowestRevenueDistrict
                        ? formatCurrency(summary.lowestRevenueDistrict.revenue)
                        : '$0'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-card-bg rounded-2xl border border-border-color p-6 lg:col-span-2 shadow-sm">
                    <h3 className="text-lg font-black text-navy mb-6">Revenue by District</h3>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueByDistrict} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                          <XAxis dataKey="district" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            formatter={(value) => [formatCurrency(value), 'Revenue']}
                          />
                          <Bar dataKey="revenue" radius={[6, 6, 6, 6]} barSize={36}>
                            {revenueByDistrict.map((_, i) => (
                              <Cell
                                key={i}
                                fill={i === 0 ? (darkMode ? '#4f8ef7' : '#0a2647') : (darkMode ? '#334155' : '#e2e8f0')}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-border-color">
                      <h3 className="text-base font-black text-navy">Sorted by Revenue</h3>
                    </div>
                    <div className="overflow-x-auto max-h-[320px]">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-table-header-bg/50 sticky top-0">
                            {['District', 'Count', 'Revenue'].map((h) => (
                              <th key={h} className="py-3 px-4 text-[10px] font-black text-text-muted uppercase tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                          {revenueByDistrict.map((d, i) => (
                            <tr key={i} className="hover:bg-table-header-bg/30">
                              <td className="py-3 px-4 text-sm font-bold text-navy">{d.district || '—'}</td>
                              <td className="py-3 px-4 text-sm text-text-muted font-medium">{d.count}</td>
                              <td className="py-3 px-4 text-sm font-bold text-navy">{formatCurrency(d.revenue)}</td>
                            </tr>
                          ))}
                          {!revenueByDistrict.length && (
                            <tr><td colSpan={3} className="py-8 text-center text-text-muted text-sm">No revenue data.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'applicants' && (
              <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden">
                <div className="p-6 flex justify-between items-center border-b border-border-color">
                  <h3 className="text-lg font-black text-navy">Top Applicants</h3>
                  <span className="text-[11px] font-black text-text-muted uppercase tracking-widest">
                    {topApplicants.length} rows
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className="bg-table-header-bg/50">
                        {['Applicant', 'Phone', 'Applications', 'Revenue', 'Approved', 'Districts'].map((h) => (
                          <th key={h} className="py-4 px-5 text-[10px] font-black text-text-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                      {topApplicants.map((a, i) => (
                        <tr key={i} className="hover:bg-table-header-bg/30">
                          <td className="py-4 px-5 text-sm font-bold text-navy">{a.applicant || '—'}</td>
                          <td className="py-4 px-5 text-sm text-text-muted font-medium">{a.phone || '—'}</td>
                          <td className="py-4 px-5 text-sm font-bold text-navy">{a.applications}</td>
                          <td className="py-4 px-5 text-sm font-bold text-navy">{formatCurrency(a.revenue)}</td>
                          <td className="py-4 px-5 text-sm text-text-muted font-medium">{a.approved}</td>
                          <td className="py-4 px-5 text-sm text-text-muted font-medium">
                            {Array.isArray(a.districts) ? a.districts.filter(Boolean).join(', ') || '—' : '—'}
                          </td>
                        </tr>
                      ))}
                      {!topApplicants.length && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-text-muted text-sm font-medium">
                            No applicant data for the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'users' && isAdmin && (
              <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border-color">
                  <h3 className="text-lg font-black text-navy">Users</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[720px]">
                    <thead>
                      <tr className="bg-table-header-bg/50">
                        {['Name', 'Email', 'Phone', 'Role', 'District', 'Active', 'Joined'].map((h) => (
                          <th key={h} className="py-4 px-5 text-[10px] font-black text-text-muted uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                      {usersList.map((u, i) => (
                        <tr key={i} className="hover:bg-table-header-bg/30">
                          <td className="py-4 px-5 text-sm font-bold text-navy">{u.fullName}</td>
                          <td className="py-4 px-5 text-sm text-text-muted font-medium">{u.email}</td>
                          <td className="py-4 px-5 text-sm text-text-muted font-medium">{u.phone || '—'}</td>
                          <td className="py-4 px-5 text-sm font-bold text-navy capitalize">{u.role}</td>
                          <td className="py-4 px-5 text-sm text-text-muted font-medium">{u.district || '—'}</td>
                          <td className="py-4 px-5 text-sm font-medium">{u.isActive ? 'Yes' : 'No'}</td>
                          <td className="py-4 px-5 text-sm text-text-muted font-medium">{formatDate(u.createdAt)}</td>
                        </tr>
                      ))}
                      {!usersList.length && (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-text-muted text-sm font-medium">
                            No users to display.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reports;
