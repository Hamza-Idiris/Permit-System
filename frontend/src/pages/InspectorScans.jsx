import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import LoadingScreen from '../components/LoadingScreen';
import {
  ScanLine, CheckCircle2, XCircle, RotateCcw, Search
} from 'lucide-react';

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7', label: '7 Days' },
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

const InspectorScans = () => {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'superadmin';

  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const [range, setRange] = useState('30');
  const [summary, setSummary] = useState({ total: 0, success: 0, failed: 0 });
  const [inspectorStats, setInspectorStats] = useState([]);
  const [logs, setLogs] = useState([]);
  const [resettingId, setResettingId] = useState(null);
  const [banner, setBanner] = useState(null);

  const breadcrumbs = isAdmin
    ? ['Admin', 'Inspector Scans']
    : ['Staff', 'Inspector Scans'];

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/scans/stats', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
        params: { range },
      });
      if (res.data.success) {
        setSummary(res.data.summary || { total: 0, success: 0, failed: 0 });
        setInspectorStats(res.data.inspectorStats || []);
        setLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch scan stats', err);
      setBanner({ type: 'error', text: err.response?.data?.message || 'Failed to load scan stats.' });
    } finally {
      setLoading(false);
    }
  }, [token, range]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleReset = async (inspectorId) => {
    if (!window.confirm('Reset scan totals to zero?')) return;
    setResettingId(inspectorId);
    setBanner(null);
    try {
      const res = await axios.delete(
        `http://localhost:5000/api/scans/inspector/${inspectorId}`,
        { headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` } }
      );
      if (res.data.success) {
        setBanner({ type: 'success', text: res.data.message || 'Scan totals reset.' });
        await fetchStats();
      }
    } catch (err) {
      setBanner({
        type: 'error',
        text: err.response?.data?.message || 'Failed to reset scan totals.',
      });
    } finally {
      setResettingId(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const filteredLogs = headerSearch.trim()
    ? logs.filter((l) => {
        const q = headerSearch.trim().toLowerCase();
        return (
          (l.permitId || '').toLowerCase().includes(q) ||
          (l.applicantName || '').toLowerCase().includes(q) ||
          (l.district || '').toLowerCase().includes(q) ||
          (l.inspector?.fullName || '').toLowerCase().includes(q)
        );
      })
    : logs;

  if (loading && !inspectorStats.length && !logs.length) return <LoadingScreen />;

  return (
    <div className="flex min-h-screen bg-bg-soft font-sans transition-colors duration-300">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader
          breadcrumbs={breadcrumbs}
          searchTerm={headerSearch}
          setSearchTerm={setHeaderSearch}
          placeholder="Search permit, applicant, inspector..."
        />

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-black text-navy tracking-tight mb-1">Inspector Scans</h1>
              <p className="text-sm text-text-muted font-bold">
                {isAdmin
                  ? 'System-wide QR scan activity and inspector performance.'
                  : `Scan activity for your district${user?.district ? ` (${user.district})` : ''}.`}
              </p>
            </div>

            {banner && (
              <div
                className={`flex items-start gap-3 rounded-2xl border px-5 py-4 text-sm font-bold ${
                  banner.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                }`}
              >
                {banner.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span>{banner.text}</span>
              </div>
            )}

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Scans', value: summary.total ?? 0, icon: ScanLine },
                { label: 'Successful', value: summary.success ?? 0, icon: CheckCircle2 },
                { label: 'Failed', value: summary.failed ?? 0, icon: XCircle },
              ].map((card) => (
                <div key={card.label} className="bg-card-bg rounded-2xl p-5 border border-border-color shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-table-header-bg">
                      <card.icon size={16} className="text-navy" />
                    </div>
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{card.label}</span>
                  </div>
                  <h3 className="text-2xl font-black text-navy tracking-tighter">{card.value}</h3>
                </div>
              ))}
            </div>

            {loading && (
              <p className="text-sm font-bold text-text-muted">Refreshing…</p>
            )}

            <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border-color flex justify-between items-center">
                <h3 className="text-lg font-black text-navy">Inspector Stats</h3>
                <span className="text-[11px] font-black text-text-muted uppercase tracking-widest">
                  {inspectorStats.length} inspectors
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[720px]">
                  <thead>
                    <tr className="bg-table-header-bg/50">
                      {['Name', 'Email', 'District', 'Total', 'Success', 'Failed', ...(isAdmin ? ['Actions'] : [])].map((h) => (
                        <th key={h} className="py-4 px-5 text-[10px] font-black text-text-muted uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color">
                    {inspectorStats.map((row) => (
                      <tr key={row.inspectorId} className="hover:bg-table-header-bg/30">
                        <td className="py-4 px-5 text-sm font-bold text-navy">{row.fullName || '—'}</td>
                        <td className="py-4 px-5 text-sm text-text-muted font-medium">{row.email || '—'}</td>
                        <td className="py-4 px-5 text-sm text-text-muted font-medium">{row.district || '—'}</td>
                        <td className="py-4 px-5 text-sm font-bold text-navy">{row.total}</td>
                        <td className="py-4 px-5 text-sm font-medium text-emerald-600">{row.success}</td>
                        <td className="py-4 px-5 text-sm font-medium text-rose-500">{row.failed}</td>
                        {isAdmin && (
                          <td className="py-4 px-5">
                            <button
                              type="button"
                              onClick={() => handleReset(row.inspectorId)}
                              disabled={resettingId === row.inspectorId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-50 transition-all"
                            >
                              <RotateCcw size={12} />
                              {resettingId === row.inspectorId ? 'Resetting…' : 'Reset'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {!inspectorStats.length && (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-text-muted text-sm font-medium">
                          No inspector scan data for this range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border-color flex justify-between items-center">
                <h3 className="text-lg font-black text-navy">Recent Logs</h3>
                <span className="text-[11px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <Search size={12} /> {filteredLogs.length} entries
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead>
                    <tr className="bg-table-header-bg/50">
                      {['Permit ID', 'Applicant', 'District', 'Result', 'Reason', 'Inspector', 'Date'].map((h) => (
                        <th key={h} className="py-4 px-5 text-[10px] font-black text-text-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color">
                    {filteredLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-table-header-bg/30">
                        <td className="py-4 px-5 text-sm font-bold text-navy whitespace-nowrap">
                          {log.permitId || log.applicationId || '—'}
                        </td>
                        <td className="py-4 px-5 text-sm font-medium text-navy">{log.applicantName || '—'}</td>
                        <td className="py-4 px-5 text-sm text-text-muted font-medium">{log.district || '—'}</td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                            log.result === 'success'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {log.result || '—'}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-sm text-text-muted font-medium max-w-[220px] truncate" title={log.reason}>
                          {log.reason || '—'}
                        </td>
                        <td className="py-4 px-5 text-sm text-text-muted font-medium">
                          {log.inspector?.fullName || '—'}
                        </td>
                        <td className="py-4 px-5 text-sm text-text-muted font-medium whitespace-nowrap">
                          {formatDate(log.scannedAt || log.createdAt)}
                        </td>
                      </tr>
                    ))}
                    {!filteredLogs.length && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-text-muted text-sm font-medium">
                          No scan logs for this range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InspectorScans;
