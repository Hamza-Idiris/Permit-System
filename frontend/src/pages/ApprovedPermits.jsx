import React, { useState, useEffect } from 'react';
import {
    Download,
    CheckCircle,
    ArrowLeft,
    Eye,
    Settings2,
    MapPin,
    Calendar,
    Building2,
} from 'lucide-react';
import ConfigDrawer from '../components/ConfigDrawer';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';
import TopHeader from '../components/TopHeader';
import { useTheme } from '../context/ThemeContext';

const ALL_COLUMNS = [
    { id: 'applicationId', label: 'Application ID', mandatory: true },
    { id: 'applicant', label: 'Applicant', mandatory: true },
    { id: 'category', label: 'Category' },
    { id: 'district', label: 'District' },
    { id: 'approvalDate', label: 'Approval Date' },
    { id: 'expiryDate', label: 'Expiry Date' },
    { id: 'landArea', label: 'Land Area' },
    { id: 'floors', label: 'Floors' },
    { id: 'actions', label: 'Actions', mandatory: true }
];

const ApprovedPermits = () => {
    useAuth();
    useTheme();
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showConfigDrawer, setShowConfigDrawer] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState(ALL_COLUMNS.map(c => c.id));
    const [rowDensity, setRowDensity] = useState('comfortable');

    useEffect(() => {
        const fetchApproved = async () => {
            try {
                const { data } = await axios.get('http://localhost:5000/api/permits/all', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setApplications(data.data.filter(app => app.status === 'Approved'));
                setLoading(false);
            } catch (err) {
                console.error('Fetch Error:', err);
                setLoading(false);
            }
        };
        fetchApproved();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getFloorsDisplay = (app) => {
        const category = app.formData?.buildingCategory || '';
        if (/dabaq/i.test(category) && app.formData?.floors != null && app.formData.floors !== '') {
            return app.formData.floors;
        }
        return '—';
    };

    const handleExportCSV = () => {
        const headers = ['Application ID', 'Applicant', 'Category', 'District', 'Land Area', 'Floors', 'Approval Date', 'Expiry Date'];
        const rows = filtered.map(app => [
            app.applicationId,
            app.formData?.fullName || app.user?.fullName,
            app.formData?.buildingCategory,
            app.district,
            app.formData?.landArea,
            getFloorsDisplay(app),
            formatDate(app.approvalDate || app.updatedAt),
            formatDate(app.expiryDate)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `approved_permits_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filtered = applications.filter(app => {
        const term = searchTerm.toLowerCase();
        return (
            app.applicationId.toLowerCase().includes(term) ||
            (app.formData?.fullName || '').toLowerCase().includes(term) ||
            (app.user?.fullName || '').toLowerCase().includes(term) ||
            (app.district || '').toLowerCase().includes(term)
        );
    });

    const cellPad = rowDensity === 'compact' ? 'py-3' : 'py-5';

    if (loading) return <LoadingScreen />;

    return (
        <div className="flex min-h-screen bg-bg-soft font-sans transition-colors duration-300">
            <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <TopHeader
                    breadcrumbs={['Staff', 'Approved Permits']}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    placeholder="Search approved permits..."
                />

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-7">
                        <div className="flex items-start gap-4">
                            <Link
                                to="/staff/dashboard"
                                className="w-10 h-10 rounded-xl bg-card-bg border border-border-color flex items-center justify-center text-text-muted hover:text-navy transition-all shrink-0"
                            >
                                <ArrowLeft size={20} />
                            </Link>
                            <div>
                                <h1 className="text-3xl font-black text-navy tracking-tight mb-1">
                                    Approved Permits
                                </h1>
                                <p className="text-sm text-text-muted font-bold">
                                    Archive of finalized and approved building applications.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => setShowConfigDrawer(true)}
                                className="flex items-center gap-2 bg-card-bg border border-border-color rounded-xl px-5 py-2.5 text-[13px] font-bold text-text-muted hover:text-navy transition-all"
                            >
                                <Settings2 size={15} /> Configure View
                            </button>
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 bg-navy text-white rounded-xl px-5 py-2.5 text-[13px] font-bold hover:brightness-110 transition-all shadow-lg shadow-navy/20"
                            >
                                <Download size={15} /> Export CSV
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
                        <div className="bg-card-bg border border-border-color rounded-2xl p-5 flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Total Approved</p>
                                <p className="text-2xl font-black text-navy tracking-tight">{applications.length}</p>
                            </div>
                        </div>
                        <div className="bg-card-bg border border-border-color rounded-2xl p-5 flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <Building2 size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Showing</p>
                                <p className="text-2xl font-black text-navy tracking-tight">{filtered.length}</p>
                            </div>
                        </div>
                        <div className="bg-card-bg border border-border-color rounded-2xl p-5 flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Archive</p>
                                <p className="text-sm font-black text-navy mt-1">Approved only</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden transition-colors duration-300">
                        <div className="flex items-center justify-between p-5 border-b border-border-color">
                            <h3 className="text-xs font-black text-navy uppercase tracking-[0.2em]">
                                Approved Applications
                            </h3>
                            <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider">
                                {filtered.length} Results
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-table-header-bg/50 border-b border-border-color">
                                        {ALL_COLUMNS.filter(col => visibleColumns.includes(col.id)).map(col => (
                                            <th
                                                key={col.id}
                                                className={`px-6 text-left text-[10px] font-black text-text-muted uppercase tracking-widest ${cellPad} ${col.id === 'actions' ? 'text-right' : ''}`}
                                            >
                                                {col.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={visibleColumns.length} className="px-6 py-16 text-center text-text-muted text-sm font-bold">
                                                No approved permits found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((app, idx) => (
                                            <tr
                                                key={app._id}
                                                className={`border-b border-border-color transition-colors hover:bg-table-header-bg/30 ${idx % 2 === 0 ? 'bg-card-bg' : 'bg-table-header-bg/10'}`}
                                            >
                                                {visibleColumns.includes('applicationId') && (
                                                    <td className={`px-6 text-[13px] font-black text-navy ${cellPad}`}>
                                                        #{app.applicationId}
                                                    </td>
                                                )}
                                                {visibleColumns.includes('applicant') && (
                                                    <td className={`px-6 ${cellPad}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-[12px] font-black text-emerald-600 uppercase shrink-0">
                                                                {(app.user?.fullName || app.formData?.fullName || 'A')[0]}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[13px] font-bold text-text-main truncate">
                                                                    {app.user?.fullName || app.formData?.fullName || 'Unknown'}
                                                                </p>
                                                                <p className="text-[11px] text-text-muted font-medium flex items-center gap-1 mt-0.5">
                                                                    <MapPin size={11} />
                                                                    {app.formData?.district || app.district || '—'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                )}
                                                {visibleColumns.includes('category') && (
                                                    <td className={`px-6 ${cellPad}`}>
                                                        <span className="inline-flex bg-table-header-bg text-text-muted px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase border border-border-color">
                                                            {app.formData?.buildingCategory || '—'}
                                                        </span>
                                                    </td>
                                                )}
                                                {visibleColumns.includes('district') && (
                                                    <td className={`px-6 text-[13px] font-bold text-text-muted ${cellPad}`}>
                                                        {app.district || '—'}
                                                    </td>
                                                )}
                                                {visibleColumns.includes('approvalDate') && (
                                                    <td className={`px-6 text-[13px] font-bold text-text-muted whitespace-nowrap ${cellPad}`}>
                                                        {formatDate(app.approvalDate || app.updatedAt)}
                                                    </td>
                                                )}
                                                {visibleColumns.includes('expiryDate') && (
                                                    <td className={`px-6 text-[13px] font-black text-rose-500 whitespace-nowrap ${cellPad}`}>
                                                        {app.expiryDate ? formatDate(app.expiryDate) : '—'}
                                                    </td>
                                                )}
                                                {visibleColumns.includes('landArea') && (
                                                    <td className={`px-6 text-[13px] font-bold text-text-muted ${cellPad}`}>
                                                        {app.formData?.landArea ? `${app.formData.landArea} m²` : '—'}
                                                    </td>
                                                )}
                                                {visibleColumns.includes('floors') && (
                                                    <td className={`px-6 text-[13px] font-bold text-text-muted ${cellPad}`}>
                                                        {getFloorsDisplay(app)}
                                                    </td>
                                                )}
                                                {visibleColumns.includes('actions') && (
                                                    <td className={`px-6 text-right ${cellPad}`}>
                                                        <button
                                                            onClick={() => navigate(`/staff/review/${app._id}`, { state: { from: '/staff/approved' } })}
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black text-text-muted hover:text-navy hover:bg-table-header-bg border border-transparent hover:border-border-color transition-all"
                                                            title="View Details"
                                                        >
                                                            <Eye size={15} /> View
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            <ConfigDrawer
                isOpen={showConfigDrawer}
                onClose={() => setShowConfigDrawer(false)}
                columns={ALL_COLUMNS}
                visibleColumns={visibleColumns}
                setVisibleColumns={setVisibleColumns}
                rowDensity={rowDensity}
                setRowDensity={setRowDensity}
                onApply={() => setShowConfigDrawer(false)}
            />
        </div>
    );
};

export default ApprovedPermits;
