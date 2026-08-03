import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Upload, FileText, Check, ShieldCheck, Home,
  DollarSign, Search, UserPlus, User, CreditCard
} from 'lucide-react';

const PLOT_SIZES = [
  { label: 'Rubac (10x10)', area: 100 },
  { label: 'Nus (10x20)', area: 200 },
  { label: 'Boos (20x20)', area: 400 },
  { label: '2 Boos (20x40)', area: 800 },
  { label: 'Custom', area: null },
];

const API = 'http://localhost:5000/api';

const StaffNewApplication = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Applicant selection
  const [applicantMode, setApplicantMode] = useState('search'); // search | walkin
  const [applicantSearch, setApplicantSearch] = useState('');
  const [applicantResults, setApplicantResults] = useState([]);
  const [searchingApplicants, setSearchingApplicants] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [walkIn, setWalkIn] = useState({ fullName: '', email: '', phone: '', gender: 'Male' });

  // Form
  const [plotId, setPlotId] = useState('');
  const [district, setDistrict] = useState(user?.district || '');
  const [districts, setDistricts] = useState([]);
  const [requestType, setRequestType] = useState('New Construction');
  const [plotSize, setPlotSize] = useState('');
  const [customWidth, setCustomWidth] = useState('');
  const [customLength, setCustomLength] = useState('');
  const [buildingCategory, setBuildingCategory] = useState('');
  const [floors, setFloors] = useState('1');
  const [buildingTypes, setBuildingTypes] = useState([]);
  const [renovationTypes, setRenovationTypes] = useState([]);
  const [files, setFiles] = useState({ nationalId: null, ownershipDocs: null });
  const [declaration, setDeclaration] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdAppId, setCreatedAppId] = useState(null);

  // Payment
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [offlinePin, setOfflinePin] = useState('');

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token || localStorage.getItem('token')}` }),
    [token]
  );

  const typeList = requestType === 'New Construction' ? buildingTypes : renovationTypes;
  const selectedType = typeList.find(t => t.name === buildingCategory);
  const isPerFloor = Boolean(selectedType?.isPerFloor);

  const landArea = useMemo(() => {
    if (plotSize === 'Custom') {
      const w = Number(customWidth) || 0;
      const l = Number(customLength) || 0;
      return w * l;
    }
    const preset = PLOT_SIZES.find(p => p.label === plotSize);
    return preset?.area || 0;
  }, [plotSize, customWidth, customLength]);

  const totalFee = useMemo(() => {
    if (!selectedType || landArea <= 0) return 0;
    const multiplier = Number(selectedType.feeMultiplier) || 0;
    const floorCount = Math.max(1, Number(floors) || 1);
    return isPerFloor ? landArea * multiplier * floorCount : landArea * multiplier;
  }, [selectedType, landArea, floors, isPerFloor]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [distRes, buildRes, renoRes] = await Promise.all([
          axios.get(`${API}/districts`, { headers: authHeaders }),
          axios.get(`${API}/building-types`),
          axios.get(`${API}/renovation-types`),
        ]);
        if (distRes.data.success) setDistricts(distRes.data.data || []);
        if (buildRes.data.success) setBuildingTypes(buildRes.data.data || []);
        if (renoRes.data.success) setRenovationTypes(renoRes.data.data || []);
      } catch (err) {
        console.error('Failed to load lookups', err);
      }
    };
    loadLookups();
  }, [authHeaders]);

  useEffect(() => {
    if (user?.district && user.role === 'staff') {
      setDistrict(user.district);
    }
  }, [user]);

  useEffect(() => {
    setBuildingCategory('');
  }, [requestType]);

  const searchApplicants = useCallback(async (term) => {
    if (!term || term.trim().length < 2) {
      setApplicantResults([]);
      return;
    }
    setSearchingApplicants(true);
    try {
      const { data } = await axios.get(`${API}/users/applicants`, {
        headers: authHeaders,
        params: { search: term.trim() }
      });
      setApplicantResults(data.data || []);
    } catch (err) {
      console.error('Applicant search failed', err);
      setApplicantResults([]);
    } finally {
      setSearchingApplicants(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (applicantMode === 'search') searchApplicants(applicantSearch);
    }, 350);
    return () => clearTimeout(t);
  }, [applicantSearch, applicantMode, searchApplicants]);

  const selectApplicant = (applicant) => {
    setSelectedApplicant(applicant);
    setApplicantSearch(applicant.fullName);
    setApplicantResults([]);
    const phoneDigits = (applicant.phone || '').replace(/^\+252/, '');
    setPaymentPhone(phoneDigits);
  };

  const isFormValid = () => {
    const hasApplicant = applicantMode === 'search'
      ? Boolean(selectedApplicant)
      : Boolean(walkIn.fullName && walkIn.email && walkIn.phone && walkIn.gender);

    if (!hasApplicant) return false;
    if (!plotId.trim() || !district || !plotSize || !buildingCategory) return false;
    if (plotSize === 'Custom' && (!customWidth || !customLength)) return false;
    if (isPerFloor && !floors) return false;
    if (!files.nationalId || !files.ownershipDocs) return false;
    if (!declaration || totalFee <= 0) return false;
    return true;
  };

  const resolveApplicantId = async () => {
    if (applicantMode === 'search') {
      if (!selectedApplicant?._id) throw new Error('Please select an applicant');
      return selectedApplicant;
    }

    const phone = walkIn.phone.startsWith('+252')
      ? walkIn.phone
      : `+252${walkIn.phone.replace(/^\+?252/, '')}`;

    const { data } = await axios.post(`${API}/users/walk-in`, {
      fullName: walkIn.fullName.trim(),
      email: walkIn.email.trim(),
      phone,
      gender: walkIn.gender
    }, { headers: authHeaders });

    if (!data.success) throw new Error(data.message || 'Failed to register applicant');
    setSelectedApplicant(data.data);
    return data.data;
  };

  const submitApplication = async (applicant) => {
    const payload = new FormData();
    payload.append('applicantId', applicant._id);
    payload.append('fullName', applicant.fullName);
    payload.append('phone', applicant.phone);
    payload.append('email', applicant.email);
    payload.append('plotId', plotId.trim());
    payload.append('district', district);
    payload.append('requestType', requestType);
    payload.append('buildingCategory', buildingCategory);
    payload.append('floors', isPerFloor ? floors : '1');
    payload.append('landArea', String(landArea));
    payload.append('totalFee', String(totalFee));
    payload.append('nationalId', files.nationalId);
    payload.append('ownershipDocs', files.ownershipDocs);

    const { data } = await axios.post(`${API}/permits/apply`, payload, {
      headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' }
    });

    if (!data.success) throw new Error(data.message || 'Submission failed');
    return data.data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid() || isSubmitting) return;
    setError(null);

    // Pay first (same as mobile)
    setPaymentMethod(null);
    setOfflinePin('');
    setPaymentError(null);
    setShowPaymentModal(true);
    if (!paymentPhone && selectedApplicant?.phone) {
      setPaymentPhone(selectedApplicant.phone.replace(/^\+252/, ''));
    } else if (!paymentPhone && walkIn.phone) {
      setPaymentPhone(walkIn.phone.replace(/^\+?252/, ''));
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentMethod(null);
    setOfflinePin('');
    setPaymentError(null);
  };

  const finishAfterPayment = async () => {
    const applicant = await resolveApplicantId();
    const app = await submitApplication(applicant);
    setCreatedAppId(app.applicationId);
    closePaymentModal();
    setShowSuccess(true);
  };

  const handlePaymentAndSubmit = async () => {
    if (paymentPhone.replace(/\D/g, '').length < 7) {
      setPaymentError('Please enter a valid payment phone number');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);
    setIsSubmitting(true);
    setError(null);

    try {
      const payPhone = paymentPhone.replace(/^\+?252/, '').replace(/\D/g, '');
      const payRes = await axios.post(`${API}/payment/waafi`, {
        phone: payPhone,
        amount: totalFee,
      }, { headers: authHeaders });

      if (!payRes.data.success) {
        throw new Error(payRes.data.message || 'Payment failed');
      }

      await finishAfterPayment();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong';
      setPaymentError(msg);
      setError(msg);
    } finally {
      setIsProcessingPayment(false);
      setIsSubmitting(false);
    }
  };

  const handleOfflinePaymentAndSubmit = async () => {
    if (!/^\d{4}$/.test(offlinePin)) {
      setPaymentError('Enter a valid 4-digit PIN');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);
    setIsSubmitting(true);
    setError(null);

    try {
      const payPhone = paymentPhone.replace(/^\+?252/, '').replace(/\D/g, '') || undefined;
      const payRes = await axios.post(`${API}/payment/offline`, {
        pin: offlinePin,
        amount: totalFee,
        phone: payPhone,
      }, { headers: authHeaders });

      if (!payRes.data.success) {
        throw new Error(payRes.data.message || 'Payment failed');
      }

      await finishAfterPayment();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong';
      setPaymentError(msg);
      setError(msg);
      setOfflinePin('');
    } finally {
      setIsProcessingPayment(false);
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedApplicant(null);
    setApplicantSearch('');
    setWalkIn({ fullName: '', email: '', phone: '', gender: 'Male' });
    setPlotId('');
    setPlotSize('');
    setCustomWidth('');
    setCustomLength('');
    setBuildingCategory('');
    setFloors('1');
    setRequestType('New Construction');
    setFiles({ nationalId: null, ownershipDocs: null });
    setDeclaration(false);
    setShowSuccess(false);
    setCreatedAppId(null);
    setError(null);
    if (user?.role === 'staff' && user?.district) setDistrict(user.district);
  };

  const districtLocked = user?.role === 'staff' && Boolean(user?.district);

  return (
    <div className="flex min-h-screen bg-bg-soft font-sans transition-colors duration-300">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader breadcrumbs={['Staff', 'New Application']} />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-[880px] mx-auto pb-16">
            <div className="flex items-start justify-between mb-8 gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-black text-navy tracking-tight mb-1">
                  New Permit Application
                </h1>
                <p className="text-sm text-text-muted font-bold">
                  Create an application for citizens who cannot use the mobile app (counter service).
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/staff/applications')}
                className="flex items-center gap-2 text-[13px] font-bold text-text-muted hover:text-navy transition-colors shrink-0"
              >
                <ArrowLeft size={16} /> Back
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-[13px] font-bold border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Applicant */}
              <section className="bg-card-bg rounded-2xl border border-border-color shadow-sm">
                <div className="bg-table-header-bg border-b border-border-color px-6 py-4 flex items-center gap-3">
                  <User size={18} className="text-navy" />
                  <h2 className="font-bold text-[14px] text-navy tracking-wide">1. Applicant</h2>
                </div>
                <div className="p-6 space-y-5">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setApplicantMode('search'); setSelectedApplicant(null); }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all ${
                        applicantMode === 'search'
                          ? 'bg-navy text-white shadow-md'
                          : 'bg-table-header-bg text-text-muted hover:text-navy'
                      }`}
                    >
                      <Search size={14} /> Find Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => { setApplicantMode('walkin'); setSelectedApplicant(null); setApplicantSearch(''); }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all ${
                        applicantMode === 'walkin'
                          ? 'bg-navy text-white shadow-md'
                          : 'bg-table-header-bg text-text-muted hover:text-navy'
                      }`}
                    >
                      <UserPlus size={14} /> Register Walk-in
                    </button>
                  </div>

                  {applicantMode === 'search' ? (
                    <div className="relative">
                      <label className="block text-[12px] font-bold text-navy mb-2">Search by name, phone, or email</label>
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          value={applicantSearch}
                          onChange={(e) => {
                            setApplicantSearch(e.target.value);
                            setSelectedApplicant(null);
                          }}
                          placeholder="Type at least 2 characters..."
                          className="w-full pl-10 p-3 text-[14px] bg-card-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium"
                        />
                      </div>
                      {searchingApplicants && (
                        <p className="text-[11px] text-text-muted mt-2 font-bold">Searching...</p>
                      )}
                      {applicantResults.length > 0 && !selectedApplicant && (
                        <div className="absolute z-20 mt-1 w-full bg-card-bg border border-border-color rounded-xl shadow-lg max-h-56 overflow-y-auto">
                          {applicantResults.map((a) => (
                            <button
                              key={a._id}
                              type="button"
                              onClick={() => selectApplicant(a)}
                              className="w-full text-left px-4 py-3 hover:bg-table-header-bg border-b border-border-color last:border-0 transition-colors"
                            >
                              <p className="text-[13px] font-bold text-navy">{a.fullName}</p>
                              <p className="text-[11px] text-text-muted font-medium">{a.phone} · {a.email}</p>
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedApplicant && (
                        <div className="mt-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-black">
                            {selectedApplicant.fullName?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-black text-navy">{selectedApplicant.fullName}</p>
                            <p className="text-[11px] text-text-muted font-bold">{selectedApplicant.phone} · {selectedApplicant.email}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="md:col-span-2">
                        <label className="block text-[12px] font-bold text-navy mb-2">Full Name</label>
                        <input
                          type="text"
                          value={walkIn.fullName}
                          onChange={(e) => setWalkIn({ ...walkIn, fullName: e.target.value })}
                          className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium"
                          placeholder="Citizen full name"
                          required={applicantMode === 'walkin'}
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-navy mb-2">Phone (+252...)</label>
                        <input
                          type="tel"
                          value={walkIn.phone}
                          onChange={(e) => setWalkIn({ ...walkIn, phone: e.target.value })}
                          className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium"
                          placeholder="+25261XXXXXXX"
                          required={applicantMode === 'walkin'}
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-navy mb-2">Email</label>
                        <input
                          type="email"
                          value={walkIn.email}
                          onChange={(e) => setWalkIn({ ...walkIn, email: e.target.value })}
                          className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium"
                          placeholder="citizen@email.com"
                          required={applicantMode === 'walkin'}
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-navy mb-2">Gender</label>
                        <select
                          value={walkIn.gender}
                          onChange={(e) => setWalkIn({ ...walkIn, gender: e.target.value })}
                          className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* 2. Project details */}
              <section className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden">
                <div className="bg-table-header-bg border-b border-border-color px-6 py-4 flex items-center gap-3">
                  <Home size={18} className="text-navy" />
                  <h2 className="font-bold text-[14px] text-navy tracking-wide">2. Project Details</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[12px] font-bold text-navy mb-2">Plot Identifier</label>
                    <input
                      type="text"
                      value={plotId}
                      onChange={(e) => setPlotId(e.target.value)}
                      className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium"
                      placeholder="Plot / parcel ID"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-navy mb-2">District</label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      disabled={districtLocked}
                      className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium disabled:opacity-60"
                      required
                    >
                      <option value="">Select district</option>
                      {districts.map((d) => (
                        <option key={d._id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                    {districtLocked && (
                      <p className="text-[10px] text-text-muted font-bold mt-1 uppercase tracking-wider">
                        Locked to your assigned district
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-navy mb-2">Request Type</label>
                    <select
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value)}
                      className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium"
                    >
                      <option value="New Construction">New Construction</option>
                      <option value="Renovation">Renovation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-navy mb-2">
                      {requestType === 'Renovation' ? 'Renovation Type' : 'Architecture Type'}
                    </label>
                    <select
                      value={buildingCategory}
                      onChange={(e) => setBuildingCategory(e.target.value)}
                      className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium"
                      required
                    >
                      <option value="">Select type</option>
                      {typeList.map((t) => (
                        <option key={t._id || t.name} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-navy mb-2">Land Size</label>
                    <select
                      value={plotSize}
                      onChange={(e) => setPlotSize(e.target.value)}
                      className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium mb-3"
                      required
                    >
                      <option value="">Select land size</option>
                      {PLOT_SIZES.map((p) => (
                        <option key={p.label} value={p.label}>{p.label}{p.area ? ` — ${p.area} m²` : ''}</option>
                      ))}
                    </select>
                    {plotSize === 'Custom' && (
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          min="1"
                          value={customWidth}
                          onChange={(e) => setCustomWidth(e.target.value)}
                          placeholder="Width (m)"
                          className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-xl outline-none font-medium"
                          required
                        />
                        <input
                          type="number"
                          min="1"
                          value={customLength}
                          onChange={(e) => setCustomLength(e.target.value)}
                          placeholder="Length (m)"
                          className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-xl outline-none font-medium"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {isPerFloor && (
                    <div>
                      <label className="block text-[12px] font-bold text-navy mb-2">Structural Floors</label>
                      <input
                        type="number"
                        min="1"
                        value={floors}
                        onChange={(e) => setFloors(e.target.value)}
                        className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="bg-navy text-white p-6 m-6 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex justify-center items-center shrink-0">
                      <DollarSign size={24} className="text-[#a5c6ff]" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-bold text-[#a5c6ff] uppercase tracking-wider mb-1">Total Fee</h3>
                      <p className="text-[11px] text-gray-300 opacity-90">
                        {landArea > 0 ? `${landArea} m²` : 'Select land size'} · {buildingCategory || 'Select type'}
                      </p>
                    </div>
                  </div>
                  <div className="text-3xl md:text-5xl font-black tabular-nums tracking-tighter">
                    ${totalFee.toFixed(2)}
                  </div>
                </div>
              </section>

              {/* 3. Documents */}
              <section className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden">
                <div className="bg-table-header-bg border-b border-border-color px-6 py-4 flex items-center gap-3">
                  <Upload size={18} className="text-navy" />
                  <h2 className="font-bold text-[14px] text-navy tracking-wide">3. Documents</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border-color rounded-xl gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md flex items-center justify-center text-navy bg-navy/5 shrink-0">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-[13px] text-text-main">National ID / Passport <span className="text-red-500">*</span></p>
                        <p className="text-[11px] text-text-muted font-medium mt-1">
                          {files.nationalId ? files.nationalId.name : 'PDF, JPG, or PNG'}
                        </p>
                      </div>
                    </div>
                    <label className="cursor-pointer bg-card-bg text-navy font-bold text-[12px] px-5 py-2.5 rounded-lg flex items-center gap-2 border border-border-color hover:bg-table-header-bg shadow-sm w-full sm:w-auto justify-center">
                      <Upload size={14} /> {files.nationalId ? 'Replace' : 'Upload'}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setFiles({ ...files, nationalId: e.target.files?.[0] || null })}
                      />
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border-color rounded-xl gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md flex items-center justify-center text-navy bg-navy/5 shrink-0">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-[13px] text-text-main">Land Ownership Deed <span className="text-red-500">*</span></p>
                        <p className="text-[11px] text-text-muted font-medium mt-1">
                          {files.ownershipDocs ? files.ownershipDocs.name : 'PDF only'}
                        </p>
                      </div>
                    </div>
                    <label className="cursor-pointer bg-card-bg text-navy font-bold text-[12px] px-5 py-2.5 rounded-lg flex items-center gap-2 border border-border-color hover:bg-table-header-bg shadow-sm w-full sm:w-auto justify-center">
                      <Upload size={14} /> {files.ownershipDocs ? 'Replace' : 'Upload'}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf"
                        onChange={(e) => setFiles({ ...files, ownershipDocs: e.target.files?.[0] || null })}
                      />
                    </label>
                  </div>
                </div>
              </section>

              {/* 4. Declaration */}
              <section className="bg-card-bg rounded-2xl border border-border-color shadow-sm overflow-hidden">
                <div className="bg-table-header-bg border-b border-border-color px-6 py-4 flex items-center gap-3">
                  <ShieldCheck size={18} className="text-navy" />
                  <h2 className="font-bold text-[14px] text-navy tracking-wide">4. Declaration</h2>
                </div>
                <div className="p-6">
                  <label className="flex items-start gap-4 cursor-pointer p-4 border border-border-color rounded-xl bg-table-header-bg/40 hover:bg-table-header-bg transition-colors">
                    <input
                      type="checkbox"
                      checked={declaration}
                      onChange={(e) => setDeclaration(e.target.checked)}
                      className="w-[18px] h-[18px] mt-0.5 rounded text-navy focus:ring-navy border-border-color"
                    />
                    <span className="text-[13px] text-text-muted leading-relaxed font-medium">
                      I confirm that the information provided by the citizen is accurate. False information may lead to rejection or legal action.
                    </span>
                  </label>
                </div>
              </section>

              <div className="flex flex-col sm:flex-row justify-between items-center bg-card-bg p-4 lg:p-6 rounded-2xl border border-border-color shadow-lg gap-4 sticky bottom-4 z-40">
                <button
                  type="button"
                  onClick={() => navigate('/staff/applications')}
                  className="w-full sm:w-auto font-bold text-[13px] text-text-muted hover:text-navy transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid() || isSubmitting}
                  className="w-full sm:w-auto justify-center px-8 py-3 text-[13px] font-bold text-white bg-navy hover:brightness-110 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <CreditCard size={16} />
                  {isSubmitting ? 'Submitting...' : `Pay & Submit ($${totalFee.toFixed(2)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-navy/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card-bg rounded-2xl w-full max-w-md p-10 text-center shadow-2xl border border-border-color">
            {!paymentMethod ? (
              <>
                <h2 className="text-[24px] font-bold text-navy mb-2">Choose Payment Method</h2>
                <p className="text-[13px] text-text-muted mb-6">
                  Amount to collect: <strong className="text-navy font-black">${totalFee.toFixed(2)}</strong>
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('online'); setPaymentError(null); }}
                    className="w-full bg-navy hover:brightness-110 text-white font-bold py-3.5 text-[13px] rounded-lg transition-colors shadow-lg"
                  >
                    Online Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('offline'); setPaymentError(null); setOfflinePin(''); }}
                    className="w-full bg-table-header-bg hover:brightness-95 text-navy font-bold py-3.5 text-[13px] rounded-lg transition-colors border border-border-color"
                  >
                    Offline Payment
                  </button>
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    className="w-full text-text-muted font-bold py-2 text-[13px]"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : paymentMethod === 'offline' ? (
              <>
                <h2 className="text-[24px] font-bold text-navy mb-2">Enter Payment PIN</h2>
                <p className="text-[13px] text-text-muted mb-6">
                  Amount to collect: <strong className="text-navy font-black">${totalFee.toFixed(2)}</strong>
                </p>

                {paymentError && (
                  <div className="bg-red-50 text-red-600 p-3 mb-4 rounded-lg text-sm font-bold text-left">{paymentError}</div>
                )}

                <div className="mb-6 text-left">
                  <label className="block text-[12px] font-bold text-navy mb-2">4-Digit PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={offlinePin}
                    onChange={(e) => setOfflinePin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    autoFocus
                    className="w-full p-3 text-[24px] tracking-[0.5em] bg-card-bg border border-border-color rounded-lg focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-bold text-center"
                    placeholder="••••"
                  />
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod(null); setPaymentError(null); setOfflinePin(''); }}
                    className="flex-1 bg-table-header-bg hover:brightness-95 text-text-muted font-bold py-3 text-[13px] rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleOfflinePaymentAndSubmit}
                    disabled={isProcessingPayment}
                    className="flex-[2] bg-navy hover:brightness-110 text-white font-bold py-3 text-[13px] rounded-lg transition-colors shadow-lg disabled:opacity-50"
                  >
                    {isProcessingPayment ? 'Processing...' : 'Collect & Submit'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-[24px] font-bold text-navy mb-2">Payment (EVC Plus)</h2>
                <p className="text-[13px] text-text-muted mb-6">
                  Amount to collect: <strong className="text-navy font-black">${totalFee.toFixed(2)}</strong>
                </p>

                {paymentError && (
                  <div className="bg-red-50 text-red-600 p-3 mb-4 rounded-lg text-sm font-bold text-left">{paymentError}</div>
                )}

                <div className="mb-6 text-left">
                  <label className="block text-[12px] font-bold text-navy mb-2">Citizen EVC Plus Number</label>
                  <div className="flex gap-2">
                    <span className="p-3 bg-table-header-bg rounded-lg text-text-muted font-bold border border-border-color">+252</span>
                    <input
                      type="tel"
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      placeholder="61XXXXXXX"
                      autoFocus
                      className="w-full flex-1 p-3 text-[16px] tracking-wider bg-card-bg border border-border-color rounded-lg focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-bold text-center"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod(null); setPaymentError(null); }}
                    className="flex-1 bg-table-header-bg hover:brightness-95 text-text-muted font-bold py-3 text-[13px] rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handlePaymentAndSubmit}
                    disabled={isProcessingPayment}
                    className="flex-[2] bg-navy hover:brightness-110 text-white font-bold py-3 text-[13px] rounded-lg transition-colors shadow-lg disabled:opacity-50"
                  >
                    {isProcessingPayment ? 'Processing...' : 'Collect & Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 bg-navy/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card-bg rounded-2xl w-full max-w-md p-10 text-center shadow-2xl border border-border-color">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
              <Check size={40} strokeWidth={3} />
            </div>
            <h2 className="text-[24px] font-bold text-navy mb-3">Application Submitted</h2>
            <p className="text-[14px] text-text-muted mb-2 font-medium">
              The permit application was created successfully.
            </p>
            {createdAppId && (
              <p className="text-[13px] font-black text-navy mb-8">#{createdAppId}</p>
            )}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate('/staff/applications')}
                className="w-full bg-navy hover:brightness-110 text-white text-[14px] font-bold py-4 rounded-lg transition-colors shadow-lg"
              >
                Go to Applications
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="w-full bg-table-header-bg hover:brightness-95 text-navy text-[14px] font-bold py-3 rounded-lg transition-colors"
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffNewApplication;
