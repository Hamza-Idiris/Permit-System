import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import AuthContext from '../context/AuthContext';
import {
    ArrowLeft, Bell, Check, X as XIcon, MapPin, Download,
    Eye, FileText, CheckCircle2, ChevronRight, LayoutDashboard,
    ClipboardCheck, Archive, Settings, User, Phone, MapPin as MapPinIcon,
    UserCheck, Edit3
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import LoadingScreen from '../components/LoadingScreen';
import TopHeader from '../components/TopHeader';
import PermitCertificateCard from '../components/PermitCertificateCard';
import { renderPermitCertificateCanvas, downloadCanvasPng } from '../utils/permitCertificate';
import { useTheme } from '../context/ThemeContext';

const StaffReview = () => {
    const { id } = useParams();
    const { user, token } = useContext(AuthContext);
    const { darkMode } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const getBackPath = () => {
        const from = location.state?.from;
        if (typeof from === 'string' && from.startsWith('/')) return from;
        if (user?.role === 'superadmin') return '/admin/all-permits';
        return '/staff/applications';
    };

    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [remarks, setRemarks] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [isExportingCert, setIsExportingCert] = useState(false);
    const certificateRef = useRef(null);

    // Lightbox / Modal State
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isPreviewPdf, setIsPreviewPdf] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Sidebar Mobile State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Reject Form State
    const [showRejectForm, setShowRejectForm] = useState(false);

    const [isEditingExpiry, setIsEditingExpiry] = useState(false);
    const [newExpiryDate, setNewExpiryDate] = useState('');
    const [isUpdatingExpiry, setIsUpdatingExpiry] = useState(false);

    const handleUpdateExpiry = async () => {
        if (!newExpiryDate) {
            setError('Please select a valid expiry date.');
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selected = new Date(newExpiryDate);
        if (selected < today) {
            setError('Expiry date cannot be in the past.');
            return;
        }

        setIsUpdatingExpiry(true);
        setError('');

        try {
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            const res = await axios.put(`http://localhost:5000/api/permits/${id}/expiry`, { expiryDate: newExpiryDate }, config);

            if (res.data.success) {
                setSuccessMsg('Expiry date updated successfully!');
                setApplication(prev => ({
                    ...prev,
                    expiryDate: res.data.data.expiryDate,
                    qrData: res.data.data.qrData
                }));
                setIsEditingExpiry(false);
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            console.error('Failed to update expiry date', err);
            setError(err.response?.data?.message || 'Failed to update expiry date.');
        } finally {
            setIsUpdatingExpiry(false);
        }
    };

    useEffect(() => {
        const fetchApplication = async () => {
            try {
                const config = { headers: { 'Authorization': `Bearer ${token}` } };
                const res = await axios.get(`http://localhost:5000/api/permits/${id}`, config);
                if (res.data.success) {
                    setApplication(res.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch', err);
                setError('Unable to load application data.');
            } finally {
                setLoading(false);
            }
        };
        fetchApplication();
    }, [id, token]);

    useEffect(() => {
        const generateQr = async () => {
            if (application?.status !== 'Approved') {
                setQrDataUrl(null);
                return;
            }
            const payload = application.qrData || application.permitId;
            if (!payload) {
                setQrDataUrl(null);
                return;
            }
            try {
                const url = await QRCode.toDataURL(String(payload), {
                    width: 512,
                    margin: 1,
                    errorCorrectionLevel: 'M',
                    color: {
                        dark: '#0B1F3A',
                        light: '#FFFFFF',
                    },
                });
                setQrDataUrl(url);
            } catch (err) {
                console.error('Failed to generate QR code', err);
                setQrDataUrl(null);
            }
        };
        generateQr();
    }, [application]);

    const handleDownloadQrPng = async () => {
        if (!qrDataUrl || !application) return;
        try {
            setIsExportingCert(true);
            const canvas = await renderPermitCertificateCanvas(application, qrDataUrl);
            downloadCanvasPng(
                canvas,
                `permit_certificate_${application.permitId || application.applicationId || 'approved'}.png`
            );
        } catch (err) {
            console.error('Failed to download certificate PNG', err);
            setError('Failed to download certificate PNG.');
        } finally {
            setIsExportingCert(false);
        }
    };

    const handleDownloadCertificatePdf = async () => {
        if (!qrDataUrl || !application) return;
        try {
            setIsExportingCert(true);
            const canvas = await renderPermitCertificateCanvas(application, qrDataUrl);
            const imgData = canvas.toDataURL('image/png');

            // Portrait page sized to certificate proportions
            const pxToMm = 0.264583;
            const imgWmm = (canvas.width / 2) * pxToMm; // canvas is 2x scale
            const imgHmm = (canvas.height / 2) * pxToMm;
            const margin = 8;
            const pageW = imgWmm + margin * 2;
            const pageH = imgHmm + margin * 2;

            const doc = new jsPDF({
                orientation: pageH >= pageW ? 'portrait' : 'landscape',
                unit: 'mm',
                format: [pageW, pageH],
            });
            doc.addImage(imgData, 'PNG', margin, margin, imgWmm, imgHmm);
            doc.save(`permit-certificate-${application.permitId || application.applicationId || 'approved'}.pdf`);
        } catch (err) {
            console.error('Failed to download certificate PDF', err);
            setError('Failed to download certificate PDF.');
        } finally {
            setIsExportingCert(false);
        }
    };

    const handleDecision = async (status) => {
        if (status === 'Returned' && remarks.trim() === '') {
            setError('Please enter the reason for returning this application.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            const payload = { status, staffRemarks: remarks };
            const res = await axios.put(`http://localhost:5000/api/permits/${id}/review`, payload, config);

            if (res.data.success) {
                setSuccessMsg(`Application ${status === 'Approved' ? 'approved' : 'returned'} successfully!`);
                if (status === 'Approved') {
                    // Stay on page so staff can download QR / PDF certificate
                    setApplication(res.data.data);
                    setShowRejectForm(false);
                    setIsSubmitting(false);
                    setTimeout(() => setSuccessMsg(''), 4000);
                } else {
                    setTimeout(() => {
                        navigate(getBackPath());
                    }, 1800);
                }
            }
        } catch (err) {
            console.error('Failed to submit decision', err);
            setError('An error occurred. Please try again.');
            setIsSubmitting(false);
        }
    };

    const openPreview = async (docPath) => {
        const fileUrl = `http://localhost:5000${docPath}`;
        const isPdf = fileUrl.toLowerCase().endsWith('.pdf');
        setIsPreviewPdf(isPdf);

        if (isPdf) {
            try {
                // Completely evade IDM by fetching as a generic binary stream
                const fetchUrl = `http://localhost:5000/api/stream-pdf?file=${encodeURIComponent(docPath)}`;
                const response = await fetch(fetchUrl);

                if (!response.ok) throw new Error('Network response failed');

                // Read as generic blob, then cast it back to PDF so the browser can read it
                const rawBlob = await response.blob();
                const pdfBlob = new Blob([rawBlob], { type: 'application/pdf' });

                // Create a safe localhost blob: URL
                const blobUrl = URL.createObjectURL(pdfBlob);

                setPreviewUrl(blobUrl);
                setIsPreviewOpen(true);
            } catch (err) {
                console.error('Fetch failed:', err);
                setPreviewUrl(fileUrl);
                setIsPreviewOpen(true);
            }
        } else {
            // Show in Modal (For Images)
            setPreviewUrl(fileUrl);
            setIsPreviewOpen(true);
        }
    };

    const closePreview = () => {
        setIsPreviewOpen(false);
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setIsPreviewPdf(false);
    };

    if (loading) return <LoadingScreen />;

    if (!application) {
        return <div className="flex items-center justify-center h-screen bg-bg-soft text-rose-500 font-bold transition-colors">{error || 'Application Not Found'}</div>;
    }

    return (
        <div className="flex h-screen bg-bg-soft overflow-hidden font-sans relative transition-colors duration-300">

            {/* Custom Modal / Lightbox */}
            {isPreviewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 lg:p-10 animate-in fade-in duration-200">
                    <div className="relative w-full h-full max-w-[1200px] flex flex-col bg-card-bg rounded-2xl overflow-hidden border border-border-color shadow-2xl">
                        {/* Lightbox Header */}
                        <div className="flex items-center justify-between px-6 py-4 bg-table-header-bg border-b border-border-color">
                            <h3 className="text-text-main font-bold text-sm transition-colors">Document Preview</h3>
                            <div className="flex items-center gap-3">
                                {previewUrl && (
                                    <a
                                        href={previewUrl}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-md"
                                    >
                                        <Download size={16} strokeWidth={3} /> Download
                                    </a>
                                )}
                                <button
                                    onClick={closePreview}
                                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-md"
                                >
                                    <XIcon size={16} strokeWidth={3} /> Close
                                </button>
                            </div>
                        </div>

                        {/* Lightbox Body */}
                        <div className="flex-1 bg-bg-soft p-2 lg:p-6 overflow-hidden flex items-center justify-center relative transition-colors">
                            {isPreviewPdf ? (
                                <object
                                    data={previewUrl}
                                    type="application/pdf"
                                    className="w-full h-full rounded-xl shadow-inner bg-card-bg"
                                    style={{ border: 'none', height: '100%', minHeight: '500px' }}
                                >
                                    <div className="flex flex-col items-center justify-center h-full text-text-main p-8 transition-colors">
                                        <p className="mb-4 font-bold text-center">Your browser does not support PDF preview.</p>
                                        <a href={previewUrl} target="_blank" rel="noreferrer" className="bg-navy hover:brightness-110 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-md">
                                            Click here to download
                                        </a>
                                    </div>
                                </object>
                            ) : (
                                <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {successMsg && (
                <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[60] bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-4">

                    <CheckCircle2 size={20} className="text-white" />
                    {successMsg}
                </div>
            )}

            {/* Sidebar from Components */}
            <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
                <TopHeader
                    breadcrumbs={['Staff', 'Review Application']}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    placeholder="Search context..."
                />

                <div className="p-6 lg:p-12 max-w-[1200px] mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                        <div className="flex items-start gap-4">
                            <button
                                type="button"
                                onClick={() => navigate(getBackPath())}
                                className="mt-1 w-10 h-10 rounded-xl bg-card-bg border border-border-color flex items-center justify-center text-text-muted hover:text-navy hover:border-navy/30 transition-all shrink-0"
                                title="Go back"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] mb-2 block transition-colors">APPLICATION: #{application.applicationId}</span>
                                <h1 className="text-3xl lg:text-4xl font-black text-navy tracking-tighter transition-colors">Application Review</h1>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-text-muted font-black uppercase tracking-wider mb-1 transition-colors">Current Status</span>
                            <span className={`text-[11px] px-4 py-1.5 rounded-full font-black tracking-wide border border-current/10 ${application.status === 'Approved'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : application.status === 'Returned'
                                    ? 'bg-rose-500/10 text-rose-500'
                                    : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                {application.status === 'Approved'
                                    ? 'Approved'
                                    : application.status === 'Returned'
                                        ? 'Returned'
                                        : 'Pending Review'}
                            </span>
                        </div>
                    </div>

                    {error && <div className="bg-rose-500/10 text-rose-500 p-4 rounded-xl mb-6 text-[13px] font-black border border-rose-500/20 transition-colors">{error}</div>}

                    {application.isResubmitted && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 mb-8 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 transition-colors">
                            <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                                <ClipboardCheck size={24} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-amber-500 text-[16px] mb-1">This application was corrected and resubmitted</h4>
                                <p className="text-[13px] text-text-muted font-bold leading-relaxed">
                                    This application was previously returned by staff and has now been corrected by the applicant.
                                    <strong> Permit fee (${application.formData.totalFee.toFixed(2)}) has already been paid (ALREADY PAID)</strong>. The applicant was not charged a second time.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Side: Details & Docs */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Project Details */}
                            <section className="bg-card-bg rounded-3xl p-8 lg:p-10 shadow-sm border border-border-color transition-colors duration-300">
                                <h3 className="flex items-center gap-2 font-black text-navy text-[15px] mb-8 transition-colors">
                                    <FileText size={18} className="text-navy" /> Project Details
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-10 gap-x-6">
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Plot ID</p>
                                        <p className="font-black text-text-main text-[15px] transition-colors">{application.formData.plotId}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">District</p>
                                        <p className="font-black text-text-main text-[15px] transition-colors">{application.formData.district}, Mogadishu</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Land Size</p>
                                        <p className="font-black text-text-main text-[15px] transition-colors">{application.formData.landArea} m²</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Permit Fee</p>
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-navy text-[20px] tracking-tight transition-colors">${Number(application.formData.totalFee || 0).toFixed(2)}</p>
                                            {(application.isResubmitted || application.status === 'Approved' || application.paymentStatus === 'Paid') && (
                                                <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-emerald-500/20 transition-colors">
                                                    Paid
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Request Type</p>
                                        <p className="font-black text-text-main text-[15px] transition-colors">
                                            {(() => {
                                                const rt = application.formData?.requestType || 'New Construction';
                                                if (rt === 'Renew') return 'Renew';
                                                if (rt === 'Renovation') return 'Renovation';
                                                return 'New';
                                            })()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Building Category</p>
                                        <p className="font-black text-text-main text-[15px] transition-colors">{application.formData.buildingCategory} <br /><span className="text-[12px] font-bold text-text-muted transition-colors">{application.formData.floors > 1 ? `(${application.formData.floors} floors)` : ''}</span></p>
                                    </div>
                                </div>
                            </section>

                            {/* Applicant Information */}
                            <section className="bg-card-bg rounded-3xl p-8 lg:p-10 shadow-sm border border-border-color transition-colors duration-300">
                                <h3 className="flex items-center gap-2 font-black text-navy text-[15px] mb-8 transition-colors">
                                    <User size={18} className="text-navy" /> Applicant Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-6">
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Full Name</p>
                                        <p className="font-black text-text-main text-[15px] transition-colors">{application.user?.fullName || application.formData.fullName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Phone</p>
                                        <p className="font-black text-text-main text-[15px] transition-colors">{application.user?.phone || application.formData.phone}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Approval Information - ONLY FOR STAFF & SUPERADMIN */}
                            {(user?.role === 'superadmin' || user?.role === 'staff') && application.status === 'Approved' && (
                                <section className="bg-card-bg rounded-3xl p-8 lg:p-10 shadow-sm border border-border-color transition-colors duration-300">
                                    <h3 className="flex items-center gap-2 font-black text-navy text-[15px] mb-8 transition-colors">
                                        <UserCheck size={18} className="text-navy" /> Approval Details
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-6">
                                        {application.reviewedBy && (
                                            <div>
                                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Approved By</p>
                                                <p className="font-black text-emerald-500 text-[15px] transition-colors">{application.reviewedBy.fullName}</p>
                                                {application.approvalDate && <p className="text-[11px] text-text-muted font-bold transition-colors">{new Date(application.approvalDate).toLocaleDateString()}</p>}
                                            </div>
                                        )}
                                        {application.expiryDate && (
                                            <div>
                                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Expiry Date</p>
                                                {isEditingExpiry ? (
                                                    <div className="flex flex-col gap-2 mt-1">
                                                        <input
                                                            type="date"
                                                            value={newExpiryDate}
                                                            min={(() => {
                                                                const today = new Date();
                                                                const yyyy = today.getFullYear();
                                                                const mm = String(today.getMonth() + 1).padStart(2, '0');
                                                                const dd = String(today.getDate()).padStart(2, '0');
                                                                return `${yyyy}-${mm}-${dd}`;
                                                            })()}
                                                            onChange={(e) => setNewExpiryDate(e.target.value)}
                                                            className="bg-table-header-bg/60 border border-border-color rounded-xl px-3 py-2 text-[14px] text-text-main font-bold outline-none focus:ring-2 focus:ring-navy transition-all"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={handleUpdateExpiry}
                                                                disabled={isUpdatingExpiry}
                                                                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow transition-all disabled:opacity-50"
                                                            >
                                                                {isUpdatingExpiry ? 'Saving...' : 'Save'}
                                                            </button>
                                                            <button
                                                                onClick={() => setIsEditingExpiry(false)}
                                                                className="bg-transparent border border-gray-300 hover:bg-table-header-bg text-text-muted text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-black text-rose-500 text-[15px] transition-colors">{new Date(application.expiryDate).toLocaleDateString()}</p>
                                                        <button
                                                            onClick={() => {
                                                                setNewExpiryDate(application.expiryDate ? new Date(application.expiryDate).toISOString().substring(0, 10) : '');
                                                                setIsEditingExpiry(true);
                                                            }}
                                                            className="p-1.5 text-blue-500 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all focus:outline-none"
                                                            title="Update Expiry Date"
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Documents */}
                            <section className="bg-white rounded-3xl p-8 lg:p-10 shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-gray-100">
                                <h3 className="flex items-center gap-2 font-bold text-[#1E293B] text-[15px] mb-6">
                                    <FileText size={18} className="text-[#002147]" /> Submitted Documents
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {application.documents?.nationalId ? (
                                        <div
                                            onClick={() => openPreview(application.documents.nationalId)}
                                            className="flex items-center justify-between p-4 bg-table-header-bg/50 rounded-2xl border border-border-color group hover:border-navy/50 hover:bg-navy/5 transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4 pointer-events-none">
                                                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-[13px] text-text-main mb-0.5 mt-1 transition-colors">Passport / National ID</p>
                                                    <p className="text-[10px] text-text-muted font-bold transition-colors">{application.documents.nationalId.split('/').pop()}</p>
                                                </div>
                                            </div>
                                            <button className="text-text-muted group-hover:text-navy transition-colors"><Eye size={18} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center p-4 bg-table-header-bg/30 rounded-2xl border border-dashed border-border-color opacity-60">
                                            <div className="w-12 h-12 bg-table-header-bg text-text-muted rounded-xl flex items-center justify-center shrink-0">
                                                <FileText size={20} />
                                            </div>
                                            <div className="ml-4">
                                                <p className="font-black text-[13px] text-text-muted">Passport / National ID</p>
                                                <p className="text-[10px] text-text-muted font-bold uppercase">Not submitted</p>
                                            </div>
                                        </div>
                                    )}

                                    {application.documents?.ownershipDocs ? (
                                        <div
                                            onClick={() => openPreview(application.documents.ownershipDocs)}
                                            className="flex items-center justify-between p-4 bg-table-header-bg/50 rounded-2xl border border-border-color group hover:border-navy/50 hover:bg-navy/5 transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4 pointer-events-none">
                                                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-[13px] text-text-main mb-0.5 mt-1 transition-colors">Ownership Deed</p>
                                                    <p className="text-[10px] text-text-muted font-bold transition-colors">{application.documents.ownershipDocs.split('/').pop()}</p>
                                                </div>
                                            </div>
                                            <button className="text-text-muted group-hover:text-navy transition-colors"><Eye size={18} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center p-4 bg-table-header-bg/30 rounded-2xl border border-dashed border-border-color opacity-60">
                                            <div className="w-12 h-12 bg-table-header-bg text-text-muted rounded-xl flex items-center justify-center shrink-0">
                                                <FileText size={20} />
                                            </div>
                                            <div className="ml-4">
                                                <p className="font-black text-[13px] text-text-muted">Ownership Deed</p>
                                                <p className="text-[10px] text-text-muted font-bold uppercase">Not submitted</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="bg-amber-500/10 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-center min-h-[200px] border border-amber-500/20 transition-colors duration-300">
                                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: darkMode ? 'radial-gradient(#4f8ef7 1px, transparent 1px)' : 'radial-gradient(#d1a44e 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                                <div className="absolute right-10 top-1/2 -translate-y-1/2 w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center shadow-lg transform -translate-y-2 transition-transform">
                                    <div className="w-4 h-4 bg-white rounded-full"></div>
                                    <div className="absolute bottom-[-10px] w-0 h-0 border-l-[10px] border-r-[10px] border-t-[15px] border-l-transparent border-r-transparent border-t-rose-500"></div>
                                </div>
                                <h3 className="font-black text-amber-500 text-[15px] z-10 mb-1">Plot Location</h3>
                                <p className="text-[12px] text-amber-500/70 font-bold z-10 uppercase tracking-wider">Map Overlay (Preview)</p>
                            </section>
                        </div>

                        {/* Right Side: Decision Hub */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-navy rounded-3xl p-8 shadow-[0_20px_40px_-15px_rgba(0,33,71,0.6)] sticky top-24 transition-colors">
                                <h3 className="font-black text-white text-[18px] mb-6 tracking-wide uppercase">Decision Hub</h3>

                                {application.status === 'Approved' ? (
                                    <div className="text-center py-6">
                                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <h4 className="text-white font-bold text-lg mb-2">This application has been approved</h4>
                                        <p className="text-gray-400 text-xs leading-relaxed px-4">
                                            This building permit is finalized. For any changes, please contact senior administration.
                                        </p>
                                        {(application.qrData || application.permitId) && (
                                            <div className="mt-8 pt-8 border-t border-white/5">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4 italic">Official Certificate</p>
                                                <div className="bg-[#F5F7FA] rounded-2xl mb-4 overflow-hidden border border-white/10">
                                                    <div className="h-[280px] overflow-y-auto flex justify-center py-2">
                                                        <div style={{ transform: 'scale(0.62)', transformOrigin: 'top center' }}>
                                                            <PermitCertificateCard
                                                                ref={certificateRef}
                                                                application={application}
                                                                qrDataUrl={qrDataUrl}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                {qrDataUrl && (
                                                    <div className="space-y-2 px-1">
                                                        <button
                                                            type="button"
                                                            onClick={handleDownloadQrPng}
                                                            disabled={isExportingCert}
                                                            className="w-full bg-white text-navy font-bold text-[12px] py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-md disabled:opacity-50"
                                                        >
                                                            <Download size={14} strokeWidth={3} />
                                                            {isExportingCert ? 'Preparing…' : 'Download Certificate PNG'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleDownloadCertificatePdf}
                                                            disabled={isExportingCert}
                                                            className="w-full bg-emerald-500 text-white font-bold text-[12px] py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-md disabled:opacity-50"
                                                        >
                                                            <FileText size={14} strokeWidth={3} />
                                                            {isExportingCert ? 'Preparing…' : 'Download Certificate PDF'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : showRejectForm ? (
                                    <>
                                        <div className="mb-6">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Return Reason</label>
                                            <textarea
                                                rows="6"
                                                placeholder="Describe what needs to be corrected so the applicant can fix it..."
                                                value={remarks}
                                                onChange={(e) => setRemarks(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-[13px] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none shadow-inner font-bold"
                                            ></textarea>
                                        </div>

                                        <div className="space-y-3">
                                            <button
                                                onClick={() => handleDecision('Returned')}
                                                disabled={isSubmitting}
                                                className="w-full bg-red-500 text-white font-bold text-[14px] py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-md disabled:opacity-50"
                                            >
                                                Submit Rejection
                                            </button>
                                            <button
                                                onClick={() => setShowRejectForm(false)}
                                                disabled={isSubmitting}
                                                className="w-full bg-transparent border border-white/20 text-white font-bold text-[14px] py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-all disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-3">
                                        {(application.status !== 'Returned' || user?.role === 'superadmin') && (
                                            <button
                                                onClick={() => handleDecision('Approved')}
                                                disabled={isSubmitting}
                                                className="w-full bg-white text-navy font-black text-[14px] py-4 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-md disabled:opacity-50"
                                            >
                                                <Check size={18} strokeWidth={4} /> Accept
                                            </button>
                                        )}

                                        {application.status !== 'Returned' && (
                                            <button
                                                onClick={() => setShowRejectForm(true)}
                                                disabled={isSubmitting}
                                                className="w-full bg-transparent border border-white/20 text-white font-bold text-[14px] py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-all disabled:opacity-50"
                                            >
                                                <XIcon size={18} strokeWidth={3} /> Reject
                                            </button>
                                        )}

                                        {application.status === 'Returned' && user?.role === 'staff' && (
                                            <div className="text-center py-4 bg-white/5 border border-white/10 rounded-xl mt-4">
                                                <p className="text-gray-400 text-[11px] font-bold leading-relaxed px-4">
                                                    Only an admin can accept a returned application.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <p className="text-[9px] text-gray-500 uppercase tracking-widest text-center mt-6">Your decision is final and binding</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StaffReview;
