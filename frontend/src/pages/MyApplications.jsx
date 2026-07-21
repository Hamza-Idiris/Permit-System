import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import {
  ChevronLeft, ChevronRight, Plus, Menu, Search
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import TopHeader from '../components/TopHeader';

const MyApplications = () => {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const { darkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ applications: [], stats: {} });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All Status');

  const fetchApplications = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      const res = await axios.get('http://localhost:5000/api/permits/my-applications', config);
      if (res.data.success) {
        setData({ applications: res.data.data, stats: res.data.stats });
      }
    } catch (err) {
      console.error('Failed to fetch applications', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchApplications();
      const interval = setInterval(() => {
        fetchApplications(true);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Under Review':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Rejected':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'Pending':
      default:
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  };

  const filteredApplications = data.applications.filter(app => {
    const matchesSearch =
      (app?.applicationId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (app?.formData?.projectName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (app?.formData?.district?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesTab = activeTab === 'All Status' || app?.status === activeTab;

    return matchesSearch && matchesTab;
  });

  const statsCards = [
    { label: 'TOTAL SUBMITTED', value: data.stats.total || 0, color: 'text-navy', bg: 'bg-navy/5' },
    { label: 'APPROVED', value: data.stats.approved || 0, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'UNDER REVIEW', value: data.stats.underReview || 0, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'ACTION REQUIRED', value: data.stats.pending || 0, color: 'text-amber-500', bg: 'bg-amber-500/10' }
  ];

  return (
    <div className="flex h-screen bg-bg-soft overflow-hidden text-text-main transition-colors duration-300">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopHeader
          breadcrumbs={['Applicant', 'My Applications']}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search your applications..."
        />

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 w-full max-w-[1200px] mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-navy transition-colors">My Applications</h1>
              <p className="text-[13px] text-text-muted font-bold">Track and manage your submitted permit requests.</p>
            </div>
            <button onClick={() => navigate('/applicant/home')} className="bg-navy hover:brightness-110 text-white px-5 py-2.5 rounded-xl text-[13px] font-black flex items-center gap-2 transition-all shadow-lg shadow-navy/20 active:scale-95 w-full sm:w-auto justify-center">
              <Plus size={18} strokeWidth={2.5} /> New Permit Application
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsCards.map((card, idx) => (
              <div key={idx} className="bg-card-bg p-6 rounded-2xl border border-border-color shadow-sm transition-colors duration-300 group hover:shadow-md">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1 group-hover:text-navy transition-colors">{card.label}</p>
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-6 rounded-full ${card.color.replace('text-', 'bg-')} opacity-40`} />
                  <p className={`text-3xl font-black ${card.color} transition-colors`}>{loading ? '...' : card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Table Control Bar */}
          <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden transition-colors duration-300">
            <div className="p-4 lg:p-6 border-b border-border-color flex flex-col lg:flex-row justify-between items-center gap-4">
              <div className="relative w-full lg:max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-navy" size={18} />
                <input
                  type="text"
                  placeholder="Search by ID, Project Name or Address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-table-header-bg border border-border-color rounded-xl text-sm font-bold text-text-main focus:ring-2 focus:ring-navy/10 focus:border-navy outline-none transition-all placeholder:text-text-muted/50"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 custom-scrollbar">
                {['All Status', 'Approved', 'Under Review', 'Pending', 'Rejected'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab
                      ? 'bg-navy text-white shadow-lg'
                      : 'bg-table-header-bg text-text-muted hover:text-navy border border-border-color/50'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-table-header-bg/50">
                  <tr className="border-b border-border-color">
                    <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Application ID</th>
                    <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Project Details</th>
                    <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Submitted</th>
                    <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Expiry</th>
                    <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color transition-colors">
                  {loading ? (
                    <tr><td colSpan="6" className="px-6 py-12 text-center text-text-muted italic text-[13px] font-black">Loading applications...</td></tr>
                  ) : filteredApplications.length === 0 ? (
                    <tr><td colSpan="6" className="px-6 py-12 text-center text-text-muted italic text-[13px] font-black">No applications found.</td></tr>
                  ) : (
                    filteredApplications.map((app) => (
                      <tr key={app._id} className="hover:bg-table-header-bg/40 transition-colors group">
                        <td className="px-6 py-4 text-[13px] font-black text-navy tracking-tight group-hover:text-navy transition-colors">#{app?.applicationId || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <p className="text-[13px] font-black text-navy mb-0.5 group-hover:translate-x-1 transition-transform">{app?.formData?.projectName || 'Untitled Project'}</p>
                          <p className="text-[11px] text-text-muted font-black uppercase tracking-tight opacity-70">{(app?.formData?.district || 'Unknown')} • Plot {(app?.formData?.plotId || 'N/A')}</p>
                        </td>
                        <td className="px-6 py-4 text-[13px] font-black text-text-muted">{formatDate(app?.createdAt)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${getStatusStyles(app?.status)}`}>
                            {app?.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`text-[13px] font-black ${app?.expiryDate ? 'text-rose-500' : 'text-text-muted opacity-40'}`}>
                            {app?.expiryDate ? formatDate(app.expiryDate) : 'Not Issued'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-[11px] font-black text-navy uppercase tracking-widest px-4 py-2 bg-navy/5 rounded-lg hover:bg-navy hover:text-white transition-all shadow-sm active:scale-95">
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 lg:p-6 bg-table-header-bg/30 border-t border-border-color flex justify-between items-center text-[11px] font-black text-text-muted uppercase tracking-widest">
              <p>Showing <span className="text-navy">{filteredApplications.length}</span> Applications</p>
              <div className="flex gap-2">
                <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-border-color bg-card-bg text-text-muted hover:text-navy hover:bg-table-header-bg disabled:opacity-30 transition-all"><ChevronLeft size={16} /></button>
                <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-navy text-white shadow-lg shadow-navy/20">1</button>
                <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-border-color bg-card-bg text-text-muted hover:text-navy transition-all">2</button>
                <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-border-color bg-card-bg text-text-muted hover:text-navy transition-all"><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyApplications;
