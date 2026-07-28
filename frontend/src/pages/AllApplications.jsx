import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import {
  Search, Filter, Download, Settings2, ChevronLeft, ChevronRight,
  Clock, CheckCircle2, CornerDownLeft, XCircle, MoreVertical,
  AlertTriangle, Eye, RefreshCw, FileSearch, Undo2,
  Calendar, UserCheck, Loader2, Trash2
} from 'lucide-react';
import ConfigDrawer from '../components/ConfigDrawer';
import LoadingScreen from '../components/LoadingScreen';
import TopHeader from '../components/TopHeader';
import { useTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';

const ALL_COLUMNS = [
  { id: 'applicationId', label: 'Application ID', mandatory: true },
  { id: 'applicantName', label: 'Applicant Name' },
  { id: 'district', label: 'District Code' },
  { id: 'submissionDate', label: 'Submission Date' },
  { id: 'approvalDate', label: 'Approval Date' },
  { id: 'expiryDate', label: 'Expiry Date' },
  { id: 'permitType', label: 'Permit Type' },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Actions', mandatory: true }
];

const PERMIT_TYPES = ['All Types', 'Jiingad', 'Villa (Bulukeeti)', 'Villa (Dhagax)', 'Dabaq'];

const PAGE_SIZE = 10;

const statusConfig = {
  Pending: { label: 'PENDING', bg: 'bg-amber-500/10', color: 'text-amber-500', dot: 'bg-amber-500' },
  'In Review': { label: 'IN REVIEW', bg: 'bg-blue-500/10', color: 'text-blue-500', dot: 'bg-blue-500' },
  Approved: { label: 'APPROVED', bg: 'bg-emerald-500/10', color: 'text-emerald-500', dot: 'bg-emerald-500' },
  Returned: { label: 'RETURNED', bg: 'bg-rose-500/10', color: 'text-rose-500', dot: 'bg-rose-500' },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.Pending;
  return (
    <span className={`${cfg.bg} ${cfg.color} px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase inline-flex items-center gap-1.5 border border-current/10`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const PermitTypeBadge = ({ type }) => (
  <span className="bg-table-header-bg text-text-muted px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase border border-border-color">
    {type || '—'}
  </span>
);

const StatCard = ({ icon: Icon, label, value, color, glow, statusKey, isActive, onClick }) => (
  <button
    onClick={() => onClick(statusKey)}
    className={`glass-card p-7 rounded-[28px] card-lift border relative overflow-hidden group text-left w-full transition-all duration-300 flex flex-col ${isActive
      ? 'border-navy/30 ring-2 ring-navy/20 scale-[1.02] shadow-lg bg-navy/5'
      : 'border-border-color hover:border-navy/20'
      }`}
  >
    <div className="absolute -right-4 -top-4 w-28 h-28 bg-current opacity-[0.02] rounded-full group-hover:scale-150 transition-transform duration-700" />
    <div className="flex items-center justify-between mb-6 w-full">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10 ${glow} glow-icon shrink-0`}>
        <Icon size={20} className={isActive ? 'text-navy' : ''} />
      </div>
      <div className="flex items-center gap-2">
        {isActive && (
          <span className="text-[9px] font-black text-white bg-navy px-2 py-0.5 rounded-full uppercase tracking-widest">
            Active
          </span>
        )}
        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest transition-colors">{label}</span>
      </div>
    </div>
    <div className="mt-auto w-full">
      <h4 className="text-4xl font-black text-navy tracking-tighter transition-colors">{value ?? '—'}</h4>
      <p className="text-[11px] font-bold text-text-muted mt-1 capitalize transition-colors">{statusKey || 'All'} Applications</p>
      <div className={`h-1.5 rounded-full mt-5 ${color} transition-all duration-700 ${isActive ? 'w-full opacity-40' : 'w-10 opacity-20 group-hover:w-full'
        }`} />
    </div>
  </button>
);

const AllApplications = () => {
  const { token, user } = useContext(AuthContext);
  const { wsData } = useWebSocket();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const [search, setSearch] = useState('');
  const [districts, setDistricts] = useState([]);
  const [districtFilter, setDistrict] = useState('All Districts');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [actionMenu, setActionMenu] = useState(null); // { id, x, y }
  const [selectedApp, setSelectedApp] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ status: '', title: '' });
  const [returnReason, setReturnReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Grid Config State
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(ALL_COLUMNS.map(c => c.id));
  const [rowDensity, setRowDensity] = useState('comfortable');

  useEffect(() => {
    const savedCols = localStorage.getItem('admin_app_columns');
    const savedDensity = localStorage.getItem('admin_app_density');
    if (savedCols) {
      try {
        const parsed = JSON.parse(savedCols);
        // Ensure mandatory columns are always there
        const mandatory = ALL_COLUMNS.filter(c => c.mandatory).map(c => c.id);
        const final = Array.from(new Set([...parsed, ...mandatory]));
        setVisibleColumns(final);
      } catch (e) {
        console.error('Failed to parse saved columns', e);
      }
    }
    if (savedDensity) setRowDensity(savedDensity);
  }, []);

  const handleApplyView = () => {
    localStorage.setItem('admin_app_columns', JSON.stringify(visibleColumns));
    localStorage.setItem('admin_app_density', rowDensity);
    setShowConfigDrawer(false);
  };

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const cfg = { headers: { Authorization: `Bearer ${token}` } };
      const [permRes, distRes] = await Promise.all([
        axios.get('http://localhost:5000/api/permits/all', cfg),
        axios.get('http://localhost:5000/api/districts', cfg)
      ]);

      if (permRes.data.success) {
        setApplications(permRes.data.data);
        setStats(permRes.data.stats);
        setLastRefreshed(new Date());
      }

      if (distRes.data.success) {
        setDistricts(distRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch applications', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (wsData && (wsData.type === 'GLOBAL_PERMIT_APPLICATION_UPDATED' || wsData.type === 'PERMIT_APPLICATION_UPDATED')) {
      fetchData(true); // silent fetch on update
    }
  }, [wsData, fetchData]);

  const handleAction = async (appId, action, data = {}) => {
    setProcessing(true);
    try {
      const cfg = { headers: { Authorization: `Bearer ${token}` } };
      let res;
      if (action === 'review') {
        res = await axios.put(`http://localhost:5000/api/permits/${appId}/review`, { status: data.status, staffRemarks: data.remarks }, cfg);
      }

      if (res?.data.success) {
        await fetchData(true);
        setShowReturnModal(false);
        setShowConfirmModal(false);
        setReturnReason('');
      }
    } catch (err) {
      console.error('Action failed', err);
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  // Close action menu on outside click
  useEffect(() => {
    const handler = () => setActionMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  // Filtering
  const filtered = applications.filter(app => {
    const name = app.formData?.fullName?.toLowerCase() || '';
    const id = app.applicationId?.toLowerCase() || '';
    const matchSearch = !search || name.includes(search.toLowerCase()) || id.includes(search.toLowerCase());
    const matchDistrict = districtFilter === 'All Districts' || app.district === districtFilter;
    const matchType = typeFilter === 'All Types' || app.formData?.buildingCategory === typeFilter;
    const matchStatus = statusFilter === '' || app.status === statusFilter;
    return matchSearch && matchDistrict && matchType && matchStatus;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleExportCSV = () => {
    const headers = ['Application ID', 'Applicant Name', 'District', 'Submission Date', 'Approval Date', 'Expiry Date', 'Permit Type', 'Status'];
    const rows = filtered.map(a => [
      a.applicationId,
      a.user?.fullName || a.formData?.fullName,
      a.district,
      new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      a.approvalDate ? new Date(a.approvalDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
      a.expiryDate ? new Date(a.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
      a.reviewedBy?.fullName || '—',
      a.formData?.buildingCategory,
      a.status
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'applications_export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const timeSince = () => {
    if (!lastRefreshed) return '';
    const diff = Math.floor((Date.now() - lastRefreshed) / 1000);
    if (diff < 60) return `${diff} seconds ago`;
    return `${Math.floor(diff / 60)} minutes ago`;
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="flex min-h-screen bg-bg-soft font-sans transition-colors duration-300">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader
          breadcrumbs={['Global', 'Oversight']}
          searchTerm={search}
          setSearchTerm={setSearch}
          placeholder="Search applications..."
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          {/* Page Title */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0A2647', letterSpacing: '-0.02em', marginBottom: 4 }}>
                Applications Oversight
              </h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-card-bg border border-border-color rounded-xl px-5 py-2.5 text-[13px] font-bold text-text-muted hover:text-navy transition-all"
              >
                <Download size={15} /> Export CSV
              </button>
              <button
                onClick={() => setShowConfigDrawer(true)}
                className="flex items-center gap-2 bg-navy text-white rounded-xl px-5 py-2.5 text-[13px] font-bold hover:brightness-110 transition-all shadow-lg shadow-navy/20"
              >
                <Settings2 size={15} /> Configure Views
              </button>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-7">
            <StatCard
              icon={FileSearch} label="All Applications" value={stats?.total}
              color="bg-indigo-500" glow="stat-glow-indigo"
              statusKey="" isActive={statusFilter === ''}
              onClick={() => { setStatusFilter(''); setCurrentPage(1); }}
            />
            <StatCard
              icon={Clock} label="Total Pending" value={stats?.pending}
              color="bg-amber-500" glow="stat-glow-amber"
              statusKey="Pending" isActive={statusFilter === 'Pending'}
              onClick={(key) => { setStatusFilter(statusFilter === key ? '' : key); setCurrentPage(1); }}
            />
            <StatCard
              icon={CheckCircle2} label="Approved" value={stats?.approved}
              color="bg-emerald-500" glow="stat-glow-emerald"
              statusKey="Approved" isActive={statusFilter === 'Approved'}
              onClick={(key) => { setStatusFilter(statusFilter === key ? '' : key); setCurrentPage(1); }}
            />
            <StatCard
              icon={CornerDownLeft} label="Returned" value={stats?.returned}
              color="bg-rose-500" glow="stat-glow-rose"
              statusKey="Returned" isActive={statusFilter === 'Returned'}
              onClick={(key) => { setStatusFilter(statusFilter === key ? '' : key); setCurrentPage(1); }}
            />
          </div>

          {/* Active filter count indicator */}
          <div className="flex justify-end items-center mb-4">
            <p className="text-[11px] font-black text-text-muted uppercase tracking-widest transition-colors">
              Showing <span className="text-navy">{filtered.length}</span> {statusFilter ? `${statusFilter} ` : ''}Applications
            </p>
          </div>

          {/* Table Card */}
          <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden transition-colors duration-300">
            {/* Filters Row */}
            <div className="flex items-center justify-between p-5 border-b border-border-color flex-wrap gap-4 transition-colors duration-300">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-black text-text-muted uppercase tracking-widest transition-colors">
                  Filter By
                </span>

                <select
                  value={districtFilter}
                  onChange={e => { setDistrict(e.target.value); setCurrentPage(1); }}
                  className="bg-table-header-bg border border-border-color rounded-lg px-3 py-1.5 text-[13px] font-bold text-text-main outline-none focus:ring-2 focus:ring-navy/5 transition-all"
                >
                  <option value="All Districts">All Districts</option>
                  {districts.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                </select>

                <select
                  value={typeFilter}
                  onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-table-header-bg border border-border-color rounded-lg px-3 py-1.5 text-[13px] font-bold text-text-main outline-none focus:ring-2 focus:ring-navy/5 transition-all"
                >
                  {PERMIT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>

                <button
                  onClick={() => {
                    setSearch('');
                    setDistrict('All Districts');
                    setTypeFilter('All Types');
                    setStatusFilter('');
                    setCurrentPage(1);
                  }}
                  title="Reset All Filters"
                  className="p-2 rounded-lg border border-border-color bg-table-header-bg text-text-muted hover:text-navy transition-all"
                >
                  <Filter size={14} />
                </button>
              </div>

              <div className="flex items-center gap-4 transition-colors">
                <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider hidden sm:inline transition-colors">
                  Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} results
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchData(true)}
                    className="p-2 text-text-muted hover:text-navy transition-all"
                  >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-border-color bg-card-bg text-text-muted hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-border-color bg-card-bg text-text-muted hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-table-header-bg/50 border-b border-border-color transition-colors">
                    {ALL_COLUMNS.filter(col => visibleColumns.includes(col.id)).map(col => (
                      <th key={col.id} className={`px-6 py-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest transition-colors ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.length} className="px-6 py-16 text-center text-text-muted text-sm font-bold italic">
                        No applications found.
                      </td>
                    </tr>
                  ) : paginated.map((app, idx) => (
                    <tr
                      key={app._id}
                      className={`border-b border-border-color transition-colors hover:bg-table-header-bg/30 ${idx % 2 === 0 ? 'bg-card-bg' : 'bg-table-header-bg/10'}`}
                    >
                      {visibleColumns.includes('applicationId') && (
                        <td className={`px-6 text-[13px] font-black text-navy transition-colors ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                          #{app.applicationId}
                        </td>
                      )}
                      {visibleColumns.includes('applicantName') && (
                        <td className={`px-6 text-[13px] font-bold text-text-main transition-colors ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-navy/5 border border-navy/10 flex items-center justify-center text-[11px] font-black text-navy uppercase transition-colors">
                              {(app.user?.fullName || app.formData?.fullName || 'A')[0]}
                            </div>
                            {app.user?.fullName || app.formData?.fullName || '—'}
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes('district') && (
                        <td className={`px-6 text-[13px] font-bold text-text-muted transition-colors ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                          {app.district}
                        </td>
                      )}
                      {visibleColumns.includes('submissionDate') && (
                        <td className={`px-6 text-[13px] font-bold text-text-muted whitespace-nowrap transition-colors ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                          {new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      )}
                      {visibleColumns.includes('approvalDate') && (
                        <td className={`px-6 text-[13px] font-bold text-text-muted whitespace-nowrap transition-colors ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                          {app.approvalDate ? new Date(app.approvalDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      )}
                      {visibleColumns.includes('expiryDate') && (
                        <td className={`px-6 text-[13px] font-black text-rose-500 whitespace-nowrap transition-colors ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                          {app.expiryDate ? new Date(app.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      )}
                      {visibleColumns.includes('permitType') && (
                        <td className={`px-6 ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                          <PermitTypeBadge type={app.formData?.buildingCategory} />
                        </td>
                      )}
                      {visibleColumns.includes('status') && (
                        <td className={`px-6 ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                          <StatusBadge status={app.status} />
                        </td>
                      )}
                      {visibleColumns.includes('actions') && (
                        <td className={`px-6 text-right ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActionMenu(prev => prev?.id === app._id ? null : { id: app._id, top: rect.bottom + 4, left: rect.right - 140 });
                            }}
                            className="p-2 rounded-lg text-text-muted hover:text-navy hover:bg-table-header-bg transition-all"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between p-5 border-t border-border-color transition-colors duration-300">
              <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider transition-colors">
                {lastRefreshed ? `Data synced ${timeSince()}` : ''}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl border border-border-color bg-card-bg text-text-muted text-[13px] font-bold hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(pg => (
                    <button
                      key={pg}
                      onClick={() => setCurrentPage(pg)}
                      className={`w-9 h-9 rounded-xl text-[13px] font-black transition-all ${currentPage === pg ? 'bg-navy text-white shadow-lg shadow-navy/20' : 'text-text-muted hover:bg-table-header-bg'}`}
                    >
                      {pg}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-xl border border-border-color bg-card-bg text-text-muted text-[13px] font-bold hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Menu */}
      {actionMenu && (
        <div
          onClick={e => e.stopPropagation()}
          className="fixed z-[9999] bg-card-bg rounded-2xl shadow-2xl border border-border-color min-w-[220px] overflow-hidden p-2 animate-in fade-in zoom-in-95 duration-200"
          style={{ top: actionMenu.top, left: actionMenu.left }}
        >
          {[
            {
              icon: Eye, label: 'View Application Details', color: 'text-navy',
              onClick: () => { navigate(`/staff/review/${actionMenu.id}`, { state: { from: '/admin/all-permits' } }); }
            },
            {
              icon: Clock, label: 'Set to Pending Review', color: 'text-amber-500',
              disabled: applications.find(a => a._id === actionMenu.id)?.status === 'Pending',
              onClick: () => { setSelectedApp(applications.find(a => a._id === actionMenu.id)); setConfirmConfig({ status: 'Pending', title: 'Set to Pending' }); setShowConfirmModal(true); }
            },
            {
              icon: CheckCircle2, label: 'Mark as Approved', color: 'text-emerald-500',
              disabled: applications.find(a => a._id === actionMenu.id)?.status === 'Approved',
              onClick: () => { setSelectedApp(applications.find(a => a._id === actionMenu.id)); setConfirmConfig({ status: 'Approved', title: 'Approve Application' }); setShowConfirmModal(true); }
            },
            {
              icon: Trash2, label: 'Flag for Return', color: 'text-rose-500',
              disabled: applications.find(a => a._id === actionMenu.id)?.status === 'Returned',
              onClick: () => { setSelectedApp(applications.find(a => a._id === actionMenu.id)); setShowReturnModal(true); }
            },
          ].map(({ icon: Ic, label, color, onClick, disabled }) => (
            <button key={label}
              disabled={disabled}
              onClick={() => { if (!disabled) { onClick(); setActionMenu(null); } }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold rounded-xl transition-all ${disabled ? 'opacity-30 grayscale cursor-not-allowed text-text-muted' : `${color} hover:bg-table-header-bg`}`}
            >
              <Ic size={16} /> {label}
            </button>
          ))}
        </div>
      )}



      {/* Confirmation Modal (Pending/Approved) */}
      {showConfirmModal && selectedApp && (
        <Modal title={confirmConfig.title} onClose={() => setShowConfirmModal(false)}>
          <div className="text-center py-4">
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${confirmConfig.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
              {confirmConfig.status === 'Approved' ? <CheckCircle2 size={32} /> : <Clock size={32} />}
            </div>
            <h3 className="text-lg font-black text-navy mb-2">Are you sure?</h3>
            <p className="text-sm text-slate-500 mb-8 px-4">
              You are about to change the status of application <strong>{selectedApp.applicationId}</strong> to <strong>{confirmConfig.status}</strong>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(selectedApp._id, 'review', { status: confirmConfig.status })}
                disabled={processing}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2 ${confirmConfig.status === 'Approved' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-amber-500 shadow-amber-200'} shadow-lg`}
              >
                {processing && <Loader2 size={16} className="animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedApp && (
        <Modal title="Flag for Return" onClose={() => setShowReturnModal(false)}>
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
              <p className="text-xs text-rose-700 font-medium">
                This will return the application to the applicant for editing. Please specify exactly what needs to be corrected.
              </p>
            </div>
            <label className="block text-xs font-black text-navy uppercase tracking-widest mb-1">Reason for Return</label>
            <textarea
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
              placeholder="E.g. Ownership document is not clear, please re-upload..."
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowReturnModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(selectedApp._id, 'review', { status: 'Returned', remarks: returnReason })}
                disabled={processing || !returnReason.trim()}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
              >
                {processing && <Loader2 size={16} className="animate-spin" />}
                Send to Applicant
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfigDrawer
        isOpen={showConfigDrawer}
        onClose={() => setShowConfigDrawer(false)}
        columns={ALL_COLUMNS}
        visibleColumns={visibleColumns}
        setVisibleColumns={setVisibleColumns}
        rowDensity={rowDensity}
        setRowDensity={setRowDensity}
        onApply={handleApplyView}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div
    className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-in fade-in duration-300"
    onClick={onClose}
  >
    <div
      className="bg-card-bg rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-border-color"
      onClick={e => e.stopPropagation()}
    >
      <div className="px-8 py-6 border-b border-border-color flex items-center justify-between bg-card-bg transition-colors duration-300">
        <h2 className="text-xl font-black text-navy tracking-tight transition-colors">{title}</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-table-header-bg rounded-full text-text-muted transition-colors"
        >
          <XCircle size={24} />
        </button>
      </div>
      <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar bg-card-bg transition-colors duration-300">
        {children}
      </div>
    </div>
  </div>
);

export default AllApplications;
