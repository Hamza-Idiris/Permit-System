import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
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
import { useTheme } from '../context/ThemeContext';

const StaffReview = () => {
    const { id } = useParams();
    const { user, token } = useContext(AuthContext);
    const { darkMode } = useTheme();
    const navigate = useNavigate();

    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [remarks, setRemarks] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

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
            setError('Fadlan dooro taariikh dhicitaan oo sax ah.');
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selected = new Date(newExpiryDate);
        if (selected < today) {
            setError('Taariikhda dhicitaanka ma noqon karto mid tagto ah (Expiry date cannot be in the past).');
            return;
        }

        setIsUpdatingExpiry(true);
        setError('');

        try {
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            const res = await axios.put(`http://localhost:5000/api/permits/${id}/expiry`, { expiryDate: newExpiryDate }, config);

            if (res.data.success) {
                setSuccessMsg('Taariikhda dhicitaanka waa la cusbooneysiiyay si guul leh!');
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
            setError(err.response?.data?.message || 'Waa ku guuldareystay in la cusbooneysiiyo taariikhda dhicitaanka.');
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
                setError('Xogta codsiga lama heli karo.');
            } finally {
                setLoading(false);
            }
        };
        fetchApplication();
    }, [id, token]);

    const handleDecision = async (status) => {
        if (status === 'Returned' && remarks.trim() === '') {
            setError('Fadlan qor sababta aad u celineyso codsiga.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            const payload = { status, staffRemarks: remarks };
            const res = await axios.put(`http://localhost:5000/api/permits/${id}/review`, payload, config);

            if (res.data.success) {
                setSuccessMsg(`Codsiga waala ${status === 'Approved' ? 'Anshaxiyay' : 'Celiyay'} si guul leh!`);
                setTimeout(() => {
                    navigate(user?.role === 'superadmin' ? '/admin/all-permits' : '/staff/dashboard');
                }, 1800);
            }
        } catch (err) {
            console.error('Failed to submit decision', err);
            setError('Cillad ayaa dhacday, fadlan dib isku day.');
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
        return <div className="flex items-center justify-center h-screen bg-bg-soft text-rose-500 font-bold transition-colors">{error || 'Codsi Lama Helin'}</div>;
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
                                        <Download size={16} strokeWidth={3} /> Soo Degso (Download)
                                    </a>
                                )}
                                <button
                                    onClick={closePreview}
                                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-md"
                                >
                                    <XIcon size={16} strokeWidth={3} /> Xir (Close)
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
                                        <p className="mb-4 font-bold text-center">Browser-kaagu ma taageerayo PDF preview.</p>
                                        <a href={previewUrl} target="_blank" rel="noreferrer" className="bg-navy hover:brightness-110 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-md">
                                            Halkan guji si aad u soo degsato
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
                        <div>
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] mb-2 block transition-colors">CODSIGA: #{application.applicationId}</span>
                            <h1 className="text-3xl lg:text-4xl font-black text-navy tracking-tighter transition-colors">Dib-u-eegista Codsiga</h1>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-text-muted font-black uppercase tracking-wider mb-1 transition-colors">Xaaladda Hadda</span>
                            <span className={`text-[11px] px-4 py-1.5 rounded-full font-black tracking-wide border border-current/10 ${application.status === 'Approved'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                {application.status === 'Approved' ? 'Waa la Anshaxiyay (Approved)' : 'Sugidda Hubinta'}
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
                                <h4 className="font-black text-amber-500 text-[16px] mb-1">Codsigan waa la saxay & dib ayaa loo soo diray (Resubmitted)</h4>
                                <p className="text-[13px] text-text-muted font-bold leading-relaxed">
                                    Codsigan waxaa horey u celiyay shaqaalaha oo hadda waxaa soo saxay codsadaha.
                                    <strong> Lacagta fasaxa (${application.formData.totalFee.toFixed(2)}) horey ayaa loo bixiyay (ALREADY PAID)</strong>, codsadaha looma dallacin lacag labaad.
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
                                    <FileText size={18} className="text-navy" /> Faahfaahinta Mashruuca
                                </h3>
                                <div className="grid grid-cols-2 gap-y-10 gap-x-6">
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Aqoongsiga Booska (Plot ID)</p>
                                        <p className="font-black text-text-main text-[15px] transition-colors">{application.formData.plotId}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Degmada (District)</p>
                                        <p className="font-black text-text-main text-[15px] transition-colors">{application.formData.district}, Muqdisho</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Lacagta Fasaxa (Permit Fee)</p>
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-navy text-[20px] tracking-tight transition-colors">${application.formData.totalFee.toFixed(2)}</p>
                                            {(application.isResubmitted || application.status === 'Approved') && (
                                                <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-emerald-500/20 transition-colors">
                                                    Paid (Horey u Bixiyay)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Qaybta Dhismaha</p>
                                        <p className="font-black text-text-main text-[15px] transition-colors">{application.formData.buildingCategory} <br /><span className="text-[12px] font-bold text-text-muted transition-colors">{application.formData.floors > 1 ? `(${application.formData.floors} Dabaqyo)` : ''}</span></p>
                                    </div>
                                </div>
                            </section>

                            {/* Applicant Information */}
                            <section className="bg-card-bg rounded-3xl p-8 lg:p-10 shadow-sm border border-border-color transition-colors duration-300">
                                <h3 className="flex items-center gap-2 font-black text-navy text-[15px] mb-8 transition-colors">
                                    <User size={18} className="text-navy" /> Macluumaadka Codsadaha
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-6">
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Magaca oo Buuxa</p>
                                        <p className="font-black text-text-main text-[15px] transition-colors">{application.user?.fullName || application.formData.fullName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Telefoonka</p>
                                        <p className="font-black text-text-main text-[15px] transition-colors">{application.user?.phone || application.formData.phone}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Approval Information - ONLY FOR STAFF & SUPERADMIN */}
                            {(user?.role === 'superadmin' || user?.role === 'staff') && application.status === 'Approved' && (
                                <section className="bg-card-bg rounded-3xl p-8 lg:p-10 shadow-sm border border-border-color transition-colors duration-300">
                                    <h3 className="flex items-center gap-2 font-black text-navy text-[15px] mb-8 transition-colors">
                                        <UserCheck size={18} className="text-navy" /> Anshaxinta
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-6">
                                        {application.reviewedBy && (
                                            <div>
                                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Waxaa Anshaxiyay (Approved By)</p>
                                                <p className="font-black text-emerald-500 text-[15px] transition-colors">{application.reviewedBy.fullName}</p>
                                                {application.approvalDate && <p className="text-[11px] text-text-muted font-bold transition-colors">{new Date(application.approvalDate).toLocaleDateString()}</p>}
                                            </div>
                                        )}
                                        {application.expiryDate && (
                                            <div>
                                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 transition-colors">Taariikhda Dhicitaanka (Expiry Date)</p>
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
                                                            title="Cusbooneysii Expiry Date"
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
                                    <FileText size={18} className="text-[#002147]" /> Dukumentiyada La Soo Gudbiyay
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
                                                    <p className="font-black text-[13px] text-text-main mb-0.5 mt-1 transition-colors">Baasaboorka / Aqoonsiga</p>
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
                                                <p className="font-black text-[13px] text-text-muted">Baasaboorka / Aqoonsiga</p>
                                                <p className="text-[10px] text-text-muted font-bold uppercase">Ma soo gudbin</p>
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
                                                    <p className="font-black text-[13px] text-text-main mb-0.5 mt-1 transition-colors">Warqadda Lahaanshaha</p>
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
                                                <p className="font-black text-[13px] text-text-muted">Warqadda Lahaanshaha</p>
                                                <p className="text-[10px] text-text-muted font-bold uppercase">Ma soo gudbin</p>
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
                                <h3 className="font-black text-amber-500 text-[15px] z-10 mb-1">Goobta Booska</h3>
                                <p className="text-[12px] text-amber-500/70 font-bold z-10 uppercase tracking-wider">Khadka Khariidadda (Khayaali)</p>
                            </section>
                        </div>

                        {/* Right Side: Decision Hub */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-navy rounded-3xl p-8 shadow-[0_20px_40px_-15px_rgba(0,33,71,0.6)] sticky top-24 transition-colors">
                                <h3 className="font-black text-white text-[18px] mb-6 tracking-wide uppercase">Xarunta Go'aanka</h3>

                                {application.status === 'Approved' ? (
                                    <div className="text-center py-6">
                                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <h4 className="text-white font-bold text-lg mb-2">Codsigan waa la Anshaxiyay</h4>
                                        <p className="text-gray-400 text-xs leading-relaxed px-4">
                                            Fasaxan dhismaha waa la dhammaystiray. Wixii isbeddel ah fadlan la xiriir maamulka sare.
                                        </p>
                                        <div className="mt-8 pt-8 border-t border-white/5">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4 italic">Shatiga waa mid shaqeynaya</p>
                                            <div className="p-3 bg-white rounded-xl inline-block shadow-lg">
                                                {/* Placeholder for QR link or similar if needed */}
                                                <div className="w-24 h-24 bg-gray-100 flex items-center justify-center">
                                                    <span className="text-[8px] text-gray-400 font-bold">QR VERIFIED</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : showRejectForm ? (
                                    <>
                                        <div className="mb-6">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Sababta Celinta (Rejection Reason)</label>
                                            <textarea
                                                rows="6"
                                                placeholder="Ku qor halkan maxaa khaldan si codsadaha uu u saxo..."
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
                                        <button
                                            onClick={() => handleDecision('Approved')}
                                            disabled={isSubmitting}
                                            className="w-full bg-white text-navy font-black text-[14px] py-4 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-md disabled:opacity-50"
                                        >
                                            <Check size={18} strokeWidth={4} /> Accept
                                        </button>
                                        <button
                                            onClick={() => setShowRejectForm(true)}
                                            disabled={isSubmitting}
                                            className="w-full bg-transparent border border-white/20 text-white font-bold text-[14px] py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-all disabled:opacity-50"
                                        >
                                            <XIcon size={18} strokeWidth={3} /> Reject
                                        </button>
                                    </div>
                                )}

                                <p className="text-[9px] text-gray-500 uppercase tracking-widest text-center mt-6">Go'aankaaga waa mid saameyn leh</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StaffReview;
