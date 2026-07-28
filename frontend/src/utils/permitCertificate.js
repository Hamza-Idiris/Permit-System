/**
 * Draws the official approved-permit certificate onto a canvas
 * (same layout as the mobile PNG / Flutter certificate).
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatApprovedTime = (iso) => {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'N/A';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
  } catch {
    return 'N/A';
  }
};

export const formatExpiryDate = (iso) => {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return 'N/A';
  }
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

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

const drawDetailRow = (ctx, label, value, x, y, width) => {
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '500 14px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y);

  ctx.fillStyle = '#0B1F3A';
  ctx.font = '800 15px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  const maxValueWidth = width * 0.55;
  let display = String(value ?? 'N/A');
  while (ctx.measureText(display).width > maxValueWidth && display.length > 3) {
    display = `${display.slice(0, -4)}…`;
  }
  ctx.fillText(display, x + width, y);
  ctx.textAlign = 'left';
};

/**
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderPermitCertificateCanvas(application, qrDataUrl) {
  const scale = 2;
  const width = 420;
  const padding = 12;
  const cardPad = 22;
  const rowH = 36;
  const rows = 9;
  const qrBox = 230;
  const contentWidth = width - padding * 2 - cardPad * 2;

  // Approximate total height
  const bannerH = 52;
  const headerGap = 18;
  const rowsBlock = rows * rowH;
  const dividerGap = 28;
  const qrSectionTop = 86;
  const qrSectionBottom = 36;
  const height =
    padding * 2 +
    bannerH +
    headerGap +
    cardPad +
    rowsBlock +
    dividerGap +
    qrSectionTop +
    qrBox +
    qrSectionBottom +
    cardPad;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Page background
  ctx.fillStyle = '#F5F7FA';
  ctx.fillRect(0, 0, width, height);

  // Green banner
  const bannerX = padding;
  const bannerY = padding;
  const bannerW = width - padding * 2;
  ctx.fillStyle = '#22C55E';
  roundRect(ctx, bannerX, bannerY, bannerW, bannerH, 12);
  ctx.fill();

  // Check circle
  const cy = bannerY + bannerH / 2;
  const cx = bannerX + bannerW / 2 - 95;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✓', cx, cy + 1);

  ctx.font = '800 16px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.fillText('OFFICIALLY APPROVED', cx + 22, cy);

  // White card
  const cardX = padding;
  const cardY = bannerY + bannerH + headerGap;
  const cardW = width - padding * 2;
  const cardH = height - cardY - padding;

  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const form = application.formData || {};
  const applicantName =
    application.user?.fullName ||
    (form.fullName && form.fullName !== 'Official Member' ? form.fullName : null) ||
    'N/A';
  const approvedBy = application.reviewedBy?.fullName || 'System';
  const permitId = application.permitId || application.applicationId || 'N/A';
  const district = form.district || application.district || 'N/A';
  const landArea = form.landArea != null ? `${form.landArea} m²` : '0 m²';

  const details = [
    ['Applicant Name', applicantName],
    ['Plot ID', form.plotId || 'N/A'],
    ['District Name', district],
    ['Approved By', approvedBy],
    ['Building Type', form.buildingCategory || 'N/A'],
    ['Floors', String(form.floors ?? '1')],
    ['Size', landArea],
    ['Approved Time', formatApprovedTime(application.approvalDate || application.updatedAt)],
    ['Expiry Date', formatExpiryDate(application.expiryDate)],
  ];

  let y = cardY + cardPad + 22;
  const rowX = cardX + cardPad;
  details.forEach(([label, value]) => {
    drawDetailRow(ctx, label, value, rowX, y, contentWidth);
    y += rowH;
  });

  // Divider
  y += 4;
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rowX, y);
  ctx.lineTo(rowX + contentWidth, y);
  ctx.stroke();
  y += 28;

  // QR section
  ctx.fillStyle = '#0B1F3A';
  ctx.font = '800 18px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Official QR Code', width / 2, y);
  y += 22;
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '500 12px Inter, system-ui, sans-serif';
  ctx.fillText('For Inspector Verification Only', width / 2, y);
  y += 24;

  // Permit ID badge
  ctx.font = '800 15px Inter, system-ui, sans-serif';
  const idText = String(permitId);
  const idWidth = Math.max(ctx.measureText(idText).width + 28, 120);
  const idHeight = 34;
  const idX = (width - idWidth) / 2;
  ctx.fillStyle = 'rgba(11, 31, 58, 0.05)';
  roundRect(ctx, idX, y, idWidth, idHeight, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(11, 31, 58, 0.1)';
  ctx.lineWidth = 1;
  roundRect(ctx, idX, y, idWidth, idHeight, 8);
  ctx.stroke();
  ctx.fillStyle = '#0B1F3A';
  ctx.textBaseline = 'middle';
  ctx.fillText(idText, width / 2, y + idHeight / 2);
  y += idHeight + 18;

  // QR box
  const qrBoxX = (width - qrBox) / 2;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, qrBoxX, y, qrBox, qrBox, 15);
  ctx.fill();
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  roundRect(ctx, qrBoxX, y, qrBox, qrBox, 15);
  ctx.stroke();

  if (qrDataUrl) {
    const qrImg = await loadImage(qrDataUrl);
    const qrSize = 200;
    const qrPad = (qrBox - qrSize) / 2;
    ctx.drawImage(qrImg, qrBoxX + qrPad, y + qrPad, qrSize, qrSize);
  }

  y += qrBox + 22;
  ctx.fillStyle = '#0B1F3A';
  ctx.font = '800 14px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Scan to Verify', width / 2, y);

  return canvas;
}

export function downloadCanvasPng(canvas, filename) {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
