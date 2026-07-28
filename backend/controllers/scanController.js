const ScanLog = require('../models/ScanLog');
const User = require('../models/User');
const PermitApplication = require('../models/PermitApplication');

const resolveScanOutcome = async (codeRaw) => {
  let code = String(codeRaw || '').trim();
  let parsed = null;

  if (code.startsWith('{')) {
    try {
      parsed = JSON.parse(code);
      code = parsed.permitId || parsed.applicationId || code;
    } catch (_) { /* keep */ }
  }

  if (!code) {
    return { result: 'failed', reason: 'Empty code', code: '' };
  }

  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const application = await PermitApplication.findOne({
    $or: [
      { permitId: { $regex: new RegExp(`^${escaped}$`, 'i') } },
      { applicationId: { $regex: new RegExp(`^${escaped}$`, 'i') } }
    ]
  }).populate('user', 'fullName');

  if (!application) {
    return { result: 'failed', reason: 'Permit not found', code, permitId: '', applicationId: '', district: '', applicantName: '' };
  }

  const expired = application.expiryDate ? new Date(application.expiryDate) < new Date() : false;
  const success = application.status === 'Approved' && !expired;

  return {
    result: success ? 'success' : 'failed',
    reason: success
      ? 'Valid approved permit'
      : expired
        ? 'Permit expired'
        : `Status is ${application.status}`,
    code,
    permitId: application.permitId || '',
    applicationId: application.applicationId || '',
    district: application.district || '',
    applicantName: application.user?.fullName || application.formData?.fullName || '',
    application
  };
};

// @desc    Log a scan (inspector / staff / admin verify)
// @route   POST /api/scans
// @access  Private
const logScan = async (req, res) => {
  try {
    const { code, source = 'web' } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Scan code is required' });
    }

    const outcome = await resolveScanOutcome(code);

    // Staff can only log/verify their district
    if (req.user.role === 'staff' && outcome.district && outcome.district !== req.user.district) {
      const denied = await ScanLog.create({
        inspector: req.user._id,
        code: outcome.code || String(code).slice(0, 200),
        permitId: outcome.permitId,
        applicationId: outcome.applicationId,
        district: outcome.district,
        result: 'failed',
        reason: 'Outside your district',
        source,
        applicantName: outcome.applicantName
      });
      return res.status(403).json({
        success: false,
        message: 'This permit is outside your district',
        data: denied
      });
    }

    const log = await ScanLog.create({
      inspector: req.user._id,
      code: outcome.code || String(code).slice(0, 200),
      permitId: outcome.permitId,
      applicationId: outcome.applicationId,
      district: outcome.district,
      result: outcome.result,
      reason: outcome.reason,
      source,
      applicantName: outcome.applicantName
    });

    res.status(201).json({
      success: true,
      data: {
        log,
        valid: outcome.result === 'success',
        application: outcome.application || null,
        reason: outcome.reason
      }
    });
  } catch (error) {
    console.error('Log Scan Error:', error);
    res.status(500).json({ success: false, message: 'Server Error logging scan' });
  }
};

// @desc    Inspector / admin scan stats & history
// @route   GET /api/scans/stats
// @access  Private (superadmin, staff, inspector)
const getScanStats = async (req, res) => {
  try {
    const { inspectorId, range = '30', startDate, endDate } = req.query;
    let start = new Date();
    let end = new Date();

    if (range === 'today') start.setHours(0, 0, 0, 0);
    else if (range === '7') start.setDate(start.getDate() - 7);
    else if (range === '90') start.setDate(start.getDate() - 90);
    else if (range === 'all') start = new Date(2000, 0, 1);
    else if (range === 'custom' && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else start.setDate(start.getDate() - 30);

    const match = { scannedAt: { $gte: start, $lte: end } };

    if (req.user.role === 'inspector') {
      match.inspector = req.user._id;
    } else if (req.user.role === 'staff') {
      // Staff sees scans in their district
      match.district = req.user.district;
    } else if (inspectorId) {
      match.inspector = inspectorId;
    }

    const [summary] = await ScanLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          success: { $sum: { $cond: [{ $eq: ['$result', 'success'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$result', 'failed'] }, 1, 0] } }
        }
      }
    ]);

    const byInspector = await ScanLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$inspector',
          total: { $sum: 1 },
          success: { $sum: { $cond: [{ $eq: ['$result', 'success'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$result', 'failed'] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const inspectorIds = byInspector.map(i => i._id);
    const inspectors = await User.find({ _id: { $in: inspectorIds } }).select('fullName email phone district role');
    const inspectorMap = Object.fromEntries(inspectors.map(u => [u._id.toString(), u]));

    const inspectorStats = byInspector.map(row => ({
      inspectorId: row._id,
      fullName: inspectorMap[row._id?.toString()]?.fullName || 'Unknown',
      email: inspectorMap[row._id?.toString()]?.email || '',
      phone: inspectorMap[row._id?.toString()]?.phone || '',
      district: inspectorMap[row._id?.toString()]?.district || '',
      total: row.total,
      success: row.success,
      failed: row.failed
    }));

    const logs = await ScanLog.find(match)
      .sort({ scannedAt: -1 })
      .limit(500)
      .populate('inspector', 'fullName email district');

    res.json({
      success: true,
      summary: summary || { total: 0, success: 0, failed: 0 },
      inspectorStats,
      logs
    });
  } catch (error) {
    console.error('Scan Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching scan stats' });
  }
};

// @desc    Reset all scans for an inspector (totals go to zero)
// @route   DELETE /api/scans/inspector/:id
// @access  Private/SuperAdmin
const resetInspectorScans = async (req, res) => {
  try {
    const inspector = await User.findById(req.params.id);
    if (!inspector || inspector.role !== 'inspector') {
      return res.status(404).json({ success: false, message: 'Inspector not found' });
    }

    const result = await ScanLog.deleteMany({ inspector: inspector._id });

    res.json({
      success: true,
      message: `Scan history reset for ${inspector.fullName}. Totals are now zero.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Reset Scans Error:', error);
    res.status(500).json({ success: false, message: 'Server Error resetting scans' });
  }
};

module.exports = {
  logScan,
  getScanStats,
  resetInspectorScans,
  resolveScanOutcome
};
