import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Plus, Edit3, Trash2, Wrench, CheckCircle2, XCircle, X } from 'lucide-react';
import TopHeader from '../components/TopHeader';
import Sidebar from '../components/Sidebar';
import AuthContext from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LoadingScreen from '../components/LoadingScreen';

const API = 'http://localhost:5000/api/renovation-types';

const RenovationManagement = () => {
    const { token } = useContext(AuthContext);
    const { darkMode } = useTheme();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [renovationTypes, setRenovationTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        feeMultiplier: '',
        isPerFloor: false
    });

    const [searchTerm, setSearchTerm] = useState('');

    const fetchRenovationTypes = async () => {
        try {
            setLoading(true);
            const res = await axios.get(API);
            setRenovationTypes(res.data.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch renovation types');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRenovationTypes();
    }, []);

    const handleOpenModal = (type = null) => {
        if (type) {
            setEditingType(type);
            setFormData({ name: type.name, feeMultiplier: type.feeMultiplier, isPerFloor: type.isPerFloor });
        } else {
            setEditingType(null);
            setFormData({ name: '', feeMultiplier: '', isPerFloor: false });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingType(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = {
                name: formData.name,
                feeMultiplier: Number(formData.feeMultiplier),
                isPerFloor: formData.isPerFloor
            };

            if (editingType) {
                await axios.put(`${API}/${editingType._id}`, payload, config);
            } else {
                await axios.post(API, payload, config);
            }

            handleCloseModal();
            fetchRenovationTypes();
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this renovation type?')) return;
        try {
            await axios.delete(`${API}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchRenovationTypes();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete');
        }
    };

    const filtered = renovationTypes.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && renovationTypes.length === 0) return <LoadingScreen />;

    return (
        <div className="flex min-h-screen bg-bg-soft font-inter transition-colors duration-300">
            <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <TopHeader
                    breadcrumbs={['Settings', 'Renovation']}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    placeholder="Search renovation types..."
                    onMenuClick={() => setIsMobileMenuOpen(true)}
                />

                <div className="flex-1 overflow-y-auto px-12 py-10 space-y-8 custom-scrollbar">
                    <div className="max-w-[1250px] mx-auto space-y-8">

                        {/* Page Header */}
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                                        <Wrench size={20} className="text-orange-500" />
                                    </div>
                                    <h1 className="text-[34px] font-black text-navy tracking-tight transition-colors">
                                        Renovation Management
                                    </h1>
                                </div>
                                <p className="text-text-muted font-bold text-[14px] leading-relaxed max-w-2xl transition-colors">
                                    Manage permit fee types for <strong>renovation and remodelling</strong> of existing constructions.
                                </p>
                            </div>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-orange-500 hover:brightness-110 text-white font-black text-[13px] px-6 py-4 rounded-2xl flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all transform active:scale-95"
                            >
                                <Plus size={18} /> Add Renovation Type
                            </button>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-card-bg border border-border-color rounded-2xl p-5 flex items-center gap-4 transition-colors">
                                <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                    <Wrench size={20} className="text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Total Types</p>
                                    <p className="text-[26px] font-black text-navy tracking-tight">{renovationTypes.length}</p>
                                </div>
                            </div>
                            <div className="bg-card-bg border border-border-color rounded-2xl p-5 flex items-center gap-4 transition-colors">
                                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <CheckCircle2 size={20} className="text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Per-Floor Types</p>
                                    <p className="text-[26px] font-black text-navy tracking-tight">
                                        {renovationTypes.filter(t => t.isPerFloor).length}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-card-bg border border-border-color rounded-2xl p-5 flex items-center gap-4 transition-colors">
                                <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Wrench size={20} className="text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Flat-Rate Types</p>
                                    <p className="text-[26px] font-black text-navy tracking-tight">
                                        {renovationTypes.filter(t => !t.isPerFloor).length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-rose-500/10 text-rose-600 rounded-xl font-medium flex items-center gap-2 border border-rose-500/20">
                                <XCircle size={18} /> {error}
                            </div>
                        )}

                        {/* Main Table */}
                        <div className="bg-card-bg rounded-2xl border border-border-color shadow-sm p-8 space-y-6 transition-colors duration-300">
                            <div className="flex justify-end items-center pb-2">
                                <div className="text-[11px] font-black text-text-muted uppercase tracking-[0.15em]">
                                    SHOWING {filtered.length} TYPES
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] border-b border-border-color">
                                            <th className="pb-5 pt-3 px-6">Renovation Type Name</th>
                                            <th className="pb-5 pt-3 px-6 text-center">Fee Multiplier</th>
                                            <th className="pb-5 pt-3 px-6 text-center">Calculates Per Floor?</th>
                                            <th className="pb-5 pt-3 text-right pr-6 w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-color">
                                        {loading ? (
                                            <tr><td colSpan="4" className="py-16 text-center text-text-muted italic font-semibold text-[14px]">Loading...</td></tr>
                                        ) : filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="py-16 text-center text-text-muted italic font-semibold text-[14px]">
                                                    No renovation types found. Click "Add Renovation Type" to create one.
                                                </td>
                                            </tr>
                                        ) : (
                                            filtered.map((type) => (
                                                <tr key={type._id} className="group hover:bg-table-header-bg/40 transition-colors">
                                                    <td className="py-5 px-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/15 shadow-sm">
                                                                <Wrench size={16} />
                                                            </div>
                                                            <span className="text-[14px] font-black text-navy block">{type.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-6 text-center">
                                                        <span className="text-[11px] font-black text-text-muted bg-table-header-bg border border-border-color px-3 py-1 rounded-md uppercase">
                                                            x{type.feeMultiplier.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="py-5 px-6 text-center">
                                                        {type.isPerFloor
                                                            ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                                                            : <span className="text-[14px] font-black text-text-muted opacity-40 mx-auto">—</span>
                                                        }
                                                    </td>
                                                    <td className="py-5 pr-6 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button
                                                                onClick={() => handleOpenModal(type)}
                                                                className="p-2 text-text-muted hover:text-navy hover:bg-table-header-bg rounded-xl transition-all"
                                                                title="Edit"
                                                            >
                                                                <Edit3 size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(type._id)}
                                                                className="p-2 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                                                title="Delete"
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

            {/* ── Create / Edit Modal ─────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div
                        className="bg-card-bg rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden border border-border-color animate-in zoom-in-95 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-8 py-6 border-b border-border-color flex items-center justify-between">
                            <div>
                                <h2 className="text-[18px] font-black text-navy tracking-tight">
                                    {editingType ? 'Edit Renovation Type' : 'Add Renovation Type'}
                                </h2>
                                <p className="text-[12px] text-text-muted font-black">
                                    {editingType ? 'Update renovation permit fee details.' : 'Create a new renovation fee type.'}
                                </p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-table-header-bg rounded-lg text-text-muted transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="p-8 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Renovation Type Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy placeholder:text-text-muted/50 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                                        placeholder="e.g. Interior Renovation"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Fee Multiplier *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.feeMultiplier}
                                        onChange={(e) => setFormData({ ...formData, feeMultiplier: e.target.value })}
                                        className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy placeholder:text-text-muted/50 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                                        placeholder="e.g. 0.3"
                                    />
                                    <p className="text-[11px] text-text-muted font-bold mt-1 pl-1">Multiplies the land area to calculate the renovation permit fee.</p>
                                </div>

                                <div className="flex items-center gap-4 p-4 mt-2 bg-table-header-bg rounded-xl">
                                    <span className="text-[12px] font-black text-text-muted uppercase tracking-widest flex-1">Per Floor Calculation</span>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isPerFloor}
                                            onChange={(e) => setFormData({ ...formData, isPerFloor: e.target.checked })}
                                            className="w-4 h-4 rounded accent-orange-500"
                                        />
                                        <span className="text-[13px] font-black text-navy select-none">Enable</span>
                                    </label>
                                </div>
                            </div>

                            <div className="px-8 py-6 border-t border-border-color flex justify-end gap-3 bg-orange-500/5">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-2.5 text-[13px] font-black text-text-muted hover:text-navy transition-colors uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-2.5 bg-orange-500 text-white text-[13px] font-black rounded-xl hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all active:scale-95 uppercase tracking-widest"
                                >
                                    {editingType ? 'Save Changes' : 'Create Type'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RenovationManagement;
