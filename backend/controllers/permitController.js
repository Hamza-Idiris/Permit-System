const PermitApplication = require('../models/PermitApplication');
const Notification = require('../models/Notification');
const User = require('../models/User');
const District = require('../models/District');

// Helper to generate unique Application ID
const generateApplicationId = async () => {
  const currentYear = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const appId = `MOG-${currentYear}-${randomNum}`;

  const existing = await PermitApplication.findOne({ applicationId: appId });
  if (existing) {
    return generateApplicationId();
  }
  return appId;
};

// @desc    Submit new permit application
// @route   POST /api/permits/apply
// @access  Private (applicant | staff | superadmin)
const applyForPermit = async (req, res) => {
  try {
    const {
      fullName, phone, email,
      plotId, district, buildingCategory,
      floors, landArea, requestType, applicantId
    } = req.body;

    const files = req.files || {};

    if (!files.nationalId || !files.ownershipDocs) {
      return res.status(400).json({ success: false, message: 'Mandatory documents are missing' });
    }

    // Staff / superadmin may submit on behalf of an applicant
    let targetUserId = req.user._id;
    let applicantName = fullName;
    let applicantPhone = phone;
    let applicantEmail = email;
    const isOnBehalf = req.user.role === 'staff' || req.user.role === 'superadmin';

    if (isOnBehalf && applicantId) {
      const applicant = await User.findById(applicantId);
      if (!applicant || applicant.role !== 'applicant') {
        return res.status(400).json({ success: false, message: 'Invalid applicant selected' });
      }
      targetUserId = applicant._id;
      applicantName = fullName || applicant.fullName;
      applicantPhone = phone || applicant.phone;
      applicantEmail = email || applicant.email;
    } else if (req.user.role === 'staff' && !applicantId) {
      return res.status(400).json({ success: false, message: 'Please select or register an applicant' });
    }

    // Staff can only create applications for their assigned district
    let applicationDistrict = district;
    if (req.user.role === 'staff') {
      if (!req.user.district) {
        return res.status(400).json({ success: false, message: 'Your account has no district assigned' });
      }
      applicationDistrict = req.user.district;
    }

    if (!applicationDistrict) {
      return res.status(400).json({ success: false, message: 'District is required' });
    }

    const documents = {
      nationalId: `/uploads/${files.nationalId[0].filename}`,
      ownershipDocs: `/uploads/${files.ownershipDocs[0].filename}`
    };

    // Calculate totalFee securely or use paid totalFee
    let totalFee = 0;
    if (req.body.totalFee !== undefined && req.body.totalFee !== null && !isNaN(Number(req.body.totalFee))) {
      totalFee = Number(req.body.totalFee);
    } else {
      const areaNum = Number(landArea) || 0;
      const floorsNum = Number(floors) || 1;

      // Use a more flexible matching for building categories
      const category = (buildingCategory || '').toLowerCase();

      if (category.includes('jiingad') || category.includes('bulukeeti')) {
        totalFee = areaNum * 0.5;
      } else if (category.includes('dhagax')) {
        totalFee = areaNum * 0.6;
      } else if (category.includes('dabaq')) {
        totalFee = (areaNum * 2.5) * (floorsNum || 1);
      } else {
        // Fallback default calculation if category is unknown but area is present
        totalFee = areaNum * 0.5;
      }
    }

    const applicationId = await generateApplicationId();

    const application = await PermitApplication.create({
      user: targetUserId,
      applicationId,
      status: 'Pending',
      district: applicationDistrict,
      formData: {
        fullName: applicantName,
        phone: applicantPhone,
        email: applicantEmail,
        plotId,
        district: applicationDistrict,
        buildingCategory,
        floors,
        landArea,
        totalFee,
        requestType: requestType || 'New Construction'
      },
      documents
    });

    // Notify the applicant (owner of the application)
    await Notification.create({
      user: targetUserId,
      message: isOnBehalf && targetUserId.toString() !== req.user._id.toString()
        ? `Your application (#${application.applicationId}) was submitted by district staff. Please wait while it is reviewed.`
        : "Your application was submitted successfully. Please wait while your information is reviewed.",
      type: 'Applied',
      relatedId: application._id
    });

    // Notify district staff about the new application (skip the submitting staff)
    try {
      const staffMembers = await User.find({
        role: 'staff',
        district: application.district
      });

      for (const staff of staffMembers) {
        if (staff._id.toString() === req.user._id.toString()) continue;
        await Notification.create({
          user: staff._id,
          message: `A new application (#${application.applicationId}) was submitted for your district (${application.district}).`,
          type: 'Info',
          relatedId: application._id
        });
      }
    } catch (notifyError) {
      console.error('Error notifying staff:', notifyError);
    }

    res.status(201).json({ success: true, data: application });

  } catch (error) {
    console.error('Permit Application Error:', error);
    res.status(500).json({ success: false, message: 'Server Error processing application.' });
  }
};

// @desc    Update existing permit application (For Returned apps)
// @route   PUT /api/permits/:id
// @access  Private 
const updateApplication = async (req, res) => {
  try {
    const {
      fullName, phone, email,
      plotId, district, buildingCategory,
      floors, landArea, requestType
    } = req.body;

    const application = await PermitApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this application' });
    }

    // Retain existing totalFee unless provided in body (for core changes)
    const totalFee = req.body.totalFee !== undefined ? Number(req.body.totalFee) : application.formData.totalFee;

    const files = req.files || {};
    let documents = { ...application.documents };

    if (files.nationalId) documents.nationalId = `/uploads/${files.nationalId[0].filename}`;
    if (files.ownershipDocs) documents.ownershipDocs = `/uploads/${files.ownershipDocs[0].filename}`;

    application.formData = {
      fullName, phone, email, plotId, district, buildingCategory, floors, landArea, totalFee, requestType: requestType || application.formData.requestType
    };
    application.documents = documents;
    application.status = 'Pending';
    application.staffRemarks = '';
    application.isResubmitted = true;
    application.paymentStatus = 'Paid';

    await application.save();

    // Create automatic notification for the applicant
    await Notification.create({
      user: req.user._id,
      message: `Your application ${application.applicationId} was corrected and resubmitted.`,
      type: 'Applied',
      relatedId: application._id
    });

    // Notify district staff and superadmins that an application has been updated/resubmitted
    try {
      const staffAndAdmins = await User.find({
        $or: [
          { role: 'staff', district: application.district },
          { role: 'superadmin' }
        ]
      });

      for (const staff of staffAndAdmins) {
        await Notification.create({
          user: staff._id,
          message: `Application ${application.applicationId} for district ${application.district} was corrected and resubmitted.`,
          type: 'Alert',
          relatedId: application._id
        });
      }
    } catch (notifyError) {
      console.error('Error notifying staff/admins:', notifyError);
    }

    res.status(200).json({ success: true, data: application });

  } catch (error) {
    console.error('Update Application Error:', error);
    res.status(500).json({ success: false, message: 'Server Error updating application.' });
  }
};

// @desc    Get all applications for the logged-in user
// @route   GET /api/permits/my-applications
// @access  Private
const getMyApplications = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch applications
    const applications = await PermitApplication.find({ user: userId })
      .populate('user', 'fullName email phone')
      .populate('reviewedBy', 'fullName role')
      .sort({ updatedAt: -1 });

    // Aggregate statistics
    const stats = await PermitApplication.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] } },
          underReview: { $sum: { $cond: [{ $eq: ["$status", "Under Review"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $in: ["$status", ["Pending", "Rejected"]] }, 1, 0] } },
        }
      }
    ]);

    const dashboardStats = stats.length > 0 ? stats[0] : { total: 0, approved: 0, underReview: 0, pending: 0 };

    res.status(200).json({
      success: true,
      count: applications.length,
      stats: dashboardStats,
      data: applications
    });
  } catch (error) {
    console.error('Fetch Applications Error:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching applications.' });
  }
};

// @desc    Get all applications (Staff/Admin)
// @route   GET /api/permits/all
// @access  Private/Staff
const getAllApplications = async (req, res) => {
  try {
    let filter = {};

    // Scoping logic: Super Admin sees all districts, Staff (Officer) sees only their assigned district
    if (req.user.role === 'superadmin') {
      filter = {};
    } else if (req.user.role === 'staff' || req.user.role === 'Officer') {
      filter = { district: req.user.district };
    } else {
      // For any other role, filter by district if it exists
      filter = req.user.district ? { district: req.user.district } : {};
    }

    const applications = await PermitApplication.find(filter)
      .populate('user', 'fullName email phone')
      .populate('reviewedBy', 'fullName role')
      .sort({ createdAt: -1 });

    const stats = await PermitApplication.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] } },
          inReview: { $sum: { $cond: [{ $eq: ["$status", "In Review"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
          returned: { $sum: { $cond: [{ $eq: ["$status", "Returned"] }, 1, 0] } },
        }
      }
    ]);

    const dashboardStats = stats.length > 0 ? stats[0] : { total: 0, approved: 0, inReview: 0, pending: 0, returned: 0 };

    res.status(200).json({ success: true, count: applications.length, stats: dashboardStats, data: applications });
  } catch (error) {
    console.error('Fetch All Error:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching all applications.' });
  }
};


// @desc    Get single application by ID
// @route   GET /api/permits/:id
// @access  Private
const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    let application;

    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) {
      application = await PermitApplication.findById(id)
        .populate('user', 'fullName email phone')
        .populate('reviewedBy', 'fullName role');
    }

    if (!application) {
      application = await PermitApplication.findOne({
        $or: [
          { permitId: { $regex: new RegExp(`^${id}$`, 'i') } },
          { applicationId: { $regex: new RegExp(`^${id}$`, 'i') } }
        ]
      }).populate('user', 'fullName email phone')
        .populate('reviewedBy', 'fullName role');
    }

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (req.user.role === 'Applicant' && application.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this application' });
    }

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    console.error('Fetch Single Error:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching application.' });
  }
};

const reviewApplication = async (req, res) => {
  try {
    const { status, staffRemarks } = req.body;
    const application = await PermitApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const mongoose = require('mongoose');
    const oldStatus = application.status;
    const newStatus = status || application.status;

    // Check if status transitioned away from 'Approved' to 'Returned', 'Pending', or similar
    if (oldStatus === 'Approved' && newStatus !== 'Approved') {
      application.lastApprovalDate = application.approvalDate;
      application.lastReviewedBy = application.reviewedBy;
      application.lastExpiryDate = application.expiryDate;
      application.lastPermitId = application.permitId;
      application.lastQrData = application.qrData;

      // Clear current ones
      application.approvalDate = undefined;
      application.reviewedBy = undefined;
      application.expiryDate = undefined;
      application.permitId = undefined;
      application.qrData = undefined;
    }

    application.status = newStatus;
    application.staffRemarks = staffRemarks !== undefined ? staffRemarks : application.staffRemarks;

    if (newStatus === 'Approved') {
      if (application.lastApprovalDate && application.lastReviewedBy && application.lastExpiryDate) {
        // Restore last approval details!
        application.approvalDate = application.lastApprovalDate;
        application.reviewedBy = application.lastReviewedBy;
        application.expiryDate = application.lastExpiryDate;
        application.permitId = application.lastPermitId;
        application.qrData = application.lastQrData;
      } else {
        // Generate new approval details!
        application.approvalDate = new Date();
        application.reviewedBy = req.user._id;
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        application.expiryDate = expiry;
      }
    }

    // Generate permitId and secure qrData on Approval ONLY if they don't already exist
    if (newStatus === 'Approved' && !application.permitId) {
      const crypto = require('crypto');
      const districtObj = await District.findOne({ name: application.district });
      const distCode = districtObj ? districtObj.code.toUpperCase() : 'MUBP';

      let permitId;
      let exists = true;
      while (exists) {
        permitId = `${distCode}-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5)}`;
        const dup = await PermitApplication.findOne({ permitId });
        if (!dup) exists = false;
      }

      const isDabaq = application.formData.buildingCategory.toLowerCase().includes('dabaq');
      const approvedTime = application.approvalDate ? application.approvalDate.toISOString() : new Date().toISOString();

      let approvedByName = 'System';
      if (application.reviewedBy) {
        const User = mongoose.model('User');
        const reviewer = await User.findById(application.reviewedBy);
        if (reviewer) approvedByName = reviewer.fullName;
      } else {
        approvedByName = req.user.fullName;
      }

      // Resolve the real applicant name from the User collection so we never
      // embed the fallback placeholder ('Official Member') into the QR code.
      let applicantName = application.formData.fullName;
      try {
        const UserModel = mongoose.model('User');
        const applicantUser = await UserModel.findById(application.user);
        if (applicantUser && applicantUser.fullName) {
          applicantName = applicantUser.fullName;
        }
      } catch (nameErr) {
        console.error('Could not resolve applicant name from User model:', nameErr);
      }

      const qrPayload = {
        permitId,
        applicantName,
        approvedBy: approvedByName,
        district: application.district,
        plotId: application.formData.plotId,
        buildingType: application.formData.buildingCategory,
        landArea: `${application.formData.landArea} m²`,
        ...(isDabaq && { floors: application.formData.floors }),
        approvedTime,
        expiryDate: application.expiryDate ? application.expiryDate.toISOString() : new Date().toISOString()
      };

      application.permitId = permitId;
      application.qrData = JSON.stringify(qrPayload);
    }

    await application.save();

    // Automatic Notification Trigger
    if (newStatus === 'Approved') {
      await Notification.create({
        user: application.user,
        message: `Congratulations! Your application ${application.applicationId} has been approved. You can now download your permit.`,
        type: 'Approved',
        relatedId: application._id
      });

      // Notify the staff who approved it (activity history)
      await Notification.create({
        user: req.user._id,
        message: `You approved application #${application.applicationId} for district ${application.district}.`,
        type: 'Success',
        relatedId: application._id
      });
    } else if (newStatus === 'Returned') {
      await Notification.create({
        user: application.user,
        message: `Your application ${application.applicationId} was returned. Reason: ${application.staffRemarks}`,
        type: 'Returned',
        relatedId: application._id
      });

      // Notify the staff who returned it
      await Notification.create({
        user: req.user._id,
        message: `You returned application #${application.applicationId}. Reason: ${application.staffRemarks}`,
        type: 'Alert',
        relatedId: application._id
      });
    }

    const populatedApp = await PermitApplication.findById(application._id)
      .populate('user', 'fullName email phone')
      .populate('reviewedBy', 'fullName role');

    res.status(200).json({ success: true, data: populatedApp });
  } catch (error) {
    console.error('Review Error:', error);
    res.status(500).json({ success: false, message: 'Server Error reviewing application.' });
  }
};

const getMyTransactions = async (req, res) => {
  try {
    const applications = await PermitApplication.find({ user: req.user._id }).sort('-createdAt');

    // Map applications to a "transaction" format for the mobile app's fees table
    const transactions = applications.map(app => ({
      _id: app._id,
      applicationId: app.applicationId,
      amount: app.formData.totalFee,
      category: app.formData.buildingCategory,
      status: app.status === 'Approved' ? 'Paid' : 'Pending',
      date: app.createdAt
    }));

    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    console.error('Fetch Transactions Error:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching transaction history.' });
  }
};

const updateExpiryDate = async (req, res) => {
  try {
    const { expiryDate } = req.body;
    if (!expiryDate) {
      return res.status(400).json({ success: false, message: 'Expiry date is required' });
    }

    const application = await PermitApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    application.expiryDate = new Date(expiryDate);

    // If it's already approved, update the qrData payload with the new expiry date
    if (application.status === 'Approved' && application.qrData) {
      try {
        const qrPayload = JSON.parse(application.qrData);
        qrPayload.expiryDate = application.expiryDate.toISOString();
        application.qrData = JSON.stringify(qrPayload);
      } catch (err) {
        console.error('Error updating qrData expiry time', err);
      }
    }

    await application.save();

    res.status(200).json({
      success: true,
      message: 'Expiry date updated successfully',
      data: application
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Verify permit by permitId, applicationId, or QR JSON payload
// @route   POST /api/permits/verify  |  GET /api/permits/verify/:code
// @access  Private (staff, superadmin, inspector)
const verifyPermit = async (req, res) => {
  try {
    let code = req.params.code || req.body.code || req.body.permitId || req.query.code || '';
    code = String(code).trim();

    // If full QR JSON pasted, extract permitId
    if (code.startsWith('{')) {
      try {
        const parsed = JSON.parse(code);
        code = parsed.permitId || parsed.applicationId || code;
      } catch (_) { /* keep raw */ }
    }

    if (!code) {
      return res.status(400).json({ success: false, message: 'Permit ID or QR code data is required' });
    }

    let application = await PermitApplication.findOne({
      $or: [
        { permitId: { $regex: new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { applicationId: { $regex: new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
      ]
    })
      .populate('user', 'fullName email phone')
      .populate('reviewedBy', 'fullName role');

    if (!application) {
      return res.status(404).json({ success: false, message: 'No permit found for this ID' });
    }

    // Staff can only verify permits in their district
    if (req.user.role === 'staff' && application.district !== req.user.district) {
      return res.status(403).json({ success: false, message: 'This permit is outside your district' });
    }

    let qrPayload = null;
    if (application.qrData) {
      try { qrPayload = JSON.parse(application.qrData); } catch (_) { qrPayload = application.qrData; }
    }

    const now = new Date();
    const expired = application.expiryDate ? new Date(application.expiryDate) < now : false;

    res.json({
      success: true,
      data: {
        valid: application.status === 'Approved' && !expired,
        status: application.status,
        expired,
        permitId: application.permitId,
        applicationId: application.applicationId,
        district: application.district,
        applicant: application.user?.fullName || application.formData?.fullName,
        phone: application.user?.phone || application.formData?.phone,
        plotId: application.formData?.plotId,
        buildingCategory: application.formData?.buildingCategory,
        floors: application.formData?.floors,
        landArea: application.formData?.landArea,
        totalFee: application.formData?.totalFee,
        approvalDate: application.approvalDate,
        expiryDate: application.expiryDate,
        approvedBy: application.reviewedBy?.fullName || null,
        qrPayload,
        application
      }
    });
  } catch (error) {
    console.error('Verify Permit Error:', error);
    res.status(500).json({ success: false, message: 'Server Error verifying permit' });
  }
};

// @desc    List expired approved permits eligible for renew (applicant)
// @route   GET /api/permits/renewable
// @access  Private (applicant, staff, superadmin)
const getRenewablePermits = async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      status: 'Approved',
      expiryDate: { $lt: now }
    };

    if (req.user.role === 'applicant') {
      filter.user = req.user._id;
    } else if (req.user.role === 'staff') {
      filter.district = req.user.district;
    } else if (req.query.userId) {
      filter.user = req.query.userId;
    }

    const apps = await PermitApplication.find(filter)
      .sort({ expiryDate: -1 })
      .populate('user', 'fullName phone email')
      .select('applicationId permitId district formData expiryDate approvalDate documents user createdAt');

    res.json({ success: true, count: apps.length, data: apps });
  } catch (error) {
    console.error('Renewable list error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Renew an expired approved permit (copy data, new application, Renew fee)
// @route   POST /api/permits/renew/:id
// @access  Private (applicant owns it | staff | superadmin)
const renewPermit = async (req, res) => {
  try {
    const original = await PermitApplication.findById(req.params.id);
    if (!original) {
      return res.status(404).json({ success: false, message: 'Original permit not found' });
    }

    if (original.status !== 'Approved') {
      return res.status(400).json({ success: false, message: 'Only approved permits can be renewed' });
    }
    if (!original.expiryDate || new Date(original.expiryDate) >= new Date()) {
      return res.status(400).json({ success: false, message: 'Permit is not expired yet' });
    }

    if (req.user.role === 'applicant' && original.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to renew this permit' });
    }
    if (req.user.role === 'staff' && original.district !== req.user.district) {
      return res.status(403).json({ success: false, message: 'Outside your district' });
    }

    const RenewType = require('../models/RenewType');
    const { resolveDiscountPercent } = require('./discountController');

    const category = original.formData.buildingCategory;
    const landArea = Number(original.formData.landArea) || 0;
    const floors = Number(original.formData.floors) || 1;

    let renewType = await RenewType.findOne({ name: { $regex: new RegExp(`^${category}$`, 'i') } });
    if (!renewType) {
      // fallback: first renew type or use building-type style default
      renewType = await RenewType.findOne().sort({ createdAt: 1 });
    }

    let totalFee = 0;
    if (req.body.totalFee !== undefined && !isNaN(Number(req.body.totalFee))) {
      totalFee = Number(req.body.totalFee);
    } else if (renewType) {
      const mult = Number(renewType.feeMultiplier) || 0;
      totalFee = renewType.isPerFloor ? landArea * mult * floors : landArea * mult;
      const discountPct = await resolveDiscountPercent('Renew', renewType.name);
      if (discountPct > 0) totalFee = totalFee * (1 - discountPct / 100);
    } else {
      totalFee = landArea * 0.5;
    }
    totalFee = Math.round(totalFee * 100) / 100;

    const applicationId = await generateApplicationId();

    const application = await PermitApplication.create({
      user: original.user,
      applicationId,
      status: 'Pending',
      district: original.district,
      renewedFrom: original._id,
      formData: {
        ...original.formData.toObject?.() || original.formData,
        requestType: 'Renew',
        buildingCategory: renewType?.name || category,
        totalFee
      },
      documents: {
        nationalId: original.documents.nationalId,
        ownershipDocs: original.documents.ownershipDocs
      },
      paymentStatus: 'Paid'
    });

    await Notification.create({
      user: original.user,
      message: `Your renew application (#${application.applicationId}) for expired permit ${original.permitId || original.applicationId} was submitted successfully.`,
      type: 'Applied',
      relatedId: application._id
    });

    try {
      const staffMembers = await User.find({ role: 'staff', district: application.district });
      for (const staff of staffMembers) {
        await Notification.create({
          user: staff._id,
          message: `Renew application (#${application.applicationId}) submitted for district ${application.district}.`,
          type: 'Info',
          relatedId: application._id
        });
      }
    } catch (_) { /* ignore */ }

    res.status(201).json({ success: true, data: application, renewedFrom: original.applicationId });
  } catch (error) {
    console.error('Renew Permit Error:', error);
    res.status(500).json({ success: false, message: 'Server Error renewing permit' });
  }
};

// @desc    Quote renew fee without creating application
// @route   GET /api/permits/renew/:id/quote
const quoteRenewFee = async (req, res) => {
  try {
    const original = await PermitApplication.findById(req.params.id);
    if (!original) return res.status(404).json({ success: false, message: 'Permit not found' });

    const RenewType = require('../models/RenewType');
    const { resolveDiscountPercent } = require('./discountController');

    const category = original.formData.buildingCategory;
    const landArea = Number(original.formData.landArea) || 0;
    const floors = Number(original.formData.floors) || 1;
    let renewType = await RenewType.findOne({ name: { $regex: new RegExp(`^${category}$`, 'i') } });
    if (!renewType) renewType = await RenewType.findOne().sort({ createdAt: 1 });

    let baseFee = 0;
    if (renewType) {
      const mult = Number(renewType.feeMultiplier) || 0;
      baseFee = renewType.isPerFloor ? landArea * mult * floors : landArea * mult;
    } else {
      baseFee = landArea * 0.5;
    }
    const discountPct = renewType ? await resolveDiscountPercent('Renew', renewType.name) : 0;
    const totalFee = Math.round(baseFee * (1 - discountPct / 100) * 100) / 100;

    res.json({
      success: true,
      data: {
        baseFee: Math.round(baseFee * 100) / 100,
        discountPercent: discountPct,
        totalFee,
        renewType: renewType?.name || category,
        landArea,
        floors,
        originalApplicationId: original.applicationId,
        permitId: original.permitId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  applyForPermit,
  updateApplication,
  getMyApplications,
  getAllApplications,
  getApplicationById,
  getMyTransactions,
  reviewApplication,
  updateExpiryDate,
  verifyPermit,
  getRenewablePermits,
  renewPermit,
  quoteRenewFee
};
