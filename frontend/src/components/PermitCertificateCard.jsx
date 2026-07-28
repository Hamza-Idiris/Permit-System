import { forwardRef } from 'react';
import { formatApprovedTime, formatExpiryDate } from '../utils/permitCertificate';

const DetailRow = ({ label, value }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16,
      padding: '10px 0',
    }}
  >
    <span style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 500, flexShrink: 0 }}>{label}</span>
    <span
      style={{
        color: '#0B1F3A',
        fontSize: 15,
        fontWeight: 800,
        textAlign: 'right',
        wordBreak: 'break-word',
      }}
    >
      {value}
    </span>
  </div>
);

/**
 * Official approved-permit certificate card (matches mobile PNG design).
 */
const PermitCertificateCard = forwardRef(function PermitCertificateCard(
  { application, qrDataUrl },
  ref
) {
  if (!application) return null;

  const form = application.formData || {};
  const applicantName =
    application.user?.fullName ||
    (form.fullName && form.fullName !== 'Official Member' ? form.fullName : null) ||
    'N/A';
  const approvedBy = application.reviewedBy?.fullName || 'System';
  const permitId = application.permitId || application.applicationId || 'N/A';
  const district = form.district || application.district || 'N/A';
  const landArea = form.landArea != null ? `${form.landArea} m²` : '0 m²';

  return (
    <div
      ref={ref}
      style={{
        width: 420,
        background: '#F5F7FA',
        padding: 12,
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          background: '#22C55E',
          borderRadius: 12,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '2px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 16,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          ✓
        </div>
        <span style={{ color: 'white', fontWeight: 800, fontSize: 16, letterSpacing: 0.4 }}>
          OFFICIALLY APPROVED
        </span>
      </div>

      <div style={{ height: 20 }} />

      <div
        style={{
          background: 'white',
          borderRadius: 20,
          padding: 22,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          boxSizing: 'border-box',
        }}
      >
        <DetailRow label="Applicant Name" value={applicantName} />
        <DetailRow label="Plot ID" value={form.plotId || 'N/A'} />
        <DetailRow label="District Name" value={district} />
        <DetailRow label="Approved By" value={approvedBy} />
        <DetailRow label="Building Type" value={form.buildingCategory || 'N/A'} />
        <DetailRow label="Floors" value={String(form.floors ?? '1')} />
        <DetailRow label="Size" value={landArea} />
        <DetailRow
          label="Approved Time"
          value={formatApprovedTime(application.approvalDate || application.updatedAt)}
        />
        <DetailRow label="Expiry Date" value={formatExpiryDate(application.expiryDate)} />

        <div style={{ height: 1, background: '#E5E7EB', margin: '14px 0 18px' }} />

        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#0B1F3A', fontWeight: 800, fontSize: 18 }}>Official QR Code</div>
          <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
            For Inspector Verification Only
          </div>

          <div
            style={{
              display: 'inline-block',
              marginTop: 14,
              padding: '8px 14px',
              background: 'rgba(11, 31, 58, 0.05)',
              border: '1px solid rgba(11, 31, 58, 0.1)',
              borderRadius: 8,
              color: '#0B1F3A',
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: 0.5,
            }}
          >
            {permitId}
          </div>

          <div
            style={{
              margin: '16px auto 0',
              width: 230,
              height: 230,
              padding: 15,
              borderRadius: 15,
              border: '1px solid #E5E7EB',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Permit QR"
                style={{ width: 200, height: 200, objectFit: 'contain' }}
              />
            ) : (
              <div style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 700 }}>Loading QR…</div>
            )}
          </div>

          <div style={{ marginTop: 12, color: '#0B1F3A', fontWeight: 800, fontSize: 14 }}>
            Scan to Verify
          </div>
        </div>
      </div>
    </div>
  );
});

export default PermitCertificateCard;
