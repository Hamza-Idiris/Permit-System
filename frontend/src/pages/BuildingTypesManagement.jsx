import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Plus, Edit3, Trash2, Home, CheckCircle2, XCircle, X } from 'lucide-react';
import TopHeader from '../components/TopHeader';
import Sidebar from '../components/Sidebar';
import AuthContext from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LoadingScreen from '../components/LoadingScreen';

const BuildingTypesManagement = () => {
  const { token } = useContext(AuthContext);
  const { darkMode } = useTheme();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [buildingTypes, setBuildingTypes] = useState([]);
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

  const fetchBuildingTypes = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/building-types');
      setBuildingTypes(res.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch building types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildingTypes();
  }, []);

  const handleOpenModal = (type = null) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        feeMultiplier: type.feeMultiplier,
        isPerFloor: type.isPerFloor
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        feeMultiplier: '',
        isPerFloor: false
      });
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
        await axios.put(`http://localhost:5000/api/building-types/${editingType._id}`, payload, config);
      } else {
        await axios.post('http://localhost:5000/api/building-types', payload, config);
      }

      handleCloseModal();
      fetchBuildingTypes();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this building type?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/building-types/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBuildingTypes();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = buildingTypes.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading && buildingTypes.length === 0) return <LoadingScreen />;

  return (
    <div className="flex min-h-screen bg-bg-soft font-inter transition-colors duration-300">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader
          breadcrumbs={['Settings', 'Building Types']}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search building types..."
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        <div className="flex-1 overflow-y-auto px-12 py-10 space-y-8 custom-scrollbar">
          <div className="max-w-[1250px] mx-auto space-y-8">

            {/* Page Header */}
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h1 className="text-[34px] font-black text-navy tracking-tight transition-colors">
                  Building Types Management
                </h1>
                <p className="text-text-muted font-bold text-[14px] leading-relaxed max-w-2xl transition-colors">
                  Manage permit fees based on property types.
                </p>
              </div>
              <button
                onClick={() => handleOpenModal()}
                className="bg-navy hover:brightness-110 text-white font-black text-[13px] px-6 py-4 rounded-2xl flex items-center gap-2 shadow-lg transition-all transform active:scale-95"
              >
                <Plus size={18} /> Add New Type
              </button>
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 text-rose-600 rounded-xl font-medium flex items-center gap-2 border border-rose-500/20">
                <XCircle size={18} /> {error}
              </div>
            )}

            {/* Main Table Card */}
            <div className="bg-card-bg rounded-[32px] border border-border-color shadow-sm p-8 space-y-6 transition-colors duration-300">

              <div className="flex justify-end items-center pb-2">
                <div className="text-[11px] font-black text-text-muted uppercase tracking-[0.15em] transition-colors">
                  SHOWING {filtered.length} TYPES
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] border-b border-border-color transition-colors">
                      <th className="pb-5 pt-3 px-6">Building Name</th>
                      <th className="pb-5 pt-3 px-6 text-center">Fee Multiplier</th>
                      <th className="pb-5 pt-3 px-6 text-center">Calculates Per Floor?</th>
                      <th className="pb-5 pt-3 text-right pr-6 w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color transition-colors">
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="py-16 text-center text-text-muted italic font-semibold text-[14px]">Loading building types...</td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-16 text-center text-text-muted italic font-semibold text-[14px]">
                          No building types found. Add one to get started.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((type) => (
                        <tr key={type._id} className="group hover:bg-table-header-bg/40 transition-colors">
                          <td className="py-5 px-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-table-header-bg flex items-center justify-center text-navy border border-border-color shadow-sm transition-colors">
                                <Home size={16} />
                              </div>
                              <span className="text-[14px] font-black text-navy transition-colors block">{type.name}</span>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-center">
                            <span className="text-[11px] font-black text-text-muted bg-table-header-bg border border-border-color px-3 py-1 rounded-md uppercase transition-colors">
                              x{type.feeMultiplier.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-5 px-6 text-center">
                            {type.isPerFloor ? (
                              <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                            ) : (
                              <span className="text-[14px] font-black text-text-muted opacity-40 mx-auto">—</span>
                            )}
                          </td>
                          <td className="py-5 pr-6 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => handleOpenModal(type)}
                                className="p-2 text-text-muted hover:text-navy hover:bg-table-header-bg rounded-xl transition-all"
                                title="Edit type"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(type._id)}
                                className="p-2 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                title="Delete type"
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
          <div className="bg-card-bg rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-300 border border-border-color" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-border-color flex items-center justify-between transition-colors">
              <div>
                <h2 className="text-[18px] font-black text-navy tracking-tight transition-colors">
                  {editingType ? 'Edit Building Type' : 'Add Building Type'}
                </h2>
                <p className="text-[12px] text-text-muted font-black transition-colors">
                  {editingType ? 'Update building type details below.' : 'Create a new fee multiplier type.'}
                </p>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-table-header-bg rounded-lg text-text-muted transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Building Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy placeholder:text-text-muted/50 focus:ring-2 focus:ring-navy/5 transition-all outline-none"
                    placeholder="e.g. Villa (Dhagax)"
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
                    className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy placeholder:text-text-muted/50 focus:ring-2 focus:ring-navy/5 transition-all outline-none"
                    placeholder="e.g. 0.6"
                  />
                  <p className="text-[11px] text-text-muted font-bold mt-1 pl-1">Multiplies calculated area for base fee.</p>
                </div>

                <div className="flex items-center gap-4 p-4 mt-2 bg-table-header-bg rounded-xl">
                  <span className="text-[12px] font-black text-text-muted uppercase tracking-widest flex-1">Per Floor Calculation</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPerFloor}
                      onChange={(e) => setFormData({ ...formData, isPerFloor: e.target.checked })}
                      className="w-4 h-4 rounded accent-navy"
                    />
                    <span className="text-[13px] font-black text-navy select-none">Enable</span>
                  </label>
                </div>
              </div>

              <div className="px-8 py-6 border-t border-border-color flex justify-end gap-3 bg-navy/5 transition-colors duration-300">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 text-[13px] font-black text-text-muted hover:text-navy transition-colors uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-navy text-white text-[13px] font-black rounded-xl hover:brightness-110 shadow-lg shadow-navy/20 transition-all active:scale-95 uppercase tracking-widest"
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

export default BuildingTypesManagement;

