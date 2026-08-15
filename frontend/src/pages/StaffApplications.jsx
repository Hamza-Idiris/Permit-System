import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import axios from 'axios';
import {
    Clock, CheckCircle2, CornerDownLeft, FileSearch, Eye, Download,
    Filter, ChevronRight, Settings2, Plus
} from 'lucide-react';
import ConfigDrawer from '../components/ConfigDrawer';
import TopHeader from '../components/TopHeader';
import LoadingScreen from '../components/LoadingScreen';
import { useTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';

const StatusBadge = ({ status }) => {
    const statusClasses = {
        Pending: 'bg-amber-500/10 text-amber-500',
        'In Review': 'bg-blue-500/10 text-blue-500',
        Approved: 'bg-emerald-500/10 text-emerald-500',
        Returned: 'bg-rose-500/10 text-rose-500',
    };
    const cls = statusClasses[status] || 'bg-table-header-bg text-text-muted';
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase ${cls} border border-border-color/10`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            {status}
        </span>
    );
};

const PermitTypeBadge = ({ type }) => (
    <span className="bg-table-header-bg text-text-muted px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase border border-border-color">
        {type || '—'}
    </span>
);

const StatCard = ({ icon: Icon, label, value, color, statusKey, isActive, onClick }) => (
    <button
        type="button"
        onClick={() => onClick(statusKey)}
        className={[
            'relative text-left w-full bg-card-bg rounded-2xl p-5 border transition-all duration-200 flex flex-col',
            isActive
                ? 'border-blue-400/50 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30'
                : 'border-border-color shadow-sm hover:shadow-md hover:border-blue-200/60',
        ].join(' ')}
    >
        <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest leading-tight">
                {statLabelMap[statusKey] || label}
            </p>
            <div
                className={[
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all',
                    isActive
                        ? `${color} text-white shadow-md shadow-blue-500/25`
                        : 'bg-table-header-bg text-text-muted',
                ].join(' ')}
            >
                <Icon size={16} />
            </div>
        </div>
        <h3 className="text-[26px] font-black text-navy tracking-tight leading-none mb-1.5">
            {value ?? '—'}
        </h3>
        <p className="text-[11px] font-medium text-text-muted capitalize">
            {statusKey === 'all' ? 'All applications' : `${statusKey} applications`}
        </p>
        {isActive && (
            <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.55)]" />
        )}
    </button>
);

const statLabelMap = {
    all: 'All Applications',
    pending: 'Total Pending',
    approved: 'Approved',
    returned: 'Returned'
};

const ALL_COLUMNS = [
    { id: 'applicationId', label: 'Application ID', mandatory: true },
    { id: 'applicantName', label: 'Applicant Name' },
    { id: 'applicantPhone', label: 'Phone Number' },
    { id: 'permitType', label: 'Permit Type' },
    { id: 'submissionDate', label: 'Submission Date' },
    { id: 'expiryDate', label: 'Expiry Date' },
    { id: 'status', label: 'Status' },
    { id: 'actions', label: 'Actions', mandatory: true }
];

const StaffApplications = () => {
    const { wsData } = useWebSocket();
    useTheme();
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showConfigDrawer, setShowConfigDrawer] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState(ALL_COLUMNS.map(c => c.id));
    const [rowDensity, setRowDensity] = useState('comfortable');

    useEffect(() => {
        const savedCols = localStorage.getItem('staff_apps_page_columns');
        const savedDensity = localStorage.getItem('staff_apps_page_density');
        if (savedCols) {
            try {
                const parsed = JSON.parse(savedCols);
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
        localStorage.setItem('staff_apps_page_columns', JSON.stringify(visibleColumns));
        localStorage.setItem('staff_apps_page_density', rowDensity);
        setShowConfigDrawer(false);
    };

    const fetchData = useCallback(async () => {
        try {
            const appRes = await axios.get('http://localhost:5000/api/permits/all', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setApplications(appRes.data.data);
            setLoading(false);
        } catch (err) {
            console.error('Fetch Data Error:', err);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (wsData && (wsData.type === 'GLOBAL_PERMIT_APPLICATION_UPDATED' || wsData.type === 'PERMIT_APPLICATION_UPDATED')) {
            fetchData();
        }
    }, [wsData, fetchData]);

    if (loading) return <LoadingScreen />;

    const stats = {
        pending: applications.filter(app => app.status === 'Pending').length,
        all: applications.length,
        approved: applications.filter(app => app.status === 'Approved').length,
        returned: applications.filter(app => app.status === 'Returned').length
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const filteredApplications = applications.filter(app => {
        const name = (app.user?.fullName || app.formData?.fullName || '').toLowerCase();
        const id = (app.applicationId || '').toLowerCase();
        const matchSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || id.includes(searchTerm.toLowerCase());

        let matchStatus = true;
        if (activeFilter === 'pending') matchStatus = app.status === 'Pending';
        else if (activeFilter === 'approved') matchStatus = app.status === 'Approved';
        else if (activeFilter === 'returned') matchStatus = app.status === 'Returned';

        return matchSearch && matchStatus;
    });

    return (
        <div className="flex min-h-screen bg-bg-soft font-sans transition-colors duration-300">
            <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <TopHeader
                    breadcrumbs={['Staff', 'Applications']}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    placeholder="Search applications..."
                />

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="flex items-start justify-between mb-7">
                        <div>
                            <h1 className="text-3xl font-black text-navy tracking-tight mb-1">
                                Applications
                            </h1>
                            <p className="text-sm text-text-muted font-bold">
                                District permit applications — review, approve, or return.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate('/staff/new-application')}
                                className="flex items-center gap-2 bg-emerald-600 text-white rounded-xl px-5 py-2.5 text-[13px] font-bold hover:brightness-110 transition-all shadow-lg shadow-emerald-600/20"
                            >
                                <Plus size={15} /> New Application
                            </button>
                            <button
                                onClick={() => setShowConfigDrawer(true)}
                                className="flex items-center gap-2 bg-card-bg border border-border-color rounded-xl px-5 py-2.5 text-[13px] font-bold text-text-muted hover:text-navy transition-all"
                            >
                                <Settings2 size={15} /> Configure View
                            </button>
                            <button
                                className="flex items-center gap-2 bg-navy text-white rounded-xl px-5 py-2.5 text-[13px] font-bold hover:brightness-110 transition-all shadow-lg shadow-navy/20"
                            >
                                <Download size={15} /> Generate Report
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
                        <StatCard
                            icon={FileSearch} label="All Applications" value={stats.all}
                            color="bg-indigo-500"
                            statusKey="all" isActive={activeFilter === 'all'}
                            onClick={() => setActiveFilter('all')}
                        />
                        <StatCard
                            icon={Clock} label="Total Pending" value={stats.pending}
                            color="bg-amber-500"
                            statusKey="pending" isActive={activeFilter === 'pending'}
                            onClick={(key) => setActiveFilter(activeFilter === key ? 'all' : key)}
                        />
                        <StatCard
                            icon={CheckCircle2} label="Approved" value={stats.approved}
                            color="bg-emerald-500"
                            statusKey="approved" isActive={activeFilter === 'approved'}
                            onClick={(key) => setActiveFilter(activeFilter === key ? 'all' : key)}
                        />
                        <StatCard
                            icon={CornerDownLeft} label="Returned" value={stats.returned}
                            color="bg-rose-500"
                            statusKey="returned" isActive={activeFilter === 'returned'}
                            onClick={(key) => setActiveFilter(activeFilter === key ? 'all' : key)}
                        />
                    </div>

                    <div className="flex justify-end items-center mb-4">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                            Showing <span className="text-navy">{filteredApplications.length}</span> {activeFilter !== 'all' ? `${activeFilter} ` : ''}Applications
                        </p>
                    </div>

                    <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden transition-colors duration-300">
                        <div className="flex items-center justify-between p-5 border-b border-border-color">
                            <h3 className="text-xs font-black text-navy uppercase tracking-[0.2em]">
                                {activeFilter === 'all' ? 'All Applications' : activeFilter + ' Applications'}
                            </h3>
                            <div className="flex items-center gap-4">
                                <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider">
                                    {filteredApplications.length} Results
                                </span>
                                <button
                                    onClick={() => { setSearchTerm(''); setActiveFilter('all'); }}
                                    title="Reset Filters"
                                    className="p-2 rounded-lg border border-border-color text-text-muted hover:text-navy hover:bg-table-header-bg transition-all"
                                >
                                    <Filter size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-table-header-bg/50 border-b border-border-color">
                                        {ALL_COLUMNS.filter(col => visibleColumns.includes(col.id)).map(col => (
                                            <th key={col.id} className={`px-6 py-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                                                {col.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredApplications.length === 0 ? (
                                        <tr>
                                            <td colSpan={visibleColumns.length} className="px-6 py-16 text-center text-text-muted text-sm font-bold">
                                                No {activeFilter !== 'all' ? activeFilter : ''} applications found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredApplications.map((app, idx) => (
                                            <tr
                                                key={app._id}
                                                className={`border-b border-border-color transition-colors hover:bg-table-header-bg/30 ${idx % 2 === 0 ? 'bg-card-bg' : 'bg-table-header-bg/10'}`}
                                            >
                                                {visibleColumns.includes('applicationId') && (
                                                    <td className={`px-6 text-[13px] font-black text-navy ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                                                        #{app.applicationId}
                                                    </td>
                                                )}
                                                {visibleColumns.includes('applicantName') && (
                                                    <td className={`px-6 text-[13px] font-bold text-text-main ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-navy/5 border border-navy/10 flex items-center justify-center text-[11px] font-black text-navy uppercase">
                                                                {(app.user?.fullName || app.formData?.fullName || 'A')[0]}
                                                            </div>
                                                            {app.user?.fullName || app.formData?.fullName || 'Unknown'}
                                                        </div>
                                                    </td>
                                                )}
                                                {visibleColumns.includes('applicantPhone') && (
                                                    <td className={`px-6 text-[13px] font-bold text-text-muted ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                                                        {app.user?.phone || app.formData?.phone || '—'}
                                                    </td>
                                                )}
                                                {visibleColumns.includes('permitType') && (
                                                    <td className={`px-6 ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                                                        <PermitTypeBadge type={app.formData?.buildingCategory} />
                                                    </td>
                                                )}
                                                {visibleColumns.includes('submissionDate') && (
                                                    <td className={`px-6 text-[13px] font-bold text-text-muted whitespace-nowrap ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                                                        {formatDate(app.createdAt)}
                                                    </td>
                                                )}
                                                {visibleColumns.includes('expiryDate') && (
                                                    <td className={`px-6 text-[13px] font-black text-rose-500 whitespace-nowrap ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                                                        {app.expiryDate ? formatDate(app.expiryDate) : '—'}
                                                    </td>
                                                )}
                                                {visibleColumns.includes('status') && (
                                                    <td className={`px-6 ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                                                        {(app.status === 'Pending' || app.status === 'In Review') ? (
                                                            <Link
                                                                to={`/staff/review/${app._id}`}
                                                                state={{ from: '/staff/applications' }}
                                                                className="inline-flex items-center gap-2 bg-navy text-white px-4 py-1.5 rounded-lg text-[11px] font-black no-underline hover:brightness-110 active:scale-95 transition-all shadow-sm shadow-navy/20"
                                                            >
                                                                Perform Review <ChevronRight size={14} />
                                                            </Link>
                                                        ) : (
                                                            <StatusBadge status={app.status} />
                                                        )}
                                                    </td>
                                                )}
                                                {visibleColumns.includes('actions') && (
                                                    <td className={`px-6 text-right ${rowDensity === 'compact' ? 'py-3' : 'py-5'}`}>
                                                        <button
                                                            onClick={() => navigate(`/staff/review/${app._id}`, { state: { from: '/staff/applications' } })}
                                                            className="p-2 rounded-lg text-text-muted hover:text-navy hover:bg-table-header-bg transition-all"
                                                        >
                                                            <Eye size={16} />
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
                onApply={handleApplyView}
            />
        </div>
    );
};

export default StaffApplications;
