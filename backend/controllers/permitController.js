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
// @access  Private 
const applyForPermit = async (req, res) => {
  try {
    const {
      fullName, phone, email,
      plotId, district, buildingCategory,
      floors, landArea
    } = req.body;

    const files = req.files || {};

    if (!files.nationalId || !files.ownershipDocs) {
      return res.status(400).json({ success: false, message: 'Mandatory documents are missing' });
    }

    const documents = {
      nationalId: `/uploads/${files.nationalId[0].filename}`,
      ownershipDocs: `/uploads/${files.ownershipDocs[0].filename}`
    };

    // Calculate totalFee securely
    let totalFee = 0;
    const areaNum = Number(landArea) || 0;
    const floorsNum = Number(floors) || 1;

    // Use a more flexible matching for building categories
    const category = buildingCategory.toLowerCase();

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

    const applicationId = await generateApplicationId();

    const application = await PermitApplication.create({
      user: req.user._id,
      applicationId,
      status: 'Pending',
      district,
      formData: {
        fullName, phone, email, plotId, district, buildingCategory, floors, landArea, totalFee
      },
      documents
    });

    // Create automatic notification for the user
    await Notification.create({
      user: req.user._id,
      message: "Codsigaaga si guul leh ayaa loo diray. Fadlan sug inta laga hubinayo xogtaada.",
      type: 'Applied',
      relatedId: application._id
    });

    // Notify district staff about the new application
    try {
      const staffMembers = await User.find({
        role: 'staff',
        district: application.district
      });

      for (const staff of staffMembers) {
        await Notification.create({
          user: staff._id,
          message: `Codsi cusub (#${application.applicationId}) ayaa laga soo gudbiyay degmadaada (${application.district}).`,
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
      floors, landArea
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
      fullName, phone, email, plotId, district, buildingCategory, floors, landArea, totalFee
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
      message: `Codsigaaga ${application.applicationId} dib ayaa loo saxay oo la gudbiyay.`,
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
          message: `Codsiga ${application.applicationId} ee degmada ${application.district} dib ayaa loo saxay oo la soo gudbiyay.`,
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

      const qrPayload = {
        permitId,
        applicantName: application.formData.fullName,
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
        message: `Hambalyo! Codsigaaga ${application.applicationId} waa la ansixiyay. Hadda waad soo degsan kartaa shatigaaga.`,
        type: 'Approved',
        relatedId: application._id
      });

      // Notify the staff who approved it (activity history)
      await Notification.create({
        user: req.user._id,
        message: `Waxaad ansixisay codsiga #${application.applicationId} ee degmada ${application.district}.`,
        type: 'Success',
        relatedId: application._id
      });
    } else if (newStatus === 'Returned') {
      await Notification.create({
        user: application.user,
        message: `Codsigaaga ${application.applicationId} dib ayaa loo soo celiyay. Sababta: ${application.staffRemarks}`,
        type: 'Returned',
        relatedId: application._id
      });

      // Notify the staff who returned it
      await Notification.create({
        user: req.user._id,
        message: `Waxaad dib u soo celisay codsiga #${application.applicationId}. Sababta: ${application.staffRemarks}`,
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

module.exports = {
  applyForPermit,
  updateApplication,
  getMyApplications,
  getAllApplications,
  getApplicationById,
  getMyTransactions,
  reviewApplication,
  updateExpiryDate
};
