import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import {
  QrCode, Search, CheckCircle2, XCircle, AlertTriangle,
  ExternalLink, ShieldCheck, Camera, Keyboard
} from 'lucide-react';

const VerifyPermit = () => {
  const { token, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mode, setMode] = useState('manual'); // 'manual' | 'camera'
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [headerSearch, setHeaderSearch] = useState('');
  const scannerRef = useRef(null);
  const scanningLock = useRef(false);

  const isAdmin = user?.role === 'superadmin';
  const breadcrumbs = isAdmin
    ? ['Admin', 'Verify Permit']
    : ['Staff', 'Verify Permit'];

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const formatCurrency = (val) => {
    if (val == null || val === '') return '—';
    return `$${Number(val).toLocaleString()}`;
  };

  const mapScanToResult = (payload) => {
    const app = payload?.application;
    const fd = app?.formData || {};
    const valid = !!payload?.valid;
    const reason = payload?.reason || '';
    const expiredByReason = /expired/i.test(reason);
    const expiredByDate = app?.expiryDate
      ? new Date(app.expiryDate) < new Date()
      : false;
    const expired = expiredByReason || expiredByDate;

    return {
      valid: valid && !expired,
      expired,
      status: expired ? 'Expired' : (app?.status || (valid ? 'Approved' : 'Invalid')),
      permitId: app?.permitId || payload?.log?.permitId || '',
      applicationId: app?.applicationId || payload?.log?.applicationId || '',
      applicant: app?.user?.fullName || fd.fullName || payload?.log?.applicantName || '—',
      district: app?.district || payload?.log?.district || '—',
      plotId: fd.plotId || '—',
      buildingCategory: fd.buildingCategory || '—',
      totalFee: fd.totalFee,
      approvedBy: app?.reviewedBy?.fullName || '—',
      approvalDate: app?.approvalDate,
      expiryDate: app?.expiryDate,
      qrPayload: app?.qrPayload,
      application: app,
      reason: expired && !reason ? 'Permit expired' : reason,
    };
  };

  const runScan = useCallback(async (rawCode) => {
    const trimmed = String(rawCode || '').trim();
    if (!trimmed) {
      setError('Enter a Permit ID, Application ID, or paste QR JSON.');
      setResult(null);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setCode(trimmed);

    try {
      const res = await axios.post(
        'http://localhost:5000/api/scans',
        { code: trimmed, source: 'web' },
        { headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` } }
      );

      if (res.data.success) {
        setResult(mapScanToResult(res.data.data));
      } else {
        setError(res.data.message || 'Verification failed');
        if (res.data.data) {
          setResult(mapScanToResult({
            valid: false,
            reason: res.data.message || res.data.data?.reason,
            log: res.data.data,
            application: null,
          }));
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to verify this permit.';
      setError(msg);
      const deniedLog = err.response?.data?.data;
      if (deniedLog) {
        setResult(mapScanToResult({
          valid: false,
          reason: deniedLog.reason || msg,
          log: deniedLog,
          application: null,
        }));
      }
    } finally {
      setLoading(false);
      scanningLock.current = false;
    }
  }, [token]);

  const handleVerify = async (e) => {
    e?.preventDefault();
    await runScan(code);
  };

  // Camera scanner lifecycle
  useEffect(() => {
    if (mode !== 'camera') {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      return undefined;
    }

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1,
        rememberLastUsedCamera: true,
      },
      false
    );
    scannerRef.current = scanner;

    scanner.render(
      async (decodedText) => {
        if (scanningLock.current) return;
        scanningLock.current = true;
        await runScan(decodedText);
        setTimeout(() => {
          scanningLock.current = false;
        }, 2500);
      },
      () => { /* ignore frame errors */ }
    );

    return () => {
      scanner.clear().catch(() => {});
      scannerRef.current = null;
    };
  }, [mode, runScan]);

  const verdict = (() => {
    if (!result) return null;
    if (result.expired) return 'expired';
    if (result.valid) return 'valid';
    return 'invalid';
  })();

  const applicationId = result?.application?._id;

  return (
    <div className="flex min-h-screen bg-bg-soft font-sans transition-colors duration-300">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader
          breadcrumbs={breadcrumbs}
          searchTerm={headerSearch}
          setSearchTerm={setHeaderSearch}
          placeholder="Search..."
        />

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-black text-navy tracking-tight mb-1">Verify Permit</h1>
              <p className="text-sm text-text-muted font-bold">
                Scan a QR code or enter a Permit ID to confirm authenticity.
              </p>
            </div>

            {/* Mode toggle */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'manual', label: 'Manual Entry', icon: Keyboard },
                { id: 'camera', label: 'Camera Scan', icon: Camera },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setMode(id);
                    setError('');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-black transition-all border ${
                    mode === id
                      ? 'bg-navy text-white border-navy shadow-md shadow-navy/20'
                      : 'bg-card-bg text-text-muted border-border-color hover:text-navy'
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {mode === 'manual' && (
              <form
                onSubmit={handleVerify}
                className="bg-card-bg rounded-2xl border border-border-color p-6 shadow-sm space-y-5"
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-3 rounded-xl bg-table-header-bg">
                    <QrCode size={20} className="text-navy" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Lookup</p>
                    <p className="text-sm font-bold text-navy">Enter code to verify</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                    Permit ID / Application ID / QR JSON
                  </label>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    rows={3}
                    placeholder='e.g. PER-2026-0001 or {"permitId":"PER-..."}'
                    className="w-full bg-bg-soft border border-border-color rounded-xl px-4 py-3 text-sm font-medium text-navy outline-none focus:ring-2 focus:ring-navy/20 resize-y min-h-[96px]"
                  />
                </div>

                {error && !result && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm font-bold text-rose-500">
                    <XCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-navy text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-navy/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Search size={16} />
                  {loading ? 'Verifying…' : 'Verify'}
                </button>
              </form>
            )}

            {mode === 'camera' && (
              <div className="bg-card-bg rounded-2xl border border-border-color p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-table-header-bg">
                    <Camera size={20} className="text-navy" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Scanner</p>
                    <p className="text-sm font-bold text-navy">Point camera at permit QR code</p>
                  </div>
                </div>

                <div
                  id="qr-reader"
                  className="w-full min-h-[320px] rounded-2xl overflow-hidden bg-black/5 border border-border-color"
                />

                {loading && (
                  <p className="text-sm font-bold text-text-muted text-center">Processing scan…</p>
                )}

                {error && !result && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm font-bold text-rose-500">
                    <XCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}

            {result && (
              <div className={`rounded-2xl border shadow-sm overflow-hidden ${
                verdict === 'valid'
                  ? 'border-emerald-500/30'
                  : verdict === 'expired'
                    ? 'border-amber-500/30'
                    : 'border-rose-500/30'
              }`}>
                <div className={`px-6 py-6 flex flex-wrap items-center justify-between gap-3 ${
                  verdict === 'valid'
                    ? 'bg-emerald-50'
                    : verdict === 'expired'
                      ? 'bg-[#FFF8EB]'
                      : 'bg-rose-50'
                }`}>
                  <div className="flex items-center gap-4">
                    {verdict === 'valid' && <CheckCircle2 className="text-emerald-500" size={40} />}
                    {verdict === 'expired' && <AlertTriangle className="text-amber-500" size={40} />}
                    {verdict === 'invalid' && <XCircle className="text-rose-500" size={40} />}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Scan Result</p>
                      <h2 className={`text-2xl font-black capitalize ${
                        verdict === 'valid' ? 'text-emerald-600' :
                        verdict === 'expired' ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {verdict === 'valid' ? 'Valid' : verdict === 'expired' ? 'Expired' : 'Failed'}
                      </h2>
                      {result.reason && (
                        <p className="text-sm font-bold text-text-muted mt-1">{result.reason}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-white border border-border-color text-navy">
                    Status: {result.status || '—'}
                  </span>
                </div>

                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 bg-white">
                  {[
                    { label: 'Permit ID', value: result.permitId || '—' },
                    { label: 'Application ID', value: result.applicationId || '—' },
                    { label: 'Applicant', value: result.applicant || '—' },
                    { label: 'District', value: result.district || '—' },
                    { label: 'Plot', value: result.plotId || '—' },
                    { label: 'Building', value: result.buildingCategory || '—' },
                    { label: 'Fee', value: formatCurrency(result.totalFee) },
                    { label: 'Approved By', value: result.approvedBy || '—' },
                    { label: 'Approval Date', value: formatDate(result.approvalDate) },
                    { label: 'Expiry Date', value: formatDate(result.expiryDate) },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{item.label}</p>
                      <p className="text-sm font-bold text-navy">{item.value}</p>
                    </div>
                  ))}
                </div>

                {result.valid && result.status === 'Approved' && result.qrPayload && (
                  <div className="mx-6 mb-6 flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                    <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-bold text-emerald-700">
                      QR payload present and verified — this QR code is valid for an approved permit.
                    </p>
                  </div>
                )}

                {applicationId && (
                  <div className="px-6 pb-6 flex flex-wrap gap-3 bg-white">
                    <Link
                      to={`/staff/review/${applicationId}`}
                      className="inline-flex items-center gap-2 bg-navy text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:brightness-110 transition-all"
                    >
                      Open Review <ExternalLink size={14} />
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin/all-permits"
                        className="inline-flex items-center gap-2 bg-card-bg border border-border-color text-navy px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-table-header-bg transition-all"
                      >
                        View in Admin <ExternalLink size={14} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifyPermit;
