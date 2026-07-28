import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import {
  Plus, Edit3, Trash2, Home, CheckCircle2, XCircle, X,
  Layers, Wrench, RefreshCw, Percent, Building2
} from 'lucide-react';
import TopHeader from '../components/TopHeader';
import Sidebar from '../components/Sidebar';
import AuthContext from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

const API = 'http://localhost:5000/api';

const TYPE_TABS = [
  { id: 'construction', label: 'New Construction', endpoint: 'building-types', icon: Building2, singular: 'Construction Type' },
  { id: 'renovation', label: 'Renovation', endpoint: 'renovation-types', icon: Wrench, singular: 'Renovation Type' },
  { id: 'renew', label: 'Renew', endpoint: 'renew-types', icon: RefreshCw, singular: 'Renew Type' },
];

const REQUEST_TYPES = ['New Construction', 'Renovation', 'Renew'];

const emptyTypeForm = { name: '', feeMultiplier: '', isPerFloor: false };
const emptyDiscountForm = {
  name: '',
  scope: 'type',
  requestType: 'New Construction',
  typeName: '',
  discountPercent: '',
  isActive: true,
};

const PermitTypesManagement = () => {
  const { token } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('construction');
  const [searchTerm, setSearchTerm] = useState('');

  const [types, setTypes] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState(emptyTypeForm);

  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [discountForm, setDiscountForm] = useState(emptyDiscountForm);

  const config = { headers: { Authorization: `Bearer ${token}` } };
  const currentTypeTab = TYPE_TABS.find((t) => t.id === activeTab);
  const isDiscounts = activeTab === 'discounts';

  const fetchTypes = useCallback(async (endpoint) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API}/${endpoint}`);
      setTypes(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch types');
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API}/discounts`);
      setDiscounts(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch discounts');
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isDiscounts) fetchDiscounts();
    else if (currentTypeTab) fetchTypes(currentTypeTab.endpoint);
  }, [activeTab, isDiscounts, currentTypeTab, fetchTypes, fetchDiscounts]);

  const openTypeModal = (type = null) => {
    if (type) {
      setEditingType(type);
      setTypeForm({
        name: type.name,
        feeMultiplier: type.feeMultiplier,
        isPerFloor: !!type.isPerFloor,
      });
    } else {
      setEditingType(null);
      setTypeForm(emptyTypeForm);
    }
    setIsTypeModalOpen(true);
  };

  const submitType = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: typeForm.name,
        feeMultiplier: Number(typeForm.feeMultiplier),
        isPerFloor: typeForm.isPerFloor,
      };
      if (editingType) {
        await axios.put(`${API}/${currentTypeTab.endpoint}/${editingType._id}`, payload, config);
      } else {
        await axios.post(`${API}/${currentTypeTab.endpoint}`, payload, config);
      }
      setIsTypeModalOpen(false);
      fetchTypes(currentTypeTab.endpoint);
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const deleteType = async (id) => {
    if (!window.confirm('Delete this type?')) return;
    try {
      await axios.delete(`${API}/${currentTypeTab.endpoint}/${id}`, config);
      fetchTypes(currentTypeTab.endpoint);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const openDiscountModal = (d = null) => {
    if (d) {
      setEditingDiscount(d);
      setDiscountForm({
        name: d.name,
        scope: d.scope,
        requestType: d.requestType || 'New Construction',
        typeName: d.typeName || '',
        discountPercent: d.discountPercent,
        isActive: d.isActive !== false,
      });
    } else {
      setEditingDiscount(null);
      setDiscountForm(emptyDiscountForm);
    }
    setIsDiscountModalOpen(true);
  };

  const submitDiscount = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: discountForm.name,
        scope: discountForm.scope,
        discountPercent: Number(discountForm.discountPercent),
        isActive: discountForm.isActive,
        requestType: discountForm.scope === 'category' ? discountForm.requestType : (discountForm.requestType || ''),
        typeName: discountForm.scope === 'type' ? discountForm.typeName : '',
      };
      if (editingDiscount) {
        await axios.put(`${API}/discounts/${editingDiscount._id}`, payload, config);
      } else {
        await axios.post(`${API}/discounts`, payload, config);
      }
      setIsDiscountModalOpen(false);
      fetchDiscounts();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const deleteDiscount = async (id) => {
    if (!window.confirm('Delete this discount?')) return;
    try {
      await axios.delete(`${API}/discounts/${id}`, config);
      fetchDiscounts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const filteredTypes = types.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredDiscounts = discounts.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.typeName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // All type names across tabs for discount type select
  const [allTypeNames, setAllTypeNames] = useState([]);
  useEffect(() => {
    if (!isDiscounts) return;
    Promise.all([
      axios.get(`${API}/building-types`),
      axios.get(`${API}/renovation-types`),
      axios.get(`${API}/renew-types`),
    ]).then(([a, b, c]) => {
      const names = [
        ...(a.data.data || []),
        ...(b.data.data || []),
        ...(c.data.data || []),
      ].map((t) => t.name);
      setAllTypeNames([...new Set(names)].sort());
    }).catch(() => setAllTypeNames([]));
  }, [isDiscounts]);

  if (loading && types.length === 0 && discounts.length === 0) return <LoadingScreen />;

  return (
    <div className="flex min-h-screen bg-bg-soft font-inter transition-colors duration-300">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader
          breadcrumbs={['Settings', 'Permit Types']}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder={isDiscounts ? 'Search discounts...' : 'Search types...'}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        <div className="flex-1 overflow-y-auto px-12 py-10 space-y-8 custom-scrollbar">
          <div className="max-w-[1250px] mx-auto space-y-8">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div className="space-y-2">
                <h1 className="text-[34px] font-black text-navy tracking-tight">Permit Types</h1>
                <p className="text-text-muted font-bold text-[14px] leading-relaxed max-w-2xl">
                  Manage fee multipliers for construction, renovation, and renew — plus percentage discounts.
                </p>
              </div>
              <button
                onClick={() => (isDiscounts ? openDiscountModal() : openTypeModal())}
                className="bg-navy hover:brightness-110 text-white font-black text-[13px] px-6 py-4 rounded-2xl flex items-center gap-2 shadow-lg transition-all transform active:scale-95"
              >
                <Plus size={18} />
                {isDiscounts ? 'Add Discount' : `Add ${currentTypeTab?.singular || 'Type'}`}
              </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-card-bg border border-border-color rounded-2xl w-fit shadow-sm">
              {TYPE_TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setActiveTab(id); setSearchTerm(''); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-black transition-all ${
                    activeTab === id
                      ? 'bg-navy text-white shadow-md shadow-navy/20'
                      : 'text-text-muted hover:text-navy hover:bg-table-header-bg'
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
              <button
                onClick={() => { setActiveTab('discounts'); setSearchTerm(''); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-black transition-all ${
                  isDiscounts
                    ? 'bg-navy text-white shadow-md shadow-navy/20'
                    : 'text-text-muted hover:text-navy hover:bg-table-header-bg'
                }`}
              >
                <Percent size={15} /> Discounts
              </button>
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 text-rose-600 rounded-xl font-medium flex items-center gap-2 border border-rose-500/20">
                <XCircle size={18} /> {error}
              </div>
            )}

            {!isDiscounts && (
              <div className="bg-card-bg rounded-[32px] border border-border-color shadow-sm p-8 space-y-6">
                <div className="flex justify-between items-center pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-table-header-bg flex items-center justify-center text-navy border border-border-color">
                      <Layers size={16} />
                    </div>
                    <div>
                      <p className="text-[14px] font-black text-navy">{currentTypeTab?.label}</p>
                      <p className="text-[11px] font-bold text-text-muted">Fee multiplier types</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-black text-text-muted uppercase tracking-[0.15em]">
                    Showing {filteredTypes.length} types
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] border-b border-border-color">
                        <th className="pb-5 pt-3 px-6">Name</th>
                        <th className="pb-5 pt-3 px-6 text-center">Fee Multiplier</th>
                        <th className="pb-5 pt-3 px-6 text-center">Per Floor?</th>
                        <th className="pb-5 pt-3 text-right pr-6 w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                      {loading ? (
                        <tr>
                          <td colSpan="4" className="py-16 text-center text-text-muted italic font-semibold text-[14px]">
                            Loading...
                          </td>
                        </tr>
                      ) : filteredTypes.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-16 text-center text-text-muted italic font-semibold text-[14px]">
                            No types found. Click Add to create one.
                          </td>
                        </tr>
                      ) : (
                        filteredTypes.map((type) => (
                          <tr key={type._id} className="group hover:bg-table-header-bg/40 transition-colors">
                            <td className="py-5 px-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-table-header-bg flex items-center justify-center text-navy border border-border-color shadow-sm">
                                  <Home size={16} />
                                </div>
                                <span className="text-[14px] font-black text-navy">{type.name}</span>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-center">
                              <span className="text-[11px] font-black text-text-muted bg-table-header-bg border border-border-color px-3 py-1 rounded-md uppercase">
                                x{Number(type.feeMultiplier).toFixed(2)}
                              </span>
                            </td>
                            <td className="py-5 px-6 text-center">
                              {type.isPerFloor ? (
                                <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                              ) : (
                                <span className="text-[14px] font-black text-text-muted opacity-40">—</span>
                              )}
                            </td>
                            <td className="py-5 pr-6 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                  onClick={() => openTypeModal(type)}
                                  className="p-2 text-text-muted hover:text-navy hover:bg-table-header-bg rounded-xl transition-all"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  onClick={() => deleteType(type._id)}
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
              </div>
            )}

            {isDiscounts && (
              <div className="space-y-6">
                <div className="bg-navy/5 border border-navy/10 rounded-2xl px-5 py-4 flex items-start gap-3">
                  <Percent size={18} className="text-navy shrink-0 mt-0.5" />
                  <p className="text-[13px] font-bold text-navy leading-relaxed">
                    Discounts apply a percent off either one specific type name, or an entire category
                    (New Construction, Renovation, or Renew). Type-scoped discounts take priority when both match.
                  </p>
                </div>

                <div className="bg-card-bg rounded-[32px] border border-border-color shadow-sm p-8 space-y-6">
                  <div className="flex justify-end">
                    <div className="text-[11px] font-black text-text-muted uppercase tracking-[0.15em]">
                      Showing {filteredDiscounts.length} discounts
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] border-b border-border-color">
                          <th className="pb-5 pt-3 px-6">Name</th>
                          <th className="pb-5 pt-3 px-6">Scope</th>
                          <th className="pb-5 pt-3 px-6">Applies To</th>
                          <th className="pb-5 pt-3 px-6 text-center">%</th>
                          <th className="pb-5 pt-3 px-6 text-center">Active</th>
                          <th className="pb-5 pt-3 text-right pr-6 w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-color">
                        {loading ? (
                          <tr>
                            <td colSpan="6" className="py-16 text-center text-text-muted italic font-semibold text-[14px]">
                              Loading...
                            </td>
                          </tr>
                        ) : filteredDiscounts.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-16 text-center text-text-muted italic font-semibold text-[14px]">
                              No discounts yet. Add one to get started.
                            </td>
                          </tr>
                        ) : (
                          filteredDiscounts.map((d) => (
                            <tr key={d._id} className="group hover:bg-table-header-bg/40 transition-colors">
                              <td className="py-5 px-6">
                                <span className="text-[14px] font-black text-navy">{d.name}</span>
                              </td>
                              <td className="py-5 px-6">
                                <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-table-header-bg border border-border-color text-text-muted">
                                  {d.scope}
                                </span>
                              </td>
                              <td className="py-5 px-6 text-[13px] font-bold text-navy">
                                {d.scope === 'category' ? d.requestType : d.typeName || '—'}
                              </td>
                              <td className="py-5 px-6 text-center">
                                <span className="text-[13px] font-black text-emerald-600">{d.discountPercent}%</span>
                              </td>
                              <td className="py-5 px-6 text-center">
                                {d.isActive ? (
                                  <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                                ) : (
                                  <XCircle size={16} className="text-text-muted/40 mx-auto" />
                                )}
                              </td>
                              <td className="py-5 pr-6 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                  <button
                                    onClick={() => openDiscountModal(d)}
                                    className="p-2 text-text-muted hover:text-navy hover:bg-table-header-bg rounded-xl transition-all"
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                  <button
                                    onClick={() => deleteDiscount(d._id)}
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
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Type modal */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4">
          <div className="bg-card-bg rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden border border-border-color">
            <div className="px-8 py-6 border-b border-border-color flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-black text-navy tracking-tight">
                  {editingType ? `Edit ${currentTypeTab?.singular}` : `Add ${currentTypeTab?.singular}`}
                </h2>
                <p className="text-[12px] text-text-muted font-black">
                  {editingType ? 'Update fee details below.' : 'Create a new fee multiplier type.'}
                </p>
              </div>
              <button onClick={() => setIsTypeModalOpen(false)} className="p-2 hover:bg-table-header-bg rounded-lg text-text-muted">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitType}>
              <div className="p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={typeForm.name}
                    onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                    className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy placeholder:text-text-muted/50 focus:ring-2 focus:ring-navy/5 outline-none"
                    placeholder="e.g. Villa (Dhagax)"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Fee Multiplier *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={typeForm.feeMultiplier}
                    onChange={(e) => setTypeForm({ ...typeForm, feeMultiplier: e.target.value })}
                    className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy placeholder:text-text-muted/50 focus:ring-2 focus:ring-navy/5 outline-none"
                    placeholder="e.g. 0.5"
                  />
                </div>
                <div className="flex items-center gap-4 p-4 bg-table-header-bg rounded-xl">
                  <span className="text-[12px] font-black text-text-muted uppercase tracking-widest flex-1">Per Floor</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={typeForm.isPerFloor}
                      onChange={(e) => setTypeForm({ ...typeForm, isPerFloor: e.target.checked })}
                      className="w-4 h-4 rounded accent-navy"
                    />
                    <span className="text-[13px] font-black text-navy">Enable</span>
                  </label>
                </div>
              </div>
              <div className="px-8 py-6 border-t border-border-color flex justify-end gap-3 bg-navy/5">
                <button type="button" onClick={() => setIsTypeModalOpen(false)} className="px-6 py-2.5 text-[13px] font-black text-text-muted hover:text-navy uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" className="px-8 py-2.5 bg-navy text-white text-[13px] font-black rounded-xl hover:brightness-110 shadow-lg shadow-navy/20 uppercase tracking-widest">
                  {editingType ? 'Save Changes' : 'Create Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discount modal */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4">
          <div className="bg-card-bg rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden border border-border-color">
            <div className="px-8 py-6 border-b border-border-color flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-black text-navy tracking-tight">
                  {editingDiscount ? 'Edit Discount' : 'Add Discount'}
                </h2>
                <p className="text-[12px] text-text-muted font-black">
                  Percent off for one type or a whole category.
                </p>
              </div>
              <button onClick={() => setIsDiscountModalOpen(false)} className="p-2 hover:bg-table-header-bg rounded-lg text-text-muted">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitDiscount}>
              <div className="p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={discountForm.name}
                    onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                    className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy outline-none focus:ring-2 focus:ring-navy/5"
                    placeholder="e.g. Early bird renovation"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Scope *</label>
                  <select
                    value={discountForm.scope}
                    onChange={(e) => setDiscountForm({ ...discountForm, scope: e.target.value })}
                    className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy outline-none"
                  >
                    <option value="type">Type (one specific type)</option>
                    <option value="category">Category (whole request type)</option>
                  </select>
                </div>
                {discountForm.scope === 'category' ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Request Type *</label>
                    <select
                      value={discountForm.requestType}
                      onChange={(e) => setDiscountForm({ ...discountForm, requestType: e.target.value })}
                      className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy outline-none"
                    >
                      {REQUEST_TYPES.map((rt) => (
                        <option key={rt} value={rt}>{rt}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Type Name *</label>
                    {allTypeNames.length > 0 ? (
                      <select
                        required
                        value={discountForm.typeName}
                        onChange={(e) => setDiscountForm({ ...discountForm, typeName: e.target.value })}
                        className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy outline-none"
                      >
                        <option value="">Select a type…</option>
                        {allTypeNames.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        value={discountForm.typeName}
                        onChange={(e) => setDiscountForm({ ...discountForm, typeName: e.target.value })}
                        className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy outline-none"
                        placeholder="Exact type name"
                      />
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Discount % *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    required
                    value={discountForm.discountPercent}
                    onChange={(e) => setDiscountForm({ ...discountForm, discountPercent: e.target.value })}
                    className="w-full bg-table-header-bg border-none rounded-xl px-5 py-3.5 text-[14px] font-black text-navy outline-none"
                    placeholder="0–100"
                  />
                </div>
                <div className="flex items-center gap-4 p-4 bg-table-header-bg rounded-xl">
                  <span className="text-[12px] font-black text-text-muted uppercase tracking-widest flex-1">Active</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={discountForm.isActive}
                      onChange={(e) => setDiscountForm({ ...discountForm, isActive: e.target.checked })}
                      className="w-4 h-4 rounded accent-navy"
                    />
                    <span className="text-[13px] font-black text-navy">Enabled</span>
                  </label>
                </div>
              </div>
              <div className="px-8 py-6 border-t border-border-color flex justify-end gap-3 bg-navy/5">
                <button type="button" onClick={() => setIsDiscountModalOpen(false)} className="px-6 py-2.5 text-[13px] font-black text-text-muted hover:text-navy uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" className="px-8 py-2.5 bg-navy text-white text-[13px] font-black rounded-xl hover:brightness-110 shadow-lg shadow-navy/20 uppercase tracking-widest">
                  {editingDiscount ? 'Save Changes' : 'Create Discount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermitTypesManagement;
