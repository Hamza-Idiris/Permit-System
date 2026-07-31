import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import {
    Search, MapPin, MoreVertical,
    Bell, HelpCircle, ChevronDown,
    Plus, Edit3, Trash2, AlertTriangle,
    X, Info, User, Check, Layers
} from 'lucide-react';
import LoadingScreen from '../components/LoadingScreen';
import TopHeader from '../components/TopHeader';
import { useTheme } from '../context/ThemeContext';

const DistrictManagement = () => {
    const { token, user: currentUser } = useContext(AuthContext);
    const { darkMode } = useTheme();
    const [districts, setDistricts] = useState([]);
    const [availableStaff, setAvailableStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDistrict, setEditingDistrict] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        supervisor: '',
        description: ''
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const config = { headers: { 'Authorization': `Bearer ${token}` } };

            const [distRes, staffRes] = await Promise.all([
                axios.get('http://localhost:5000/api/districts', config),
                axios.get('http://localhost:5000/api/users', config)
            ]);

            if (distRes.data.success) {
                setDistricts(distRes.data.data);
            }

            if (staffRes.data.success) {
                // Only staff/inspectors can be supervisors
                const personnel = staffRes.data.data.filter(u => u.role === 'staff');
                setAvailableStaff(personnel);
            }
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.supervisor) {
            alert('Please select a staff supervisor for this district.');
            return;
        }
        try {
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            if (editingDistrict) {
                await axios.put(`http://localhost:5000/api/districts/${editingDistrict._id}`, formData, config);
            } else {
                await axios.post('http://localhost:5000/api/districts', formData, config);
            }
            setIsModalOpen(false);
            setEditingDistrict(null);
            setFormData({ name: '', code: '', supervisor: '', description: '' });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Hawlgalku wuu fashilmay');
        }
    };

    const handleDelete = (id) => {
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        try {
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            await axios.delete(`http://localhost:5000/api/districts/${deleteConfirmId}`, config);
            setDeleteConfirmId(null);
            fetchData();
        } catch (err) {
            alert('Delete failed');
            setDeleteConfirmId(null);
        }
    };

    const filteredDistricts = districts.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <LoadingScreen />;

    return (
        <div className="flex min-h-screen bg-bg-soft font-inter transition-colors duration-300">
            <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <TopHeader
                    breadcrumbs={['Oversight', 'District Settings']}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    placeholder="Search districts..."
                />

                <div className="flex-1 overflow-y-auto px-12 py-10 space-y-8 custom-scrollbar">
                    <div className="max-w-[1250px] mx-auto space-y-8">
                        {/* Page Title Section */}
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <h1 className="text-[34px] font-black text-navy tracking-tight transition-colors">District Management</h1>
                                <p className="text-text-muted font-bold text-[14px] leading-relaxed max-w-2xl transition-colors">
                                    Configure administrative boundaries and oversee regional performance.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingDistrict(null);
                                    setFormData({ name: '', code: '', supervisor: '', description: '' });
                                    setIsModalOpen(true);
                                }}
                                className="bg-navy hover:brightness-110 text-white font-black text-[13px] px-6 py-4 rounded-2xl flex items-center gap-2 shadow-lg transition-all transform active:scale-95"
                            >
                                <Plus size={18} /> Add New District
                            </button>
                        </div>

                        {/* Main Table Card */}
                        <div className="bg-card-bg rounded-[32px] border border-border-color shadow-sm p-8 space-y-6 transition-colors duration-300">

                            <div className="flex justify-between items-center pb-2">
                                <div className="flex items-center gap-4">
                                    <div className="px-4 py-2 bg-table-header-bg rounded-xl border border-border-color flex items-center gap-2 transition-colors">
                                        <Layers size={14} className="text-text-muted" />
                                        <span className="text-[12px] font-bold text-text-main transition-colors">All Layers</span>
                                        <ChevronDown size={14} className="text-text-muted" />
                                    </div>
                                </div>
                                <div className="text-[11px] font-black text-text-muted uppercase tracking-[0.15em] transition-colors">
                                    SHOWING {filteredDistricts.length} ACTIVE DISTRICTS
                                </div>
                            </div>

                            {/* Table Data */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] border-b border-border-color transition-colors">
                                            <th className="pb-5 pt-3 pr-6 min-w-[200px]">District Name</th>
                                            <th className="pb-5 pt-3 px-6 text-center">Code</th>
                                            <th className="pb-5 pt-3 px-6 min-w-[220px]">Assigned Supervisor</th>
                                            <th className="pb-5 pt-3 px-6 min-w-[300px]">Physical Boundary Description</th>
                                            <th className="pb-5 pt-3 text-right w-24"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-color transition-colors">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="5" className="py-16 text-center text-gray-400 italic font-semibold text-[14px]">
                                                    Loading district data...
                                                </td>
                                            </tr>
                                        ) : filteredDistricts.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="py-16 text-center text-gray-400 font-semibold text-[14px]">
                                                    No districts found matching your search.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredDistricts.map((d) => (
                                                <tr key={d._id} className="group hover:bg-table-header-bg/40 transition-colors">
                                                    <td className="py-6 pr-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-table-header-bg flex items-center justify-center text-navy border border-border-color shadow-sm transition-colors">
                                                                <MapPin size={18} />
                                                            </div>
                                                            <span className="text-[15px] font-black text-navy transition-colors">
                                                                {d.name}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td className="py-6 px-6 text-center">
                                                        <span className="text-[11px] font-black text-text-muted bg-table-header-bg border border-border-color px-3 py-1 rounded-md uppercase transition-colors">
                                                            {d.code}
                                                        </span>
                                                    </td>

                                                    <td className="py-6 px-6">
                                                        {d.supervisor ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-black border border-blue-500/20 transition-colors">
                                                                    {d.supervisor.fullName[0].toUpperCase()}
                                                                </div>
                                                                <span className="text-[13px] font-bold text-text-main transition-colors">
                                                                    {d.supervisor.fullName}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[12px] font-black text-text-muted italic opacity-40 transition-colors">Unassigned</span>
                                                        )}
                                                    </td>

                                                    <td className="py-6 px-6">
                                                        <p className="text-[13px] font-bold text-text-muted line-clamp-1 max-w-[400px] transition-colors">
                                                            {d.description || 'No description provided.'}
                                                        </p>
                                                    </td>

                                                    <td className="py-6 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingDistrict(d);
                                                                    setFormData({
                                                                        name: d.name,
                                                                        code: d.code,
                                                                        supervisor: d.supervisor?._id || '',
                                                                        description: d.description || ''
                                                                    });
                                                                    setIsModalOpen(true);
                                                                }}
                                                                className="p-2 text-text-muted hover:text-navy hover:bg-table-header-bg rounded-xl transition-all"
                                                            >
                                                                <Edit3 size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(d._id)}
                                                                className="p-2 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
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

                            {/* Load more indicator */}
                            {!loading && filteredDistricts.length > 0 && (
                                <div className="text-center pt-4 italic text-[12px] font-black text-text-muted transition-colors">
                                    Showing {filteredDistricts.length} of {filteredDistricts.length} records • Load more districts
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-card-bg rounded-[24px] w-full max-w-2xl shadow-2xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-300 border border-border-color">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-border-color flex items-center justify-between transition-colors">
                            <div>
                                <h2 className="text-[18px] font-black text-navy tracking-tight transition-colors">
                                    {editingDistrict ? 'Edit District' : 'Add New District'}
                                </h2>
                                <p className="text-[12px] text-text-muted font-black transition-colors">Register a new administrative area into the system.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-table-header-bg rounded-lg text-text-muted transition-colors font-black"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Name */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1 transition-colors">District Name</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="District Name"
                                            className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy placeholder:text-text-muted/50 focus:ring-2 focus:ring-navy/5 transition-all outline-none"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>

                                    {/* Code */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1 transition-colors">District Code</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="District Code"
                                            className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy placeholder:text-text-muted/50 focus:ring-2 focus:ring-navy/5 transition-all outline-none"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                </div>

                                {/* Boundaries */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1 transition-colors">Detailed Physical Boundary Description (Textual)</label>
                                    <textarea
                                        placeholder="District Boundaries"
                                        rows={4}
                                        className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy placeholder:text-text-muted/50 focus:ring-2 focus:ring-navy/5 transition-all outline-none resize-none"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                {/* Supervisor */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1 transition-colors">
                                        Assign Staff Supervisor <span className="text-rose-500 font-bold">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            required
                                            className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy focus:ring-2 focus:ring-navy/5 transition-all appearance-none cursor-pointer outline-none"
                                            value={formData.supervisor}
                                            onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                                        >
                                            <option value="">Select an available supervisor...</option>
                                            {availableStaff.map(s => (
                                                <option key={s._id} value={s._id}>{s.fullName} ({s.role})</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={18} />
                                    </div>
                                </div>
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
                                    className="bg-navy hover:brightness-110 text-white font-black text-[14px] px-8 py-2.5 rounded-xl shadow-lg transition-all active:scale-95"
                                >
                                    Save District Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-card-bg rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-600 animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                                    <AlertTriangle size={24} />
                                </div>
                                <h3 className="text-xl font-black text-navy tracking-tight transition-colors">
                                    Delete District
                                </h3>
                            </div>
                            <p className="text-[14px] text-text-muted font-bold leading-relaxed transition-colors">
                                Are you sure you want to delete this district? This action will permanently remove its data.
                            </p>
                        </div>
                        <div className="px-8 py-6 border-t border-border-color flex justify-end gap-3 bg-navy/5 transition-colors duration-300">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-6 py-2.5 text-[13px] font-black text-text-muted hover:text-navy transition-colors uppercase tracking-widest"
                            >
                                No
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

export default DistrictManagement;
