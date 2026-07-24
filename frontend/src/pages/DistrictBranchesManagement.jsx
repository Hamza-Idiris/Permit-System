import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import LoadingScreen from '../components/LoadingScreen';
import { useTheme } from '../context/ThemeContext';
import {
    GitBranch, Plus, Edit3, Trash2, X, AlertTriangle,
    ChevronDown, MapPin, Phone, User, CheckCircle,
    XCircle, Building2, Search, Hash, FileText
} from 'lucide-react';

const BASE = 'http://localhost:5000/api';

const EMPTY_FORM = {
    district: '',
    name: '',
    code: '',
    address: '',
    phone: '',
    manager: '',
    isActive: true,
    notes: ''
};

const DistrictBranchesManagement = () => {
    const { token } = useContext(AuthContext);
    const { darkMode } = useTheme();
    const [branches, setBranches] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [availableStaff, setAvailableStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDistrict, setFilterDistrict] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const cfg = useCallback(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [branchRes, distRes, staffRes] = await Promise.all([
                axios.get(`${BASE}/district-branches`, cfg()),
                axios.get(`${BASE}/districts`, cfg()),
                axios.get(`${BASE}/users`, cfg())
            ]);
            if (branchRes.data.success) setBranches(branchRes.data.data);
            if (distRes.data.success) setDistricts(distRes.data.data);
            if (staffRes.data.success) {
                setAvailableStaff(staffRes.data.data.filter(u => u.role === 'staff'));
            }
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    }, [cfg]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => {
        setEditingBranch(null);
        setFormData(EMPTY_FORM);
        setIsModalOpen(true);
    };

    const openEdit = (b) => {
        setEditingBranch(b);
        setFormData({
            district: b.district?._id || '',
            name: b.name,
            code: b.code,
            address: b.address || '',
            phone: b.phone || '',
            manager: b.manager?._id || '',
            isActive: b.isActive,
            notes: b.notes || ''
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingBranch) {
                await axios.put(`${BASE}/district-branches/${editingBranch._id}`, formData, cfg());
            } else {
                await axios.post(`${BASE}/district-branches`, formData, cfg());
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Operation failed');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        try {
            await axios.delete(`${BASE}/district-branches/${deleteConfirmId}`, cfg());
            setDeleteConfirmId(null);
            fetchData();
        } catch (err) {
            alert('Delete failed');
            setDeleteConfirmId(null);
        }
    };

    const filtered = branches.filter(b => {
        const matchSearch =
            b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (b.district?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchDistrict = !filterDistrict || b.district?._id === filterDistrict;
        return matchSearch && matchDistrict;
    });

    if (loading) return <LoadingScreen />;

    return (
        <div className="flex min-h-screen bg-bg-soft font-inter transition-colors duration-300">
            <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <TopHeader
                    breadcrumbs={['Oversight', 'Branch Settings']}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    placeholder="Search branches..."
                />

                <div className="flex-1 overflow-y-auto px-12 py-10 space-y-8 custom-scrollbar">
                    <div className="max-w-[1250px] mx-auto space-y-8">

                        {/* Page Header */}
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <h1 className="text-[34px] font-black text-navy tracking-tight transition-colors">
                                    District Branches Management
                                </h1>
                                <p className="text-text-muted font-bold text-[14px] leading-relaxed max-w-2xl transition-colors">
                                    Manage sub-offices and branch locations within each district.
                                </p>
                            </div>
                            <button
                                onClick={openCreate}
                                className="bg-navy hover:brightness-110 text-white font-black text-[13px] px-6 py-4 rounded-2xl flex items-center gap-2 shadow-lg transition-all transform active:scale-95"
                            >
                                <Plus size={18} /> Add New Branch
                            </button>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-5">
                            {[
                                { label: 'Total Branches', value: branches.length, icon: GitBranch, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                                { label: 'Active Branches', value: branches.filter(b => b.isActive).length, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                { label: 'Districts Covered', value: [...new Set(branches.map(b => b.district?._id))].filter(Boolean).length, icon: MapPin, color: 'text-violet-500', bg: 'bg-violet-500/10' },
                            ].map(({ label, value, icon: Icon, color, bg }) => (
                                <div key={label} className="bg-card-bg rounded-[24px] border border-border-color shadow-sm p-6 flex items-center gap-5 transition-colors duration-300">
                                    <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center`}>
                                        <Icon size={22} className={color} />
                                    </div>
                                    <div>
                                        <p className="text-[28px] font-black text-navy leading-none">{value}</p>
                                        <p className="text-[11px] font-black text-text-muted uppercase tracking-widest mt-1">{label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Main Table Card */}
                        <div className="bg-card-bg rounded-[32px] border border-border-color shadow-sm p-8 space-y-6 transition-colors duration-300">

                            {/* Filters row */}
                            <div className="flex justify-between items-center pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <select
                                            value={filterDistrict}
                                            onChange={(e) => setFilterDistrict(e.target.value)}
                                            className="pl-9 pr-4 py-2 bg-table-header-bg border border-border-color rounded-xl text-[12px] font-bold text-text-main appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-navy/10 transition-colors"
                                        >
                                            <option value="">All Districts</option>
                                            {districts.map(d => (
                                                <option key={d._id} value={d._id}>{d.name}</option>
                                            ))}
                                        </select>
                                        <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                                    </div>
                                </div>
                                <div className="text-[11px] font-black text-text-muted uppercase tracking-[0.15em] transition-colors">
                                    SHOWING {filtered.length} BRANCHES
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] border-b border-border-color transition-colors">
                                            <th className="pb-5 pt-3 pr-6 min-w-[200px]">Branch Name</th>
                                            <th className="pb-5 pt-3 px-4 text-center">Code</th>
                                            <th className="pb-5 pt-3 px-4 min-w-[160px]">District</th>
                                            <th className="pb-5 pt-3 px-4 min-w-[180px]">Manager</th>
                                            <th className="pb-5 pt-3 px-4">Address</th>
                                            <th className="pb-5 pt-3 px-4 text-center">Status</th>
                                            <th className="pb-5 pt-3 text-right w-24"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-color transition-colors">
                                        {filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="py-16 text-center text-text-muted italic font-semibold text-[14px]">
                                                    No branches found. Click "Add New Branch" to get started.
                                                </td>
                                            </tr>
                                        ) : (
                                            filtered.map((b) => (
                                                <tr key={b._id} className="group hover:bg-table-header-bg/40 transition-colors">
                                                    <td className="py-5 pr-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-table-header-bg flex items-center justify-center text-navy border border-border-color shadow-sm transition-colors">
                                                                <GitBranch size={16} />
                                                            </div>
                                                            <div>
                                                                <span className="text-[14px] font-black text-navy transition-colors block">{b.name}</span>
                                                                {b.phone && (
                                                                    <span className="text-[11px] font-bold text-text-muted flex items-center gap-1 mt-0.5">
                                                                        <Phone size={10} /> {b.phone}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-4 text-center">
                                                        <span className="text-[11px] font-black text-text-muted bg-table-header-bg border border-border-color px-3 py-1 rounded-md uppercase transition-colors">
                                                            {b.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-5 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin size={13} className="text-text-muted shrink-0" />
                                                            <span className="text-[13px] font-bold text-text-main">{b.district?.name || '—'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-4">
                                                        {b.manager ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-black border border-blue-500/20">
                                                                    {b.manager.fullName[0].toUpperCase()}
                                                                </div>
                                                                <span className="text-[13px] font-bold text-text-main">{b.manager.fullName}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[12px] font-black text-text-muted italic opacity-40">Unassigned</span>
                                                        )}
                                                    </td>
                                                    <td className="py-5 px-4">
                                                        <p className="text-[13px] font-bold text-text-muted line-clamp-1 max-w-[280px]">
                                                            {b.address || '—'}
                                                        </p>
                                                    </td>
                                                    <td className="py-5 px-4 text-center">
                                                        {b.isActive ? (
                                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
                                                                <CheckCircle size={10} /> Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-rose-600 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
                                                                <XCircle size={10} /> Inactive
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-5 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button
                                                                onClick={() => openEdit(b)}
                                                                className="p-2 text-text-muted hover:text-navy hover:bg-table-header-bg rounded-xl transition-all"
                                                                title="Edit branch"
                                                            >
                                                                <Edit3 size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteConfirmId(b._id)}
                                                                className="p-2 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                                                title="Delete branch"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Create / Edit Modal ───────────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-card-bg rounded-[24px] w-full max-w-2xl shadow-2xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-300 border border-border-color">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-border-color flex items-center justify-between transition-colors">
                            <div>
                                <h2 className="text-[18px] font-black text-navy tracking-tight transition-colors">
                                    {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                                </h2>
                                <p className="text-[12px] text-text-muted font-black transition-colors">
                                    {editingBranch ? 'Update branch details below.' : 'Register a new district branch office.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-table-header-bg rounded-lg text-text-muted transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="p-8 space-y-5 max-h-[65vh] overflow-y-auto custom-scrollbar">
                                {/* Row 1: District + Code */}
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">
                                            Parent District *
                                        </label>
                                        <div className="relative">
                                            <select
                                                required
                                                className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy focus:ring-2 focus:ring-navy/5 transition-all appearance-none cursor-pointer outline-none"
                                                value={formData.district}
                                                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                            >
                                                <option value="">Select district...</option>
                                                {districts.map(d => (
                                                    <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">
                                            Branch Code *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. HDN-B01"
                                            className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy placeholder:text-text-muted/50 focus:ring-2 focus:ring-navy/5 transition-all outline-none"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                </div>

                                {/* Branch Name */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">
                                        Branch Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Branch name"
                                        className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy placeholder:text-text-muted/50 focus:ring-2 focus:ring-navy/5 transition-all outline-none"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                {/* Row 2: Address + Phone */}
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">
                                            Address
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Office address"
                                            className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy placeholder:text-text-muted/50 focus:ring-2 focus:ring-navy/5 transition-all outline-none"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">
                                            Phone
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="+252 61 000 0000"
                                            className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy placeholder:text-text-muted/50 focus:ring-2 focus:ring-navy/5 transition-all outline-none"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Manager */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">
                                        Branch Manager (Staff)
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy focus:ring-2 focus:ring-navy/5 transition-all appearance-none cursor-pointer outline-none"
                                            value={formData.manager}
                                            onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                                        >
                                            <option value="">Select a manager...</option>
                                            {availableStaff.map(s => (
                                                <option key={s._id} value={s._id}>{s.fullName} ({s.email})</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={16} />
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">
                                        Notes
                                    </label>
                                    <textarea
                                        placeholder="Optional remarks about this branch..."
                                        rows={3}
                                        className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy placeholder:text-text-muted/50 focus:ring-2 focus:ring-navy/5 transition-all outline-none resize-none"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>

                                {/* Status (only when editing) */}
                                {editingBranch && (
                                    <div className="flex items-center gap-4 p-4 bg-table-header-bg rounded-xl">
                                        <span className="text-[12px] font-black text-text-muted uppercase tracking-widest">Status</span>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                                className="w-4 h-4 rounded accent-navy"
                                            />
                                            <span className="text-[13px] font-black text-navy">Active</span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-8 py-6 border-t border-border-color flex justify-center gap-5 bg-navy/5 transition-colors duration-300">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 text-[14px] font-black text-text-muted hover:text-navy transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-navy hover:brightness-110 text-white font-black text-[14px] px-8 py-2.5 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Saving...' : 'Save Branch'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm Modal ──────────────────────────────────────── */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-card-bg rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden border border-border-color animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                                    <AlertTriangle size={24} />
                                </div>
                                <h3 className="text-xl font-black text-navy tracking-tight transition-colors">
                                    Delete Branch
                                </h3>
                            </div>
                            <p className="text-[14px] text-text-muted font-bold leading-relaxed transition-colors">
                                Are you sure you want to delete this branch? This action cannot be undone.
                            </p>
                        </div>
                        <div className="px-8 py-6 border-t border-border-color flex justify-end gap-3 bg-navy/5 transition-colors duration-300">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-6 py-2.5 text-[13px] font-black text-text-muted hover:text-navy transition-colors uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-8 py-2.5 bg-rose-500 text-white text-[13px] font-black rounded-xl hover:brightness-110 shadow-lg shadow-rose-500/20 transition-all active:scale-95 uppercase tracking-widest"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DistrictBranchesManagement;
