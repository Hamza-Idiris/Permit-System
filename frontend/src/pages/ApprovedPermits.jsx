import React, { useState, useEffect } from 'react';
import {
    Search,
    Download,
    CheckCircle,
    ArrowLeft,
    Eye,
    Settings2
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
    const { user } = useAuth();
    const { darkMode } = useTheme();
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
                // Filter only approved ones
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
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const handleExportCSV = () => {
        const headers = ['Application ID', 'Applicant', 'Category', 'District', 'Land Area', 'Floors', 'Approval Date', 'Expiry Date'];
        const rows = filtered.map(app => [
            app.applicationId,
            app.formData?.fullName || app.user?.fullName,
            app.formData?.buildingCategory,
            app.district,
            app.formData?.landArea,
            app.formData?.floors,
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
            app.district.toLowerCase().includes(term)
        );
    });

    if (loading) return <LoadingScreen />;

    return (
        <div className="flex h-screen bg-bg-soft overflow-hidden font-sans transition-colors duration-300">
            <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

            <main className="flex-1 flex flex-col overflow-hidden relative w-full">
                <TopHeader
                    breadcrumbs={['Staff', 'Approved Permits']}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    placeholder="Search approved permits..."
                />

                <div className="flex-1 overflow-y-auto p-10">
                    <div className="max-w-[1400px] mx-auto space-y-10">
                        <div className="flex items-center gap-4">
                            <Link to="/staff/dashboard" className="w-10 h-10 rounded-xl bg-card-bg border border-border-color flex items-center justify-center text-text-muted hover:text-navy transition-all">
                                <ArrowLeft size={20} />
                            </Link>
                            <div>
                                <h2 className="text-[32px] font-black text-navy tracking-tight transition-colors transition-colors">Approved Permits</h2>
                                <p className="text-[15px] text-text-muted mt-1 font-black transition-colors">Archive of all finalized and approved building applications.</p>
                            </div>
                            <button
                                onClick={handleExportCSV}
                                className="ml-auto flex items-center gap-2 bg-card-bg border border-border-color px-5 py-3 rounded-xl text-[14px] font-black text-navy hover:bg-table-header-bg transition-all shadow-sm"
                            >
                                <Download size={18} /> Export CSV
                            </button>
                            <button
                                onClick={() => setShowConfigDrawer(true)}
                                className="flex items-center gap-2 bg-navy text-white border border-navy px-5 py-3 rounded-xl text-[14px] font-bold hover:bg-navy/90 transition-all shadow-lg"
                            >
                                <Settings2 size={18} /> Configure Views
                            </button>
                        </div>

                        <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden transition-colors duration-300">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] border-b border-border-color transition-colors bg-table-header-bg/30">
                                        {visibleColumns.includes('applicationId') && <th className="px-6 py-4">Application ID</th>}
                                        {visibleColumns.includes('applicant') && <th className="px-6 py-4">Applicant</th>}
                                        {visibleColumns.includes('category') && <th className="px-6 py-4">Category</th>}
                                        {visibleColumns.includes('district') && <th className="px-6 py-4">District</th>}
                                        {visibleColumns.includes('approvalDate') && <th className="px-6 py-4">Approval Date</th>}
                                        {visibleColumns.includes('expiryDate') && <th className="px-6 py-4">Expiry Date</th>}
                                        {visibleColumns.includes('landArea') && <th className="px-6 py-4">Land Area</th>}
                                        {visibleColumns.includes('floors') && <th className="px-6 py-4">Floors</th>}
                                        {visibleColumns.includes('actions') && <th className="px-6 py-4 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-color transition-colors">
                                    {loading ? (
                                        <tr><td colSpan={visibleColumns.length} className="text-center py-20 text-text-muted font-black italic">Gathering records...</td></tr>
                                    ) : filtered.length === 0 ? (
                                        <tr><td colSpan={visibleColumns.length} className="text-center py-20 text-text-muted font-black">No approved permits found.</td></tr>
                                    ) : (
                                        filtered.map(app => (
                                            <tr key={app._id} className="hover:bg-table-header-bg/50 transition-colors">
                                                {visibleColumns.includes('applicationId') && <td className="px-6 py-4 font-black text-navy tracking-tight transition-colors">#{app.applicationId}</td>}
                                                {visibleColumns.includes('applicant') && (
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4 text-left">
                                                            <div className="w-10 h-10 rounded-2xl bg-navy/5 flex items-center justify-center text-[13px] font-black text-navy border border-border-color shadow-sm shrink-0 transition-colors">
                                                                {(app.user?.fullName || app.formData?.fullName || 'A')[0].toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-navy text-[15px] transition-colors">{app.user?.fullName || app.formData?.fullName || 'Unknown'}</span>
                                                                <span className="text-[11px] text-text-muted font-black uppercase tracking-wider transition-colors">{app.formData?.district || app.district}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                )}
                                                {visibleColumns.includes('category') && (
                                                    <td className="px-6 py-4">
                                                        <span className="text-[11px] font-black text-white bg-navy px-3 py-1.5 rounded-lg uppercase tracking-wider">
                                                            {app.formData.buildingCategory}
                                                        </span>
                                                    </td>
                                                )}
                                                {visibleColumns.includes('district') && <td className="px-6 py-4 text-text-muted font-black text-[13px]">{app.district}</td>}
                                                {visibleColumns.includes('approvalDate') && <td className="px-6 py-4 text-text-muted font-black text-[13px]">{formatDate(app.approvalDate || app.updatedAt)}</td>}
                                                {visibleColumns.includes('expiryDate') && (
                                                    <td className="px-6 py-4 text-rose-500 font-black text-[13px]">
                                                        {app.expiryDate ? formatDate(app.expiryDate) : 'N/A'}
                                                    </td>
                                                )}
                                                {visibleColumns.includes('landArea') && <td className="px-6 py-4 text-text-muted font-black text-[13px]">{app.formData?.landArea || '—'}</td>}
                                                {visibleColumns.includes('floors') && <td className="px-6 py-4 text-text-muted font-black text-[13px]">{app.formData?.floors || '—'}</td>}
                                                {visibleColumns.includes('actions') && (
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => navigate(`/staff/review/${app._id}`)}
                                                            className="w-9 h-9 rounded-lg bg-table-header-bg text-text-muted hover:bg-navy hover:text-white flex items-center justify-center transition-all ml-auto border border-border-color"
                                                            title="View Details"
                                                        >
                                                            <Eye size={18} />
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
