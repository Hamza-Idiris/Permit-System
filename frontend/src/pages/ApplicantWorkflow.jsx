import { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import {
  ArrowLeft, Upload, FileText, Check, ShieldCheck,
  Home, CreditCard, Bell, Plus, Menu, X, DollarSign
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';

const ApplicantWorkflow = () => {
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);
  const { wsData } = useWebSocket();
  const { darkMode } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [districts, setDistricts] = useState([]);

  // Payment UI states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [appIdForPayment, setAppIdForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentPhone, setPaymentPhone] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null); // null | 'online' | 'offline'
  const [offlinePin, setOfflinePin] = useState('');

  const [viewingApp, setViewingApp] = useState(null);
  const isReadOnly = viewingApp && viewingApp.status !== 'Returned';

  const [formData, setFormData] = useState({
    fullName: '', phone: '', email: '',
    plotId: '', district: '', buildingCategory: '',
    floors: '', landArea: '', customLandArea: '', totalFee: 0,
    declaration: false
  });

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      const [appRes, distRes] = await Promise.all([
        axios.get('http://localhost:5000/api/permits/my-applications', config),
        axios.get('http://localhost:5000/api/districts', config)
      ]);

      if (appRes.data.success) {
        setApplications(appRes.data.data);
      }
      if (distRes.data.success) {
        setDistricts(distRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchApplications();
    }
  }, [token, fetchApplications]);

  useEffect(() => {
    if (wsData && (wsData.type === 'PERMIT_APPLICATION_UPDATED' || wsData.type === 'GLOBAL_PERMIT_APPLICATION_UPDATED')) {
      fetchApplications();
    }
  }, [wsData, fetchApplications]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('so-SO', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'Approved':
        return { bg: 'bg-[#DEF7EC] text-[#03543F]', dot: 'bg-[#31C48D]' };
      case 'Rejected':
        return { bg: 'bg-[#FDE8E8] text-[#9B1C1C]', dot: 'bg-[#F05252]' };
      default:
        return { bg: 'bg-[#FDF6B2] text-[#723B13]', dot: 'bg-[#E3A008]' };
    }
  };

  const [files, setFiles] = useState({
    nationalId: null, ownershipDocs: null
  });

  const calculateTotalFee = (areaStr, customAreaStr, category, selectedFloors) => {
    let areaValue = 0;
    if (areaStr === 'custom') {
      areaValue = Number(customAreaStr);
    } else {
      areaValue = Number(areaStr);
    }

    const area = isNaN(areaValue) ? 0 : areaValue;
    const floorsNum = isNaN(Number(selectedFloors)) ? 1 : Number(selectedFloors) || 1;

    const cat = category?.toLowerCase() || '';
    if (cat.includes('jiingad') || cat.includes('bulukeeti')) {
      return area * 0.5;
    } else if (cat.includes('dhagax')) {
      return area * 0.6;
    } else if (cat.includes('dabaq')) {
      return (area * 2.5) * floorsNum;
    }
    // Fallback default
    if (area > 0) return area * 0.5;
    return 0;
  };

  const handleFeeUpdate = (newData) => {
    const freshFee = calculateTotalFee(newData.landArea, newData.customLandArea, newData.buildingCategory, newData.floors);

    // NEW LOGIC for resubmissions (Rule 2)
    if (viewingApp) {
      const oldApp = viewingApp.formData;
      const coreChanged =
        newData.buildingCategory !== oldApp.buildingCategory ||
        (newData.landArea === 'custom' ? Number(newData.customLandArea) : Number(newData.landArea)) !== Number(oldApp.landArea) ||
        Number(newData.floors || 1) !== Number(oldApp.floors || 1);

      if (!coreChanged) {
        // Rule 2A: No change in core fields -> Keep original fee
        setFormData({ ...newData, totalFee: oldApp.totalFee });
      } else {
        // Rule 2B: Core fields changed -> Calculate difference (New - Old)
        // Note: We show the fresh fee, but the backend/payment logic would handle the Delta.
        // For display: we use freshFee.
        setFormData({ ...newData, totalFee: freshFee });
      }
    } else {
      setFormData({ ...newData, totalFee: freshFee });
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newFormData = { ...formData, [name]: type === 'checkbox' ? checked : value };
    if (name === 'buildingCategory' && value !== 'Dabaq') {
      newFormData.floors = '';
    }
    if (name === 'landArea' && value !== 'custom') {
      newFormData.customLandArea = '';
    }
    handleFeeUpdate(newFormData);
  };

  const handleFileUpload = (e, fileType) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) setFiles({ ...files, [fileType]: uploadedFile });
  };

  const isFormValid = () => {
    const requiredText = ['fullName', 'phone', 'email', 'plotId', 'district', 'buildingCategory', 'landArea'];
    let textValid = requiredText.every(field => formData[field] && formData[field].toString().trim() !== '');
    if (formData.landArea === 'custom' && (!formData.customLandArea || formData.customLandArea.toString().trim() === '')) {
      textValid = false;
    }
    if (formData.buildingCategory === 'Dabaq' && (!formData.floors || formData.floors.toString().trim() === '')) {
      textValid = false;
    }
    const filesValid = files.nationalId && files.ownershipDocs;
    return textValid && filesValid && formData.declaration;
  };

  const executeFormSubmission = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'landArea' && formData.landArea === 'custom') {
          payload.append('landArea', formData.customLandArea);
        } else if (key !== 'customLandArea' && key !== 'declaration') {
          payload.append(key, formData[key]);
        }
      });
      if (files.nationalId) payload.append('nationalId', files.nationalId);
      if (files.ownershipDocs) payload.append('ownershipDocs', files.ownershipDocs);

      const config = { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` } };

      let res;
      if (viewingApp) {
        res = await axios.put(`http://localhost:5000/api/permits/${viewingApp._id}`, payload, config);
      } else {
        res = await axios.post('http://localhost:5000/api/permits/apply', payload, config);
      }

      if (res.data.success) {
        setIsSubmitting(false);
        setShowSuccess(true);
        fetchApplications();
      }
    } catch (err) {
      console.error('Submission failed', err);
      setError('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid() || isReadOnly) return;

    const oldFee = viewingApp ? Number(viewingApp.formData.totalFee) || 0 : 0;
    const diffAmount = formData.totalFee - oldFee;

    // Pay first!
    if (diffAmount > 0.01) {
      setPaymentAmount(diffAmount);
      setPaymentMethod(null);
      setOfflinePin('');
      setPaymentError(null);
      setShowPaymentModal(true);
      return;
    }

    executeFormSubmission();
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentMethod(null);
    setOfflinePin('');
    setPaymentError(null);
  };

  const handlePayment = async () => {
    if (paymentPhone.length < 7) {
      setPaymentError('Please enter a valid number');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);
    try {
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      const response = await axios.post('http://localhost:5000/api/payment/waafi', {
        phone: paymentPhone,
        amount: paymentAmount,
      }, config);

      if (response.data.success) {
        setIsProcessingPayment(false);
        closePaymentModal();
        // After successful payment, submit the actual form!
        executeFormSubmission();
      } else {
        setPaymentError(response.data.message || 'An error occurred. Please try again.');
        setIsProcessingPayment(false);
      }
    } catch (err) {
      setPaymentError(err.response?.data?.message || 'Something went wrong during payment. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const handleOfflinePayment = async () => {
    if (!/^\d{4}$/.test(offlinePin)) {
      setPaymentError('Enter a valid 4-digit PIN');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);
    try {
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      const response = await axios.post('http://localhost:5000/api/payment/offline', {
        pin: offlinePin,
        amount: paymentAmount,
        phone: paymentPhone || formData.phone || user?.phone,
      }, config);

      if (response.data.success) {
        setIsProcessingPayment(false);
        closePaymentModal();
        executeFormSubmission();
      } else {
        setPaymentError(response.data.message || 'Payment failed');
        setOfflinePin('');
        setIsProcessingPayment(false);
      }
    } catch (err) {
      setPaymentError(err.response?.data?.message || 'Something went wrong during payment. Please try again.');
      setOfflinePin('');
      setIsProcessingPayment(false);
    }
  };

  const openApplication = (app) => {
    setViewingApp(app);
    setFormData({
      ...app.formData,
      customLandArea: app.formData.landArea,
      landArea: [100, 200, 300, 600].includes(Number(app.formData.landArea)) ? app.formData.landArea.toString() : 'custom',
      declaration: true
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setViewingApp(null);
    setFormData({
      fullName: '', phone: '', email: '',
      plotId: '', district: '', buildingCategory: '',
      floors: '', landArea: '', customLandArea: '', totalFee: 0,
      declaration: false
    });
    setFiles({ nationalId: null, ownershipDocs: null });
  };

  const closeSuccess = () => {
    setShowSuccess(false);
    setShowForm(false);
  };

  return (
    <div className="flex h-screen bg-bg-soft overflow-hidden text-text-main relative transition-colors duration-300">

      {/* Mobile Dark Overlay */}
      {!showForm && isMobileMenuOpen && (
        <div className="fixed inset-0 bg-navy/60 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar Navigation */}
      {!showForm && (
        <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      )}

      <main className="flex-1 flex flex-col overflow-y-auto w-full">
        {!showForm ? (
          <>
            <TopHeader
              breadcrumbs={['Applicant', 'Workflow']}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              placeholder="Search your applications..."
            />

            <div className="p-4 lg:p-8 w-full max-w-[1100px] mx-auto space-y-8 flex-1">
              {/* Welcome Back Card */}
              <div className="bg-card-bg rounded-2xl p-8 md:p-10 lg:p-12 border border-border-color shadow-sm flex flex-col md:flex-row items-center justify-between mt-2 gap-8 transition-all hover:shadow-md">
                <div className="max-w-[540px] text-center md:text-left">
                  <h2 className="text-2xl md:text-3xl font-bold text-navy mb-3 tracking-tight">
                    Welcome, {user?.fullName?.split(' ')[0] || 'Citizen'}
                  </h2>
                  <p className="text-[15px] text-text-muted leading-relaxed font-medium">
                    Start your building permit application to get quick approval for your projects.
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full md:w-auto flex justify-center items-center bg-navy text-white px-8 py-4 rounded-xl text-sm font-bold gap-3 transition-all shadow-lg shadow-navy/20 hover:brightness-110 hover:-translate-y-0.5 shrink-0"
                >
                  <Plus size={20} strokeWidth={3} /> Apply for New Permit
                </button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.1em]">Recent Applications</h3>
                  <button className="text-[12px] font-bold text-navy hover:underline tracking-wide">View All</button>
                </div>
                <div className="bg-card-bg rounded-2xl border border-border-color overflow-x-auto shadow-sm">
                  <table className="w-full min-w-[700px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-color bg-table-header-bg/30">
                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.1em]">Building Type</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.1em]">Date</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.1em]">Application ID</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.1em]">Status</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color bg-card-bg">
                      {loading ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-10 text-center text-text-muted font-medium italic text-[13px]">Loading data...</td>
                        </tr>
                      ) : applications.filter(app =>
                        app.applicationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        app.formData.buildingCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        app.formData.district.toLowerCase().includes(searchTerm.toLowerCase())
                      ).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-10 text-center text-text-muted font-black italic text-[13px] opacity-40">No applications found</td>
                        </tr>
                      ) : (
                        applications.filter(app =>
                          app.applicationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          app.formData.buildingCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          app.formData.district.toLowerCase().includes(searchTerm.toLowerCase())
                        ).map(app => {
                          const styles = getStatusStyles(app.status);
                          return (
                            <tr key={app._id} className="hover:bg-table-header-bg/50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-bold text-text-main text-[13px] mb-1">{app.formData.buildingCategory}</p>
                                <p className="text-[11px] text-text-muted italic">{app.formData.district} District</p>
                              </td>
                              <td className="px-6 py-4 font-semibold text-text-main text-[13px]">{formatDate(app.createdAt)}</td>
                              <td className="px-6 py-4 text-text-muted text-[13px] font-medium">{app.applicationId}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex w-max items-center gap-1.5 ${styles.bg}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}></span>
                                  {app.status === 'Pending' ? 'Pending' : app.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => openApplication(app)}
                                  className="text-[12px] font-black text-navy px-3 py-1 bg-navy/5 rounded-lg hover:bg-navy hover:text-white transition-all shadow-sm"
                                >
                                  {app.status === 'Returned' ? 'Modify' : 'View Details'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <footer className="pt-12 lg:pt-16 pb-6 flex flex-col sm:flex-row gap-4 sm:gap-0 justify-between sm:items-center justify-center text-center border-t border-border-color mt-12 text-[10px] font-semibold text-text-muted">
                <p>© 2026 Mogadishu Municipality. Urban Planning & Building Department.</p>
              </footer>
            </div>
          </>
        ) : (
          <>
            <header className="w-full bg-card-bg border-b border-border-color px-4 lg:px-8 h-[72px] flex justify-between items-center sticky top-0 z-50 shrink-0 shadow-sm overflow-x-auto">
              <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                <div className="w-8 h-8 bg-navy/5 text-navy rounded-md flex items-center justify-center font-bold text-[13px] shadow-sm"><Home size={16} /></div>
                <h1 className="font-bold text-[14px] text-navy tracking-wide whitespace-nowrap">Mogadishu Citizen Portal</h1>
              </div>
              <div className="flex items-center gap-6 lg:gap-8 text-[11px] lg:text-[12px] font-semibold text-text-muted tracking-wide pl-4 lg:pl-0 shrink-0">
                <button onClick={closeForm} className="hover:text-navy transition-colors whitespace-nowrap">Dashboard</button>
                <button className="text-text-muted/50 hidden md:block">Services</button>
                <button className="text-text-muted whitespace-nowrap">My Applications</button>
              </div>
            </header>

            <div className="p-4 sm:p-6 lg:p-8 w-full max-w-[880px] mx-auto pb-24">
              <div className="mb-8">
                <h1 className="text-[22px] lg:text-[26px] font-bold text-navy tracking-tight mb-2">Building Permit Application</h1>
                <p className="text-[13px] lg:text-[14px] text-text-muted font-medium leading-relaxed">Please verify that all information you enter below is accurate</p>
              </div>

              {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 text-[13px] font-bold border border-red-100">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">

                {/* 1. Applicant Info */}
                <section className="bg-card-bg rounded-2xl shadow-sm border border-border-color overflow-hidden">
                  <div className="bg-table-header-bg border-b border-navy/10 px-6 py-4 flex items-center gap-3">
                    <div className="text-navy"><FileText size={18} /></div>
                    <h2 className="font-bold text-[14px] text-navy tracking-wide">1. Applicant Information</h2>
                  </div>
                  <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-y-6 lg:gap-y-8 gap-x-8">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-[12px] font-bold text-navy mb-2">Full Name</label>
                      <input disabled={isReadOnly} type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Enter your full name" className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-md focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium text-text-main shadow-sm transition-shadow disabled:opacity-50" required />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-navy mb-2">Phone Number</label>
                      <input disabled={isReadOnly} type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+252 XXXXXXX" className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-md focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium text-text-main shadow-sm transition-shadow disabled:opacity-50" required />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-navy mb-2">Email Address</label>
                      <input disabled={isReadOnly} type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@example.com" className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-md focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium text-text-main shadow-sm transition-shadow disabled:opacity-50" required />
                    </div>
                  </div>
                </section>

                {/* 2. Project Details */}
                <section className="bg-card-bg rounded-2xl shadow-sm border border-border-color overflow-hidden">
                  <div className="bg-table-header-bg border-b border-navy/10 px-6 py-4 flex items-center gap-3">
                    <div className="text-navy"><Home size={18} /></div>
                    <h2 className="font-bold text-[14px] text-navy tracking-wide">2. Project Details</h2>
                  </div>
                  <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-y-6 lg:gap-y-8 gap-x-6">
                    <div>
                      <label className="block text-[12px] font-bold text-navy mb-2">Plot ID</label>
                      <input disabled={isReadOnly} type="text" name="plotId" value={formData.plotId} onChange={handleChange} placeholder="Enter plot ID" className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-md focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium text-text-main shadow-sm disabled:opacity-50" required />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-navy mb-2">District</label>
                      <select disabled={isReadOnly} name="district" value={formData.district} onChange={handleChange} className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-md focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none text-text-main font-medium shadow-sm disabled:opacity-50" required>
                        <option value="">Select District</option>
                        {districts.map(d => (
                          <option key={d._id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-navy mb-2">Land Size</label>
                      <select disabled={isReadOnly} name="landArea" value={formData.landArea} onChange={handleChange} className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-md focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none text-text-main font-medium shadow-sm mb-3 disabled:opacity-50" required>
                        <option value="">Select land size</option>
                        <option value="100">Quarter (100 SQM)</option>
                        <option value="200">Half Plot (200 SQM)</option>
                        <option value="300">Full Plot (300 SQM)</option>
                        <option value="600">2 Plots (600 SQM)</option>
                        <option value="custom">+ Custom</option>
                      </select>

                      {formData.landArea === 'custom' && (
                        <div className="relative animate-in slide-in-from-top-2 duration-300">
                          <input disabled={isReadOnly} type="number" name="customLandArea" value={formData.customLandArea} onChange={handleChange} placeholder="Enter SQM" className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-md focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium text-text-main shadow-sm pr-12 disabled:opacity-50" required />
                          <span className="absolute right-4 top-[14px] text-[10px] text-text-muted font-bold uppercase tracking-widest">sqm</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-navy mb-2">Building Type</label>
                      <select disabled={isReadOnly} name="buildingCategory" value={formData.buildingCategory} onChange={handleChange} className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-md focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none text-text-main font-medium shadow-sm mb-3 disabled:opacity-50" required>
                        <option value="">Select type</option>
                        <option value="Jiingad">Jiingad</option>
                        <option value="Villa (Bulukeeti)">Villa (Bulukeeti)</option>
                        <option value="Villa (Dhagax)">Villa (Dhagax)</option>
                        <option value="Dabaq">Dabaq</option>
                      </select>

                      {formData.buildingCategory === 'Dabaq' && (
                        <div className="animate-in slide-in-from-top-2 duration-300">
                          <input disabled={isReadOnly} type="number" name="floors" value={formData.floors} onChange={handleChange} placeholder="Number of floors" className="w-full p-3 text-[14px] bg-card-bg border border-border-color rounded-md focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-medium text-text-main shadow-sm disabled:opacity-50" required min="1" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fee Calculation Display */}
                  <div className="bg-navy text-white p-6 md:p-8 m-4 sm:m-6 lg:m-8 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-full flex justify-center items-center backdrop-blur-sm shadow-inner shrink-0">
                        <DollarSign size={24} className="text-[#a5c6ff]" />
                      </div>
                      <div>
                        <h3 className="text-[13px] font-bold text-[#a5c6ff] uppercase tracking-wider mb-1">
                          {viewingApp ? 'Calculated Fee' : 'Total Fee'}
                        </h3>
                        {viewingApp ? (
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-500/30">
                              Already Paid: ${viewingApp.formData.totalFee.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-300 opacity-90 max-w-[200px] leading-relaxed hidden md:block">Fee is calculated automatically based on land size and building type.</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl md:text-5xl font-black tabular-nums tracking-tighter">
                        ${formData.totalFee.toFixed(2)}
                      </div>
                      {viewingApp && formData.totalFee > viewingApp.formData.totalFee && (
                        <div className="text-[11px] font-bold text-amber-400 mt-1 uppercase tracking-widest">
                          + ${(formData.totalFee - viewingApp.formData.totalFee).toFixed(2)} Difference to Pay
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* 3. Document Upload Section */}
                <section className="bg-card-bg rounded-2xl shadow-sm border border-border-color overflow-hidden">
                  <div className="bg-table-header-bg border-b border-navy/10 px-6 py-4 flex items-center gap-3">
                    <div className="text-navy"><Upload size={18} /></div>
                    <h2 className="font-bold text-[14px] text-navy tracking-wide">3. Document Submission</h2>
                  </div>
                  <div className="p-4 sm:p-6 lg:p-8 space-y-4 lg:space-y-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 border border-gray-200 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.02)] gap-4 sm:gap-0">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-md flex items-center justify-center text-[#002147] bg-[#002147]/5 shrink-0"><FileText size={18} /></div>
                        <div>
                          <p className="font-bold text-[13px] text-gray-800 tracking-wide">Passport or National ID <span className="text-red-500">*</span></p>
                          <p className="text-[11px] text-gray-400 font-medium mt-1 leading-snug break-words max-w-[200px] sm:max-w-none">{files.nationalId ? files.nationalId.name : 'Upload PDF, JPEG, or PNG'}</p>
                        </div>
                      </div>
                      <label className="cursor-pointer bg-white text-[#002147] font-bold text-[12px] px-5 py-2.5 rounded-md flex items-center justify-center gap-2 transition-colors border border-gray-200 hover:bg-gray-50 shadow-sm tracking-wide w-full sm:w-auto">
                        <Upload size={14} strokeWidth={2.5} /> {files.nationalId ? 'Replace' : 'Upload'}
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(e, 'nationalId')} />
                      </label>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 border border-gray-200 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.02)] gap-4 sm:gap-0">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-md flex items-center justify-center text-[#002147] bg-[#002147]/5 shrink-0"><FileText size={18} /></div>
                        <div>
                          <p className="font-bold text-[13px] text-gray-800 tracking-wide">Land Ownership Document <span className="text-red-500">*</span></p>
                          <p className="text-[11px] text-gray-400 font-medium mt-1 leading-snug break-words max-w-[200px] sm:max-w-none">{files.ownershipDocs ? files.ownershipDocs.name : 'Upload ownership document (PDF)'}</p>
                        </div>
                      </div>
                      <label className="cursor-pointer bg-white text-[#002147] font-bold text-[12px] px-5 py-2.5 rounded-md flex items-center justify-center gap-2 transition-colors border border-gray-200 hover:bg-gray-50 shadow-sm tracking-wide w-full sm:w-auto">
                        <Upload size={14} strokeWidth={2.5} /> {files.ownershipDocs ? 'Replace' : 'Upload'}
                        <input type="file" className="hidden" accept=".pdf" onChange={(e) => handleFileUpload(e, 'ownershipDocs')} />
                      </label>
                    </div>
                  </div>
                </section>

                <section className="bg-card-bg rounded-2xl shadow-sm border border-border-color overflow-hidden mb-12">
                  <div className="bg-table-header-bg border-b border-navy/10 px-6 py-4 flex items-center gap-3">
                    <div className="text-navy"><ShieldCheck size={18} /></div>
                    <h2 className="font-bold text-[14px] text-navy tracking-wide">4. Declaration & Signature</h2>
                  </div>
                  <div className="p-4 sm:p-6 lg:p-8">
                    {viewingApp && viewingApp.staffRemarks && (
                      <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800">
                        <h4 className="font-bold text-[13px] mb-1">Staff Remarks:</h4>
                        <p className="text-[14px]">{viewingApp.staffRemarks}</p>
                      </div>
                    )}
                    <label className="flex items-start gap-4 cursor-pointer p-4 border border-gray-100 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <input disabled={isReadOnly} type="checkbox" name="declaration" checked={formData.declaration} onChange={handleChange} className="w-[18px] h-[18px] mt-[1px] rounded text-[#002147] focus:ring-[#002147] border-gray-300 disabled:opacity-50" />
                      <span className="text-[13px] text-gray-600 leading-relaxed font-medium block">
                        I declare that all information provided is accurate. I understand that false information may result in rejection or legal action.
                      </span>
                    </label>

                    <div className="mt-8 border-[1.5px] border-dashed border-navy/30 rounded-xl p-8 lg:p-12 flex flex-col items-center justify-center bg-table-header-bg/50">
                      <div className="text-navy/40 mb-3"><ShieldCheck size={32} /></div>
                      <p className="text-[10px] lg:text-[11px] font-bold text-navy/60 uppercase tracking-widest mb-6 text-center">Enter your signature</p>
                      <div className="w-full max-w-[400px] h-20 bg-card-bg border border-border-color rounded-lg shadow-sm"></div>
                    </div>
                  </div>
                </section>

                <div className="flex flex-col lg:flex-row justify-between items-center bg-card-bg p-4 lg:p-6 rounded-2xl border border-border-color shadow-sm sticky bottom-0 lg:bottom-6 z-50 mt-12 gap-4 lg:gap-0 transition-colors duration-300">
                  <button type="button" onClick={closeForm} className="w-full lg:w-auto justify-center font-bold text-[13px] text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-2"><ArrowLeft size={16} strokeWidth={2.5} /> Back to Dashboard</button>

                  {!isReadOnly && (
                    <div className="flex flex-row w-full lg:w-auto gap-2 sm:gap-4">
                      <button type="button" className="flex-1 lg:flex-none px-4 lg:px-6 py-3 text-[13px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors shadow-sm">Save</button>
                      <button
                        type="submit"
                        disabled={!isFormValid() || isSubmitting}
                        className="flex-[2] lg:flex-none justify-center px-4 lg:px-8 py-3 text-[13px] font-bold text-white bg-navy hover:brightness-110 rounded-md shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 tracking-wide"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Application'}
                      </button>
                    </div>
                  )}
                </div>

              </form>
            </div>
          </>
        )}
      </main>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-navy/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card-bg rounded-2xl w-full max-w-md p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300 border border-border-color">
            {!paymentMethod ? (
              <>
                <h2 className="text-[24px] font-bold text-navy mb-2">Choose Payment Method</h2>
                <p className="text-[13px] text-text-muted mb-6">Amount to pay: <strong className="text-navy font-black">${paymentAmount.toFixed(2)}</strong></p>
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
                  <button type="button" onClick={closePaymentModal} className="w-full text-text-muted font-bold py-2 text-[13px]">
                    Cancel
                  </button>
                </div>
              </>
            ) : paymentMethod === 'offline' ? (
              <>
                <h2 className="text-[24px] font-bold text-navy mb-2">Enter Payment PIN</h2>
                <p className="text-[13px] text-text-muted mb-6">Amount to pay: <strong className="text-navy font-black">${paymentAmount.toFixed(2)}</strong></p>

                {paymentError && <div className="bg-red-50 text-red-600 p-3 mb-4 rounded flex items-start text-sm font-bold">{paymentError}</div>}

                <div className="mb-6">
                  <label className="block text-left text-[12px] font-bold text-navy mb-2">4-Digit PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={offlinePin}
                    onChange={e => setOfflinePin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    autoFocus
                    className="w-full p-3 text-[24px] tracking-[0.5em] bg-card-bg border border-border-color rounded-lg focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-bold text-text-main shadow-sm text-center"
                    placeholder="••••"
                  />
                </div>

                <div className="flex gap-3 mt-8">
                  <button type="button" onClick={() => { setPaymentMethod(null); setPaymentError(null); setOfflinePin(''); }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 text-[13px] rounded-lg transition-colors shadow-sm">Back</button>
                  <button
                    type="button"
                    onClick={handleOfflinePayment}
                    disabled={isProcessingPayment}
                    className="flex-[2] bg-navy hover:brightness-110 text-white font-bold py-3 text-[13px] rounded-lg transition-colors shadow-lg disabled:opacity-50"
                  >
                    {isProcessingPayment ? 'Submitting...' : 'Pay Now'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-[24px] font-bold text-navy mb-2">Payment (EVC Plus)</h2>
                <p className="text-[13px] text-text-muted mb-6">Amount to pay: <strong className="text-navy font-black">${paymentAmount.toFixed(2)}</strong></p>

                {paymentError && <div className="bg-red-50 text-red-600 p-3 mb-4 rounded flex items-start text-sm font-bold">{paymentError}</div>}

                <div className="mb-6">
                  <label className="block text-left text-[12px] font-bold text-navy mb-2">EVC Plus Number</label>
                  <div className="flex gap-2">
                    <span className="p-3 bg-gray-100 rounded-lg text-gray-700 font-bold border border-border-color">+252</span>
                    <input
                      type="tel"
                      value={paymentPhone}
                      onChange={e => setPaymentPhone(e.target.value)}
                      placeholder="61XXXXXXX"
                      autoFocus
                      className="w-full flex-1 p-3 text-[16px] tracking-wider bg-card-bg border border-border-color rounded-lg focus:ring-2 focus:ring-navy/20 focus:border-navy outline-none font-bold text-text-main shadow-sm text-center"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button type="button" onClick={() => { setPaymentMethod(null); setPaymentError(null); }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 text-[13px] rounded-lg transition-colors shadow-sm">Back</button>
                  <button
                    type="button"
                    onClick={handlePayment}
                    disabled={isProcessingPayment}
                    className="flex-[2] bg-navy hover:brightness-110 text-white font-bold py-3 text-[13px] rounded-lg transition-colors shadow-lg disabled:opacity-50"
                  >
                    {isProcessingPayment ? 'Submitting...' : 'Pay Now'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 bg-navy/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card-bg rounded-2xl w-full max-w-md p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
              <Check size={40} strokeWidth={3} />
            </div>
            <h2 className="text-[24px] font-bold text-navy mb-3">Application Submitted!</h2>
            <p className="text-[14px] text-text-muted mb-10 font-medium leading-relaxed px-4">Your building permit application has been successfully submitted to Mogadishu Municipality.</p>
            <button
              onClick={closeSuccess}
              className="w-full bg-navy hover:brightness-110 text-white text-[14px] font-bold py-4 rounded-lg transition-colors shadow-lg tracking-wide"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ApplicantWorkflow;
