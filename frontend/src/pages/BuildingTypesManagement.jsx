import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Home, CheckCircle2, XCircle } from 'lucide-react';
import TopHeader from '../components/TopHeader';
import Sidebar from '../components/Sidebar';

const BuildingTypesManagement = () => {
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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/building-types/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBuildingTypes();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader onMenuClick={() => setIsMobileMenuOpen(true)} title="Building Types" />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-[#0d1b2a]">Building Types</h1>
                <p className="text-sm text-gray-500 font-medium mt-1">Manage permit fees based on property types.</p>
              </div>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25"
              >
                <Plus size={16} />
                Add Building Type
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl font-medium flex items-center gap-2">
                <XCircle size={18} /> {error}
              </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 text-gray-400 text-xs uppercase tracking-wider font-black">
                      <th className="px-6 py-4">Building Name</th>
                      <th className="px-6 py-4 text-center">Fee Multiplier</th>
                      <th className="px-6 py-4 text-center">Calculates Per Floor?</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-gray-400 font-medium">Loading building types...</td>
                      </tr>
                    ) : buildingTypes.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-gray-400 font-medium">No building types found. Add one to get started.</td>
                      </tr>
                    ) : (
                      buildingTypes.map((type) => (
                        <tr key={type._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Home size={18} className="text-blue-600" />
                              </div>
                              <span className="font-bold text-gray-900">{type.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-bold bg-gray-100 text-gray-700">
                              x{type.feeMultiplier.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {type.isPerFloor ? (
                              <CheckCircle2 size={20} className="text-green-500 mx-auto" />
                            ) : (
                              <span className="text-gray-400 font-bold text-sm">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenModal(type)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(type._id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
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
        </main>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">
                {editingType ? 'Edit Building Type' : 'Add Building Type'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-1">
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Building Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="e.g. Villa (Dhagax)"
                />
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Fee Multiplier</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.feeMultiplier}
                  onChange={(e) => setFormData({...formData, feeMultiplier: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="e.g. 0.6"
                />
                <p className="text-xs text-gray-400 font-medium mt-1.5">This multiplies the calculated area to determine the base fee.</p>
              </div>

              <div className="flex items-center gap-3 mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  id="isPerFloor"
                  checked={formData.isPerFloor}
                  onChange={(e) => setFormData({...formData, isPerFloor: e.target.checked})}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="isPerFloor" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                  Calculate fee per floor (e.g. for Dabaq)
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/25"
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
