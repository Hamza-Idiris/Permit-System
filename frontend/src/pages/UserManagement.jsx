import { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import {
  Search, Filter, ChevronDown, UserPlus, MapPin, MoreVertical,
  CheckCircle2, AlertCircle, Edit3, Trash2, Eye, EyeOff,
  Settings2, X, Info, Power, Ban, KeyRound
} from 'lucide-react';
import ConfigDrawer from '../components/ConfigDrawer';
import LoadingScreen from '../components/LoadingScreen';
import TopHeader from '../components/TopHeader';
import { useTheme } from '../context/ThemeContext';

const ALL_COLUMNS = [
  { id: 'fullName', label: 'Full Name', mandatory: true },
  { id: 'email', label: 'Email Address' },
  { id: 'phone', label: 'Phone Number' },
  { id: 'role', label: 'Assigned Role' },
  { id: 'district', label: 'Primary District' },
  { id: 'workStatus', label: 'Account Status' },
  { id: 'actions', label: 'Actions', mandatory: true }
];

const UserManagement = () => {
  const { token, user } = useContext(AuthContext);
  const { darkMode } = useTheme();
  const location = useLocation();
  const path = location.pathname;

  const [districts, setDistricts] = useState([]);

  // Determine current mode based on URL: 'staff', 'inspector', or 'applicant'
  let mode = 'staff';
  if (path.includes('inspector')) {
    mode = 'inspector';
  } else if (path.includes('applicant')) {
    mode = 'applicant';
  }

  const pageTitle = mode === 'staff'
    ? 'Staff Management'
    : mode === 'inspector'
      ? 'Inspector Management'
      : 'Applicant Management';

  const pageDescription = mode === 'staff'
    ? 'Control access levels and regional assignments for municipal officers.'
    : mode === 'inspector'
      ? 'Control access levels and regional assignments for municipal field inspectors.'
      : 'Manage and review verified citizen profiles, account credentials, and applicant logs.';

  const canAddUser = mode !== 'applicant';

  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(null);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(ALL_COLUMNS.map(c => c.id));
  const [rowDensity, setRowDensity] = useState('comfortable');
  const [filterByGender, setFilterByGender] = useState('');
  const [filterByDistrict, setFilterByDistrict] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: mode,
    district: '',
    gender: 'Male'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      const [userRes, distRes] = await Promise.all([
        axios.get('http://localhost:5000/api/users', config),
        axios.get('http://localhost:5000/api/districts', config)
      ]);

      if (userRes.data.success) setUsers(userRes.data.data);
      if (distRes.data.success) setDistricts(distRes.data.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setFormData({ fullName: '', email: '', phone: '', password: '', role: mode, district: '', gender: 'Male' });
    setSearchTerm('');
    setFilterByDistrict('');
    setFilterByGender('');
  }, [token, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const phoneRegex = /^(60|61|62|63|65|66|67|68|69|70|71|77|90)\d{7}$/;
    if (!phoneRegex.test(formData.phone)) {
      alert('unexisting Number');
      return;
    }

    const payload = {
      ...formData,
      phone: `+252${formData.phone}`
    };

    try {
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      if (editingUser) {
        await axios.put(`http://localhost:5000/api/users/${editingUser._id}`, payload, config);
      } else {
        await axios.post('http://localhost:5000/api/users', payload, config);
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ fullName: '', email: '', phone: '', password: '', role: mode, district: '', gender: 'Male' });
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
      await axios.delete(`http://localhost:5000/api/users/${deleteConfirmId}`, config);
      setDeleteConfirmId(null);
      fetchData();
    } catch (err) {
      alert('Delete failed');
      setDeleteConfirmId(null);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    try {
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      const nextActive = targetUser.isActive === false ? true : false;
      await axios.put(
        `http://localhost:5000/api/users/${targetUser._id}/status`,
        { isActive: nextActive },
        config
      );
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update account status');
    }
  };

  const handleResetPassword = async (targetUser) => {
    if (!window.confirm(`Reset password for ${targetUser.fullName}?`)) return;
    try {
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      const res = await axios.put(
        `http://localhost:5000/api/users/${targetUser._id}/reset-password`,
        {},
        config
      );
      if (res.data.temporaryPassword) {
        alert(`Temporary password: ${res.data.temporaryPassword}`);
      } else {
        alert(res.data.message || 'Password reset successfully');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesRole = u.role === mode;
    const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGender = filterByGender ? u.gender === filterByGender : true;
    const matchesDistrict = filterByDistrict ? u.district === filterByDistrict : true;

    return matchesRole && matchesSearch && matchesGender && matchesDistrict;
  });

  if (loading) return <LoadingScreen />;

  return (
    <div className="flex min-h-screen bg-bg-soft font-inter">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader
          breadcrumbs={['Security', 'Personnel', pageTitle]}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search personnel..."
        />

        <div className="flex-1 overflow-y-auto px-12 py-10 space-y-8 custom-scrollbar">
          <div className="max-w-[1250px] mx-auto space-y-8">
            {/* Page Title Section */}
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h1 className="text-[34px] font-black text-navy tracking-tight">{pageTitle}</h1>
                <p className="text-text-muted font-bold text-[14px] leading-relaxed max-w-2xl">
                  {pageDescription}
                </p>
              </div>
              {canAddUser && (
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setFormData({ fullName: '', email: '', phone: '', password: '', role: mode, district: '', gender: 'Male' });
                    setIsModalOpen(true);
                  }}
                  className="bg-navy hover:brightness-110 text-white font-black text-[13px] px-6 py-4 rounded-2xl flex items-center gap-2 shadow-lg transition-all duration-300 transform active:scale-95"
                >
                  <UserPlus size={18} /> Add New User
                </button>
              )}
            </div>

            {/* Main Table Card */}
            <div className="bg-card-bg rounded-[32px] border border-border-color shadow-[0_10px_35px_rgba(0,0,0,0.015)] p-8 space-y-6 transition-colors duration-300">

              {/* Filters Header */}
              <div className="flex justify-between items-center pb-2">
                <div className="flex items-center gap-4 relative">
                  {/* District Filter (Hide for applicants) */}
                  {mode !== 'applicant' && (
                    <div className="relative">
                      <button
                        onClick={() => setIsFilterDropdownOpen(prev => prev === 'district' ? null : 'district')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl border font-bold text-[12px] transition-all ${filterByDistrict
                          ? 'bg-navy text-white border-navy'
                          : 'bg-table-header-bg text-text-main border-border-color hover:brightness-95'
                          }`}
                      >
                        <MapPin size={14} />
                        <span>{filterByDistrict ? `District: ${filterByDistrict}` : 'District'}</span>
                        <ChevronDown size={14} />
                      </button>
                      {isFilterDropdownOpen === 'district' && (
                        <div className="absolute left-0 mt-2 w-56 bg-card-bg border border-border-color rounded-2xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                          <button
                            onClick={() => { setFilterByDistrict(''); setIsFilterDropdownOpen(null); }}
                            className="w-full text-left px-4 py-2 text-[12px] font-bold text-text-main hover:bg-table-header-bg/50 rounded-xl transition-colors"
                          >
                            All Districts
                          </button>
                          {districts.map(d => (
                            <button
                              key={d._id}
                              onClick={() => { setFilterByDistrict(d.name); setIsFilterDropdownOpen(null); }}
                              className="w-full text-left px-4 py-2 text-[12px] font-bold text-text-main hover:bg-table-header-bg/50 rounded-xl transition-colors"
                            >
                              {d.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Configure View Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowConfigDrawer(true)}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border-color bg-table-header-bg text-text-main font-bold text-[12px] hover:brightness-95 transition-all"
                    >
                      <Settings2 size={14} />
                      <span>Configure Views</span>
                    </button>
                  </div>

                  {/* Clear button if active */}
                  {(filterByDistrict || searchTerm) && (
                    <button
                      onClick={() => { setFilterByDistrict(''); setSearchTerm(''); }}
                      className="text-[12px] font-bold text-rose-500 hover:text-rose-600 px-3 py-2 transition-colors"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">
                  SHOWING {filteredUsers.length} ACTIVE {mode.toUpperCase()} MEMBERS
                </div>
              </div>

              {/* Table Data */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] border-b border-border-color">
                      {visibleColumns.includes('fullName') && <th className="pb-5 pt-3 pl-2 pr-6 min-w-[240px]">Full Name</th>}
                      {visibleColumns.includes('email') && <th className="pb-5 pt-3 px-6 min-w-[200px]">Email Address</th>}
                      {visibleColumns.includes('phone') && <th className="pb-5 pt-3 px-6 min-w-[150px]">Phone Number</th>}
                      {visibleColumns.includes('role') && <th className="pb-5 pt-3 px-6 text-center min-w-[150px]">Assigned Role</th>}
                      {visibleColumns.includes('district') && <th className="pb-5 pt-3 px-6 min-w-[180px]">Primary District</th>}
                      {visibleColumns.includes('workStatus') && <th className="pb-5 pt-3 px-6 min-w-[140px]">Account Status</th>}
                      {visibleColumns.includes('actions') && <th className="pb-5 pt-3 text-right w-24"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color">
                    {loading ? (
                      <tr>
                        <td colSpan={visibleColumns.length} className="py-16 text-center text-gray-400 italic font-semibold text-[14px]">
                          Loading personnel data...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColumns.length} className="py-16 text-center text-gray-400 font-semibold text-[14px]">
                          No personnel match your current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u, idx) => {
                        const initials = u.fullName ? u.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US';
                        const isActive = u.isActive !== false;
                        const workStatus = isActive ? 'ACTIVE' : 'INACTIVE';
                        const dotColor = isActive ? 'bg-[#10B981]' : 'bg-[#EF4444]';
                        const textColor = isActive ? 'text-[#10B981]' : 'text-[#EF4444]';

                        const avatarThemes = darkMode ? [
                          { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
                          { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
                          { bg: 'bg-amber-500/20', text: 'text-amber-400' },
                          { bg: 'bg-rose-500/20', text: 'text-rose-400' },
                          { bg: 'bg-blue-500/20', text: 'text-blue-400' }
                        ] : [
                          { bg: 'bg-[#E0F2FE]', text: 'text-[#0369A1]' },
                          { bg: 'bg-[#EEF2F6]', text: 'text-[#334155]' },
                          { bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]' },
                          { bg: 'bg-[#F0FDF4]', text: 'text-[#15803D]' },
                          { bg: 'bg-[#FAF5FF]', text: 'text-[#7E22CE]' }
                        ];
                        const theme = avatarThemes[idx % avatarThemes.length];

                        return (
                          <tr key={u._id} className="group hover:bg-table-header-bg/40 transition-colors">
                            {visibleColumns.includes('fullName') && (
                              <td className="py-6 pr-6 min-w-[240px]">
                                <div className="flex items-center gap-4 text-left">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[13px] shrink-0 ${theme.bg} ${theme.text} shadow-sm border border-black/5`}>
                                    {initials}
                                  </div>
                                  <div className="flex flex-col text-left justify-center">
                                    <span className="text-[15px] font-black text-navy leading-tight">
                                      {u.fullName}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            )}

                            {visibleColumns.includes('email') && (
                              <td className="py-6 px-6">
                                <span className="text-[13px] font-semibold text-text-muted lowercase">{u.email}</span>
                              </td>
                            )}

                            {visibleColumns.includes('phone') && (
                              <td className="py-6 px-6">
                                <span className="text-[13px] font-bold text-text-muted transition-colors">{u.phone || '—'}</span>
                              </td>
                            )}

                            {visibleColumns.includes('role') && (
                              <td className="py-6 px-6 text-center">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl inline-block ${u.role === 'superadmin' ? 'bg-navy/10 text-navy' : 'bg-table-header-bg text-text-muted'}`}>
                                  {u.role.toUpperCase()}
                                </span>
                              </td>
                            )}

                            {visibleColumns.includes('district') && (
                              <td className="py-6 px-6">
                                <span className="text-[13px] font-bold text-gray-600">
                                  {u.district ? `${u.district}` : 'Unassigned'}
                                </span>
                              </td>
                            )}

                            {visibleColumns.includes('workStatus') && (
                              <td className="py-6 px-6">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></span>
                                  <span className={`text-[11px] font-black tracking-wider uppercase ${textColor}`}>{workStatus}</span>
                                </div>
                              </td>
                            )}

                            {visibleColumns.includes('actions') && (
                              <td className="py-6 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => handleToggleStatus(u)}
                                    className={`p-2 rounded-xl transition-colors ${isActive
                                      ? 'text-text-muted hover:text-rose-500 hover:bg-rose-50'
                                      : 'text-text-muted hover:text-emerald-500 hover:bg-emerald-50'
                                      }`}
                                    title={isActive ? 'Deactivate account' : 'Activate account'}
                                  >
                                    {isActive ? <Ban size={15} /> : <Power size={15} />}
                                  </button>
                                  <button
                                    onClick={() => handleResetPassword(u)}
                                    className="p-2 text-text-muted hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-colors"
                                    title="Reset password"
                                  >
                                    <KeyRound size={15} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingUser(u);
                                      setFormData({
                                        fullName: u.fullName,
                                        email: u.email,
                                        phone: (u.phone || '').replace('+252', ''),
                                        password: '',
                                        role: u.role,
                                        district: u.district || '',
                                        gender: u.gender || 'Male'
                                      });
                                      setIsModalOpen(true);
                                    }}
                                    className="p-2 text-text-muted hover:text-navy hover:bg-table-header-bg rounded-xl transition-colors"
                                    title="Edit user"
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(u._id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                    title="Delete user"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4">
          <div className="bg-card-bg rounded-[24px] w-full max-w-2xl shadow-2xl overflow-hidden border border-border-color">
            <div className="px-8 py-6 border-b border-border-color flex items-center justify-between">
              <h2 className="text-[18px] font-black text-navy tracking-tight">
                {editingUser ? 'Edit Personnel' : `Register New ${mode.toUpperCase()}`}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-table-header-bg rounded-lg text-text-muted"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Full Name</label>
                    <input
                      type="text" required placeholder="Jamaal Abdi"
                      className="w-full bg-table-header-bg rounded-xl px-5 py-3.5 text-[14px] font-semibold text-navy outline-none"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Email Address</label>
                    <input
                      type="email" required placeholder="j.abdi@gov.so"
                      className="w-full bg-table-header-bg rounded-xl px-5 py-3.5 text-[14px] font-semibold text-navy outline-none"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  {/* Phone */}
                  <div className="space-y-2 col-span-1">
                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Phone Number</label>
                    <div className="flex gap-2">
                      <div className="bg-[#E5E7EB] rounded-xl px-4 py-3.5 text-[14px] font-black text-gray-500 border border-gray-100">
                        +252
                      </div>
                      <input
                        type="text"
                        maxLength={9}
                        placeholder="61XXXXXXX"
                        className="flex-1 bg-table-header-bg rounded-xl px-5 py-3.5 text-[14px] font-semibold text-navy outline-none border border-transparent focus:border-navy/10 transition-all font-mono"
                        value={formData.phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 9) setFormData({ ...formData, phone: val });
                        }}
                        required
                      />
                    </div>
                  </div>
                  {/* Password */}
                  <div className="space-y-2 relative">
                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">
                      {editingUser ? 'Password Protection' : 'Temporary Password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!editingUser}
                        readOnly={!!editingUser}
                        placeholder={editingUser ? "••••••••" : "Temporary password"}
                        className={`w-full rounded-xl px-5 py-3.5 text-[14px] font-semibold pr-12 outline-none border border-transparent transition-all ${editingUser ? 'bg-table-header-bg text-text-muted cursor-not-allowed border-border-color' : 'bg-table-header-bg text-navy'}`}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      {!editingUser && (
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    </div>
                    {!editingUser && (
                      <p className="text-[10px] text-gray-400 font-bold leading-tight mt-1 px-1">
                        8+ chars, Upper, Lower, Num & Special Char
                      </p>
                    )}
                  </div>
                  {/* Gender */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Gender</label>
                    <select
                      className="w-full bg-table-header-bg rounded-xl px-5 py-3.5 text-[14px] font-semibold text-navy outline-none appearance-none"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  {/* Role */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest pl-1">Assigned Role</label>
                    <div className="w-full bg-table-header-bg rounded-xl px-5 py-3.5 text-[14px] font-semibold text-text-muted uppercase">{mode}</div>
                  </div>
                </div>
              </div>

              <div className="px-8 py-6 border-t border-border-color flex justify-end gap-5 bg-table-header-bg/30">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-[14px] font-black text-text-muted hover:text-navy transition-colors">Cancel</button>
                <button type="submit" className="bg-navy text-white font-black text-[14px] px-8 py-2.5 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all">
                  {editingUser ? 'Update Personnel' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-card-bg rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-600 animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-xl font-black text-navy tracking-tight transition-colors">
                  Delete Personnel
                </h3>
              </div>
              <p className="text-[14px] text-text-muted font-bold leading-relaxed transition-colors">
                Are you sure you want to delete this person? This action will permanently remove their data.
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

export default UserManagement;
