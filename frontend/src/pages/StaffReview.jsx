import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
    const [qrDataUrl, setQrDataUrl] = useState(null);

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
                    width: 256,
                    margin: 1,
                    errorCorrectionLevel: 'M'
                });
                setQrDataUrl(url);
            } catch (err) {
                console.error('Failed to generate QR code', err);
                setQrDataUrl(null);
            }
        };
        generateQr();
    }, [application]);

    const formatCertDate = (value, withTime = false) => {
        if (!value) return 'N/A';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return 'N/A';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const base = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        if (!withTime) return base;
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${base}, ${hh}:${mm}`;
    };

    const getCertificateFields = () => {
        const form = application?.formData || {};
        const buildingType = form.buildingCategory || form.buildingType || 'N/A';
        const isDabaq = String(buildingType).toLowerCase().includes('dabaq');
        const landArea = form.landArea ?? form.plotSize ?? '0';
        return {
            applicantName: application?.user?.fullName || form.fullName || 'N/A',
            plotId: form.plotId || 'N/A',
            district: form.district || application?.district || 'N/A',
            approvedBy: application?.reviewedBy?.fullName || 'System',
            buildingType,
            isDabaq,
            floors: isDabaq ? String(form.floors ?? 1) : null,
            size: `${landArea} m²`,
            approvedTime: formatCertDate(application?.approvalDate || application?.updatedAt, true),
            expiryDate: formatCertDate(application?.expiryDate, false),
            permitId: application?.permitId || application?.applicationId || 'N/A',
            requestType: form.requestType || 'New Construction',
        };
    };

    const drawFormalCertificatePng = async () => {
        if (!qrDataUrl || !application) return null;
        const fields = getCertificateFields();
        const width = 900;
        const height = 1280;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Background
        ctx.fillStyle = '#F3F4F6';
        ctx.fillRect(0, 0, width, height);

        // Card
        const cardX = 48;
        const cardY = 48;
        const cardW = width - 96;
        const cardH = height - 96;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 2;
        roundRect(ctx, cardX, cardY, cardW, cardH, 28);
        ctx.fill();
        ctx.stroke();

        // Green approved banner
        ctx.fillStyle = '#22C55E';
        roundRect(ctx, cardX + 36, cardY + 36, cardW - 72, 88, 18);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cardX + 90, cardY + 80, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22C55E';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('✓', cardX + 80, cardY + 90);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('OFFICIALLY APPROVED', cardX + 130, cardY + 90);

        // Detail rows
        const rows = [
            ['Applicant Name', fields.applicantName],
            ['Plot ID', fields.plotId],
            ['District Name', fields.district],
            ['Approved By', fields.approvedBy],
            ['Application Type', fields.requestType],
            ['Building Type', fields.buildingType],
            ...(fields.floors != null ? [['Floors', fields.floors]] : []),
            ['Size', fields.size],
            ['Approved Time', fields.approvedTime],
            ['Expiry Date', fields.expiryDate],
        ];

        let y = cardY + 180;
        rows.forEach(([label, value]) => {
            ctx.fillStyle = '#9CA3AF';
            ctx.font = '500 22px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(label, cardX + 56, y);
            ctx.fillStyle = '#0B1F3A';
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(String(value), cardX + cardW - 56, y);
            y += 48;
        });

        // Divider
        y += 12;
        ctx.strokeStyle = '#E5E7EB';
        ctx.beginPath();
        ctx.moveTo(cardX + 56, y);
        ctx.lineTo(cardX + cardW - 56, y);
        ctx.stroke();

        // QR section
        y += 56;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0B1F3A';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('Official QR Code', width / 2, y);
        y += 34;
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '500 18px sans-serif';
        ctx.fillText('For Inspector Verification Only', width / 2, y);

        y += 36;
        // Permit ID chip
        const chipText = fields.permitId;
        ctx.font = 'bold 20px sans-serif';
        const chipW = Math.max(180, ctx.measureText(chipText).width + 48);
        const chipX = (width - chipW) / 2;
        ctx.strokeStyle = '#E5E7EB';
        ctx.fillStyle = '#FFFFFF';
        roundRect(ctx, chipX, y, chipW, 44, 10);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0B1F3A';
        ctx.fillText(chipText, width / 2, y + 30);

        y += 70;
        const qrSize = 280;
        const qrX = (width - qrSize) / 2;
        ctx.strokeStyle = '#E5E7EB';
        roundRect(ctx, qrX - 16, y - 16, qrSize + 32, qrSize + 32, 16);
        ctx.stroke();

        const qrImg = await loadImage(qrDataUrl);
        ctx.drawImage(qrImg, qrX, y, qrSize, qrSize);

        y += qrSize + 48;
        ctx.fillStyle = '#0B1F3A';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('Scan to Verify', width / 2, y);

        return canvas.toDataURL('image/png');
    };

    const roundRect = (ctx, x, y, w, h, r) => {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    };

    const loadImage = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

    const handleDownloadQrPng = async () => {
        try {
            const dataUrl = await drawFormalCertificatePng();
            if (!dataUrl) return;
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `permit_certificate_${application.permitId || application.applicationId || 'approved'}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Failed to download formal PNG certificate', err);
            setError('Failed to download PNG certificate.');
        }
    };

    const handleDownloadCertificatePdf = async () => {
        if (!qrDataUrl || !application) return;
        const fields = getCertificateFields();
        const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 40;

        // Card background
        doc.setFillColor(243, 244, 246);
        doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F');
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, margin, pageW - margin * 2, 760, 14, 14, 'F');

        // Banner
        doc.setFillColor(34, 197, 94);
        doc.roundedRect(margin + 18, margin + 18, pageW - margin * 2 - 36, 52, 10, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('OFFICIALLY APPROVED', pageW / 2, margin + 50, { align: 'center' });

        const rows = [
            ['Applicant Name', fields.applicantName],
            ['Plot ID', fields.plotId],
            ['District Name', fields.district],
            ['Approved By', fields.approvedBy],
            ['Application Type', fields.requestType],
            ['Building Type', fields.buildingType],
            ...(fields.floors != null ? [['Floors', fields.floors]] : []),
            ['Size', fields.size],
            ['Approved Time', fields.approvedTime],
            ['Expiry Date', fields.expiryDate],
        ];

        let y = margin + 100;
        rows.forEach(([label, value]) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(156, 163, 175);
            doc.text(label, margin + 36, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(11, 31, 58);
            doc.text(String(value), pageW - margin - 36, y, { align: 'right' });
            y += 28;
        });

        y += 10;
        doc.setDrawColor(229, 231, 235);
        doc.line(margin + 36, y, pageW - margin - 36, y);

        y += 36;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(11, 31, 58);
        doc.text('Official QR Code', pageW / 2, y, { align: 'center' });
        y += 18;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(156, 163, 175);
        doc.text('For Inspector Verification Only', pageW / 2, y, { align: 'center' });

        y += 24;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(11, 31, 58);
        doc.text(fields.permitId, pageW / 2, y, { align: 'center' });

        y += 16;
        const qrSize = 160;
        doc.addImage(qrDataUrl, 'PNG', (pageW - qrSize) / 2, y, qrSize, qrSize);
        y += qrSize + 28;
        doc.setFontSize(12);
        doc.text('Scan to Verify', pageW / 2, y, { align: 'center' });

        doc.save(`permit-certificate-${fields.permitId}.pdf`);
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
                        navigate(user?.role === 'superadmin' ? '/admin/all-permits' : '/staff/applications');
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
        return <div className="flex items-center justify-center h-screen bg-bg-soft text-rose-500 font-semibold">{error || 'Application Not Found'}</div>;
    }

    return (
        <div className="flex h-screen bg-bg-soft overflow-hidden font-sans relative transition-colors duration-300">

            {/* Custom Modal / Lightbox */}
            {isPreviewOpen && (
                <div className="ui-modal-backdrop bg-navy/50">
                    <div className="relative w-full h-full max-w-[1200px] flex flex-col ui-modal">
                        {/* Lightbox Header */}
                        <div className="ui-modal-header bg-table-header-bg/60">
                            <h3 className="text-text-main font-semibold text-sm">Document Preview</h3>
                            <div className="flex items-center gap-3">
                                {previewUrl && (
                                    <a
                                        href={previewUrl}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3.5 py-2 rounded-[10px] text-xs font-semibold transition-colors"
                                    >
                                        <Download size={16} strokeWidth={3} /> Download
                                    </a>
                                )}
                                <button
                                    onClick={closePreview}
                                    className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3.5 py-2 rounded-[10px] text-xs font-semibold transition-colors"
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
                                    className="w-full h-full rounded-[10px] bg-card-bg"
                                    style={{ border: 'none', height: '100%', minHeight: '500px' }}
                                >
                                    <div className="flex flex-col items-center justify-center h-full text-text-main p-8 transition-colors">
                                        <p className="mb-4 font-bold text-center">Your browser does not support PDF preview.</p>
                                        <a href={previewUrl} target="_blank" rel="noreferrer" className="ui-btn">
                                            Click here to download
                                        </a>
                                    </div>
                                </object>
                            ) : (
                                <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-[10px]" />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {successMsg && (
                <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[60] bg-emerald-500 text-white px-5 py-2.5 rounded-[10px] font-semibold flex items-center gap-3">

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
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                        <div className="flex items-start gap-4">
                            <button
                                type="button"
                                onClick={() => navigate(user?.role === 'superadmin' ? '/admin/all-permits' : '/staff/applications')}
                                className="mt-1 w-9 h-9 rounded-[10px] bg-card-bg border border-border-color flex items-center justify-center text-text-muted hover:text-navy hover:border-navy/30 transition-all shrink-0"
                                title="Go back"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-2 block">APPLICATION: #{application.applicationId}</span>
                                <h1 className="text-2xl lg:text-3xl font-semibold text-navy tracking-tight">Application Review</h1>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[11px] text-text-muted font-semibold uppercase tracking-[0.08em] mb-1">Current Status</span>
                            <span className={`text-[10px] px-2.5 py-1 rounded-md font-semibold tracking-[0.06em] uppercase ${application.status === 'Approved'
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

                    {error && <div className="bg-rose-500/10 text-rose-500 p-4 rounded-[10px] mb-6 text-[13px] font-medium border border-rose-500/20">{error}</div>}

                    {application.isResubmitted && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[14px] p-5 mb-6 flex items-start gap-4">
                            <div className="w-9 h-9 bg-amber-500/20 text-amber-500 rounded-[10px] flex items-center justify-center shrink-0">
                                <ClipboardCheck size={24} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-amber-500 text-[14px] mb-1">This application was corrected and resubmitted</h4>
                                <p className="text-[13px] text-text-muted font-medium leading-relaxed">
                                    This application was previously returned by staff and has now been corrected by the applicant.
                                    <strong> Permit fee (${application.formData.totalFee.toFixed(2)}) has already been paid (ALREADY PAID)</strong>. The applicant was not charged a second time.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Left Side: Details & Docs */}
                        <div className="lg:col-span-2 space-y-5">

                            {/* Project Details */}
                            <section className="ui-card p-5 lg:p-6">
                                <h3 className="flex items-center gap-2 font-semibold text-navy text-[14px] mb-5">
                                    <FileText size={18} className="text-navy" /> Project Details
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-5">
                                    <div>
                                        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-1.5">Application Type</p>
                                        <p className="font-semibold text-text-main text-[14px]">
                                            {application.formData?.requestType || 'New Construction'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-1.5">Plot ID</p>
                                        <p className="font-semibold text-text-main text-[14px]">{application.formData.plotId}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-1.5">District</p>
                                        <p className="font-semibold text-text-main text-[14px]">{application.formData.district}, Mogadishu</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-1.5">Land Size</p>
                                        <p className="font-semibold text-text-main text-[14px]">{application.formData.landArea} m²</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-1.5">Permit Fee</p>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-navy text-xl tracking-tight">${Number(application.formData.totalFee || 0).toFixed(2)}</p>
                                            {(application.isResubmitted || application.status === 'Approved' || application.paymentStatus === 'Paid') && (
                                                <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-[0.06em]">
                                                    Paid
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-1.5">Building Category</p>
                                        <p className="font-semibold text-text-main text-[14px]">
                                            {application.formData.buildingCategory}
                                            {String(application.formData.buildingCategory || '').toLowerCase().includes('dabaq') && application.formData.floors ? (
                                                <>
                                                    <br />
                                                    <span className="text-[12px] font-medium text-text-muted">
                                                        ({application.formData.floors} floor{Number(application.formData.floors) === 1 ? '' : 's'})
                                                    </span>
                                                </>
                                            ) : null}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Applicant Information */}
                            <section className="ui-card p-5 lg:p-6">
                                <h3 className="flex items-center gap-2 font-semibold text-navy text-[14px] mb-5">
                                    <User size={18} className="text-navy" /> Applicant Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-5">
                                    <div>
                                        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-1.5">Full Name</p>
                                        <p className="font-semibold text-text-main text-[14px]">{application.user?.fullName || application.formData.fullName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-1.5">Phone</p>
                                        <p className="font-semibold text-text-main text-[14px]">{application.user?.phone || application.formData.phone}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Approval Information - ONLY FOR STAFF & SUPERADMIN */}
                            {(user?.role === 'superadmin' || user?.role === 'staff') && application.status === 'Approved' && (
                                <section className="ui-card p-5 lg:p-6">
                                    <h3 className="flex items-center gap-2 font-semibold text-navy text-[14px] mb-5">
                                        <UserCheck size={18} className="text-navy" /> Approval Details
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-5">
                                        {application.reviewedBy && (
                                            <div>
                                                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-1.5">Approved By</p>
                                                <p className="font-semibold text-emerald-500 text-[14px]">{application.reviewedBy.fullName}</p>
                                                {application.approvalDate && <p className="text-[11px] text-text-muted font-medium">{new Date(application.approvalDate).toLocaleDateString()}</p>}
                                            </div>
                                        )}
                                        {application.expiryDate && (
                                            <div>
                                                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-1.5">Expiry Date</p>
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
                                                            className="ui-input"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={handleUpdateExpiry}
                                                                disabled={isUpdatingExpiry}
                                                                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-[10px] transition-all disabled:opacity-50"
                                                            >
                                                                {isUpdatingExpiry ? 'Saving...' : 'Save'}
                                                            </button>
                                                            <button
                                                                onClick={() => setIsEditingExpiry(false)}
                                                                className="ui-btn-outline text-xs px-3 py-1.5"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-rose-500 text-[14px]">{new Date(application.expiryDate).toLocaleDateString()}</p>
                                                        <button
                                                            onClick={() => {
                                                                setNewExpiryDate(application.expiryDate ? new Date(application.expiryDate).toISOString().substring(0, 10) : '');
                                                                setIsEditingExpiry(true);
                                                            }}
                                                            className="p-1.5 text-blue-500 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 rounded-[10px] transition-all focus:outline-none"
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
                            <section className="ui-card p-5 lg:p-6">
                                <h3 className="flex items-center gap-2 font-semibold text-navy text-[14px] mb-5">
                                    <FileText size={18} className="text-navy" /> Submitted Documents
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {application.documents?.nationalId ? (
                                        <div
                                            onClick={() => openPreview(application.documents.nationalId)}
                                            className="flex items-center justify-between p-3.5 bg-table-header-bg/40 rounded-[10px] border border-border-color group hover:border-navy/30 hover:bg-table-header-bg/60 transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4 pointer-events-none">
                                                <div className="w-9 h-9 bg-indigo-500/10 text-indigo-500 rounded-[10px] flex items-center justify-center shrink-0">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-[13px] text-text-main mb-0.5 mt-1">Passport / National ID</p>
                                                    <p className="text-[10px] text-text-muted font-medium">{application.documents.nationalId.split('/').pop()}</p>
                                                </div>
                                            </div>
                                            <button className="text-text-muted group-hover:text-navy transition-colors"><Eye size={18} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center p-3.5 bg-table-header-bg/30 rounded-[10px] border border-dashed border-border-color opacity-60">
                                            <div className="w-9 h-9 bg-table-header-bg text-text-muted rounded-[10px] flex items-center justify-center shrink-0">
                                                <FileText size={20} />
                                            </div>
                                            <div className="ml-4">
                                                <p className="font-semibold text-[13px] text-text-muted">Passport / National ID</p>
                                                <p className="text-[10px] text-text-muted font-semibold uppercase tracking-[0.06em]">Not submitted</p>
                                            </div>
                                        </div>
                                    )}

                                    {application.documents?.ownershipDocs ? (
                                        <div
                                            onClick={() => openPreview(application.documents.ownershipDocs)}
                                            className="flex items-center justify-between p-3.5 bg-table-header-bg/40 rounded-[10px] border border-border-color group hover:border-navy/30 hover:bg-table-header-bg/60 transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4 pointer-events-none">
                                                <div className="w-9 h-9 bg-emerald-500/10 text-emerald-500 rounded-[10px] flex items-center justify-center shrink-0">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-[13px] text-text-main mb-0.5 mt-1">Ownership Deed</p>
                                                    <p className="text-[10px] text-text-muted font-medium">{application.documents.ownershipDocs.split('/').pop()}</p>
                                                </div>
                                            </div>
                                            <button className="text-text-muted group-hover:text-navy transition-colors"><Eye size={18} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center p-3.5 bg-table-header-bg/30 rounded-[10px] border border-dashed border-border-color opacity-60">
                                            <div className="w-9 h-9 bg-table-header-bg text-text-muted rounded-[10px] flex items-center justify-center shrink-0">
                                                <FileText size={20} />
                                            </div>
                                            <div className="ml-4">
                                                <p className="font-semibold text-[13px] text-text-muted">Ownership Deed</p>
                                                <p className="text-[10px] text-text-muted font-semibold uppercase tracking-[0.06em]">Not submitted</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="bg-amber-500/10 rounded-[14px] p-6 relative overflow-hidden flex flex-col justify-center min-h-[160px] border border-amber-500/20">
                                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: darkMode ? 'radial-gradient(#4f8ef7 1px, transparent 1px)' : 'radial-gradient(#d1a44e 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                                <div className="absolute right-10 top-1/2 -translate-y-1/2 w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center shadow-lg transform -translate-y-2 transition-transform">
                                    <div className="w-4 h-4 bg-white rounded-full"></div>
                                    <div className="absolute bottom-[-10px] w-0 h-0 border-l-[10px] border-r-[10px] border-t-[15px] border-l-transparent border-r-transparent border-t-rose-500"></div>
                                </div>
                                <h3 className="font-semibold text-amber-500 text-[14px] z-10 mb-1">Plot Location</h3>
                                <p className="text-[11px] text-amber-500/70 font-semibold z-10 uppercase tracking-[0.08em]">Map Overlay (Preview)</p>
                            </section>
                        </div>

                        {/* Right Side: Decision Hub */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-navy rounded-[14px] p-6 sticky top-24">
                                <h3 className="font-semibold text-white text-[15px] mb-5 tracking-[0.08em] uppercase">Decision Hub</h3>

                                {application.status === 'Approved' ? (
                                    <div className="text-center py-6">
                                        <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-[10px] flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <h4 className="text-white font-semibold text-base mb-2">This application has been approved</h4>
                                        <p className="text-gray-400 text-xs leading-relaxed px-4">
                                            This building permit is finalized. For any changes, please contact senior administration.
                                        </p>
                                        {(application.qrData || application.permitId) && (
                                            <div className="mt-8 pt-8 border-t border-white/5">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-[0.08em] mb-2">Permit is active</p>
                                                {application.permitId && (
                                                    <p className="text-white font-semibold text-sm mb-4">
                                                        Permit ID: <span className="text-emerald-400">{application.permitId}</span>
                                                    </p>
                                                )}
                                                <div className="p-3 bg-white rounded-[10px] inline-block mb-4">
                                                    {qrDataUrl ? (
                                                        <img
                                                            src={qrDataUrl}
                                                            alt="Permit QR Code"
                                                            className="w-24 h-24 object-contain"
                                                        />
                                                    ) : (
                                                        <div className="w-24 h-24 bg-gray-100 flex items-center justify-center">
                                                            <span className="text-[8px] text-gray-400 font-bold">LOADING QR…</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {qrDataUrl && (
                                                    <div className="space-y-2 px-1">
                                                        <button
                                                            type="button"
                                                            onClick={handleDownloadQrPng}
                                                            className="w-full bg-white text-navy font-semibold text-[12px] py-2.5 rounded-[10px] flex items-center justify-center gap-2 hover:brightness-110 transition-all"
                                                        >
                                                            <Download size={14} strokeWidth={3} /> Download Formal PNG
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleDownloadCertificatePdf}
                                                            className="w-full bg-emerald-500 text-white font-semibold text-[12px] py-2.5 rounded-[10px] flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all"
                                                        >
                                                            <FileText size={14} strokeWidth={3} /> Download Formal PDF
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : showRejectForm ? (
                                    <>
                                        <div className="mb-6">
                                            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-2">Return Reason</label>
                                            <textarea
                                                rows="6"
                                                placeholder="Describe what needs to be corrected so the applicant can fix it..."
                                                value={remarks}
                                                onChange={(e) => setRemarks(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-[10px] p-3.5 text-[13px] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none font-medium"
                                            ></textarea>
                                        </div>

                                        <div className="space-y-3">
                                            <button
                                                onClick={() => handleDecision('Returned')}
                                                disabled={isSubmitting}
                                                className="w-full bg-red-500 text-white font-semibold text-[13px] py-3 rounded-[10px] flex items-center justify-center gap-2 hover:bg-red-600 transition-all disabled:opacity-50"
                                            >
                                                Submit Rejection
                                            </button>
                                            <button
                                                onClick={() => setShowRejectForm(false)}
                                                disabled={isSubmitting}
                                                className="w-full bg-transparent border border-white/20 text-white font-semibold text-[13px] py-3 rounded-[10px] flex items-center justify-center gap-2 hover:bg-white/5 transition-all disabled:opacity-50"
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
                                                className="w-full bg-white text-navy font-semibold text-[13px] py-3 rounded-[10px] flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50"
                                            >
                                                <Check size={18} strokeWidth={4} /> Accept
                                            </button>
                                        )}

                                        {application.status !== 'Returned' && (
                                            <button
                                                onClick={() => setShowRejectForm(true)}
                                                disabled={isSubmitting}
                                                className="w-full bg-transparent border border-white/20 text-white font-semibold text-[13px] py-3 rounded-[10px] flex items-center justify-center gap-2 hover:bg-white/5 transition-all disabled:opacity-50"
                                            >
                                                <XIcon size={18} strokeWidth={3} /> Reject
                                            </button>
                                        )}

                                        {application.status === 'Returned' && user?.role === 'staff' && (
                                            <div className="text-center py-4 bg-white/5 border border-white/10 rounded-[10px] mt-4">
                                                <p className="text-gray-400 text-[11px] font-medium leading-relaxed px-4">
                                                    Only an admin can accept a returned application.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <p className="text-[9px] text-gray-500 uppercase tracking-[0.08em] text-center mt-5">Your decision is final and binding</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StaffReview;
