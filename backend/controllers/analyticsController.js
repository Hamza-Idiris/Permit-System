const PermitApplication = require('../models/PermitApplication');
const User = require('../models/User');
const District = require('../models/District');

const buildDateFilter = (query) => {
  const { range, startDate: customStart, endDate: customEnd } = query;
  let startDate = new Date();
  let endDate = new Date();

  if (range === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (range === '7') {
    startDate.setDate(startDate.getDate() - 7);
  } else if (range === '30') {
    startDate.setDate(startDate.getDate() - 30);
  } else if (range === '90') {
    startDate.setDate(startDate.getDate() - 90);
  } else if (range === 'year') {
    startDate = new Date(new Date().getFullYear(), 0, 1);
  } else if (range === 'all') {
    startDate = new Date(2000, 0, 1);
  } else if ((range === 'custom' || customStart) && customStart && customEnd) {
    startDate = new Date(customStart);
    endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate.setDate(startDate.getDate() - 30);
  }

  return { createdAt: { $gte: startDate, $lte: endDate } };
};

const scopeFilter = (req, base = {}) => {
  const filter = { ...base };
  const districtParam = req.query.district;

  if (req.user.role === 'staff') {
    filter.district = req.user.district;
  } else if (districtParam && districtParam !== 'all') {
    filter.district = districtParam;
  }

  if (req.query.status && req.query.status !== 'all') {
    if (req.query.status === 'Pending') {
      filter.status = { $in: ['Pending', 'In Review'] };
    } else {
      filter.status = req.query.status;
    }
  }

  if (req.query.requestType && req.query.requestType !== 'all') {
    if (req.query.requestType === 'New Construction') {
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { 'formData.requestType': 'New Construction' },
            { 'formData.requestType': { $exists: false } },
            { 'formData.requestType': null },
            { 'formData.requestType': '' },
          ],
        },
      ];
    } else {
      filter['formData.requestType'] = req.query.requestType;
    }
  }

  if (req.query.buildingCategory && req.query.buildingCategory !== 'all') {
    filter['formData.buildingCategory'] = req.query.buildingCategory;
  }

  if (req.query.paymentStatus && req.query.paymentStatus !== 'all') {
    filter.paymentStatus = req.query.paymentStatus;
  }

  return filter;
};

// @desc    Get Analytics for Super Admin Dashboard
// @route   GET /api/analytics
// @access  Private/SuperAdmin|Staff (staff gets district-scoped)
const getDashboardStats = async (req, res) => {
  try {
    const dateFilter = buildDateFilter(req.query);
    const appFilter = scopeFilter(req, dateFilter);

    const totalUsersFilter = req.user.role === 'staff'
      ? { role: 'applicant' }
      : {};
    const totalUsers = await User.countDocuments(totalUsersFilter);

    const revenueData = await PermitApplication.aggregate([
      { $match: appFilter },
      { $group: { _id: null, total: { $sum: '$formData.totalFee' } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    const appStats = await PermitApplication.aggregate([
      { $match: appFilter },
      {
        $group: {
          _id: null,
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          inReview: { $sum: { $cond: [{ $eq: ['$status', 'In Review'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
          returned: { $sum: { $cond: [{ $eq: ['$status', 'Returned'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ]);
    const { pending = 0, inReview = 0, approved = 0, returned = 0, total = 0 } =
      appStats.length > 0 ? appStats[0] : {};

    const districtData = await PermitApplication.aggregate([
      { $match: appFilter },
      { $group: { _id: '$district', count: { $sum: 1 } } },
      { $project: { name: '$_id', value: '$count', _id: 0 } }
    ]);

    const appliedUsersCount = (await PermitApplication.distinct('user', appFilter)).length;
    const funnelData = [
      { name: 'Total Users', value: totalUsers },
      { name: 'Applicants', value: appliedUsersCount }
    ];

    let growthTrends = [];
    const targetMonth = parseInt(req.query.selectedMonth) || (new Date().getMonth() + 1);
    const targetYear = parseInt(req.query.selectedYear) || new Date().getFullYear();
    const graphView = req.query.graphView;

    const growthMatch = scopeFilter(req, {});

    if (graphView === 'year') {
      const monthlyData = await PermitApplication.aggregate([
        {
          $match: {
            ...growthMatch,
            createdAt: {
              $gte: new Date(`${targetYear}-01-01`),
              $lte: new Date(`${targetYear}-12-31`)
            }
          }
        },
        { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      growthTrends = months.map((month, i) => {
        const match = monthlyData.find(d => d._id === i + 1);
        return { name: month, applications: match ? match.count : 0 };
      });
    } else {
      const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
      const endOfMonth = new Date(targetYear, targetMonth, 0);
      const dailyData = await PermitApplication.aggregate([
        { $match: { ...growthMatch, createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
        {
          $group: {
            _id: { $dateToString: { format: '%d %b', date: '$createdAt' } },
            count: { $sum: 1 },
            day: { $first: { $dayOfMonth: '$createdAt' } }
          }
        },
        { $sort: { day: 1 } }
      ]);
      const daysInMonth = endOfMonth.getDate();
      const monthLabel = startOfMonth.toLocaleString('default', { month: 'short' });
      growthTrends = Array.from({ length: daysInMonth }, (_, i) => {
        const dayNum = i + 1;
        const label = `${dayNum.toString().padStart(2, '0')} ${monthLabel}`;
        const match = dailyData.find(d => d._id === label);
        return { name: label, applications: match ? match.count : 0 };
      });
    }

    const recentApplications = await PermitApplication.find(appFilter)
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('user', 'fullName')
      .select('applicationId formData.fullName district status formData.totalFee createdAt user expiryDate permitId');

    const districtPerformance = await PermitApplication.aggregate([
      { $match: scopeFilter(req, {}) },
      {
        $group: {
          _id: '$district',
          volume: { $sum: 1 },
          revenueYield: { $sum: '$formData.totalFee' },
          approvedCount: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          returnedCount: { $sum: { $cond: [{ $eq: ['$status', 'Returned'] }, 1, 0] } },
          processingTimeSum: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'Approved'] }, { $ne: ['$approvalDate', null] }] },
                { $subtract: ['$approvalDate', '$createdAt'] },
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          district: '$_id',
          volume: 1,
          revenueYield: 1,
          approvedCount: 1,
          pendingCount: 1,
          returnedCount: 1,
          avgTime: {
            $cond: [
              { $gt: ['$approvedCount', 0] },
              {
                $concat: [
                  { $toString: { $round: [{ $divide: ['$processingTimeSum', { $multiply: ['$approvedCount', 1000 * 60 * 60 * 24] }] }, 1] } },
                  ' Days'
                ]
              },
              'N/A'
            ]
          },
          conversionRate: {
            $cond: [
              { $gt: ['$volume', 0] },
              { $multiply: [{ $divide: ['$approvedCount', '$volume'] }, 100] },
              0
            ]
          },
          _id: 0
        }
      },
      { $sort: { revenueYield: -1 } }
    ]);

    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 6);
    sevenMonthsAgo.setDate(1);

    const revenueByMonth = await PermitApplication.aggregate([
      { $match: { ...scopeFilter(req, {}), createdAt: { $gte: sevenMonthsAgo } } },
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          revenue: { $sum: '$formData.totalFee' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRevenue = revenueByMonth.map(m => ({
      name: monthNames[m._id.month - 1],
      revenue: m.revenue
    }));

    const staffCount = await User.countDocuments({ role: 'staff', ...(req.user.role === 'staff' ? { district: req.user.district } : {}) });
    const inspectorCount = await User.countDocuments({ role: 'inspector' });
    const applicantCount = await User.countDocuments({ role: 'applicant' });
    const districtCount = await District.countDocuments({});

    res.status(200).json({
      success: true,
      summary: {
        totalUsers,
        totalRevenue,
        pendingApps: pending,
        inReviewApps: inReview,
        approvedApps: approved,
        returnedApps: returned,
        totalApps: total,
        actualApplicants: appliedUsersCount,
        staffCount,
        inspectorCount,
        applicantCount,
        districtCount
      },
      charts: {
        districtDistribution: districtData,
        userFunnel: funnelData,
        growthTrends,
        recentApplications,
        monthlyRevenue
      },
      tables: {
        districtPerformance
      }
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Full filtered reports dataset (applications + optional section)
// @route   GET /api/analytics/reports
// @access  Private/SuperAdmin|Staff
const getReports = async (req, res) => {
  try {
    const dateFilter = buildDateFilter(req.query);
    const filter = scopeFilter(req, dateFilter);
    const section = req.query.section || 'applications';
    const search = (req.query.search || '').trim();

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { applicationId: regex },
        { permitId: regex },
        { 'formData.fullName': regex },
        { 'formData.plotId': regex },
        { district: regex }
      ];
    }

    const [summaryAgg, applications, users] = await Promise.all([
      PermitApplication.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
            inReview: { $sum: { $cond: [{ $eq: ['$status', 'In Review'] }, 1, 0] } },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
            returned: { $sum: { $cond: [{ $eq: ['$status', 'Returned'] }, 1, 0] } },
            revenue: { $sum: '$formData.totalFee' },
            landArea: { $sum: '$formData.landArea' },
            avgFee: { $avg: '$formData.totalFee' },
            paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, 1, 0] } },
            unpaid: { $sum: { $cond: [{ $ne: ['$paymentStatus', 'Paid'] }, 1, 0] } },
          }
        }
      ]),
      PermitApplication.find(filter)
        .sort({ createdAt: -1 })
        .limit(Number(req.query.limit) || 2000)
        .populate('user', 'fullName email phone')
        .populate('reviewedBy', 'fullName'),
      req.user.role === 'superadmin' && section === 'users'
        ? User.find({ role: { $ne: 'superadmin' } }).select('-password').sort({ createdAt: -1 })
        : Promise.resolve([])
    ]);

    const summary = summaryAgg[0] || {
      total: 0, pending: 0, inReview: 0, approved: 0, returned: 0, revenue: 0, landArea: 0, avgFee: 0, paid: 0, unpaid: 0
    };

    const byCategory = await PermitApplication.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $ifNull: ['$formData.buildingCategory', 'Unknown'] },
          count: { $sum: 1 },
          revenue: { $sum: '$formData.totalFee' },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
          avgFee: { $avg: '$formData.totalFee' },
        }
      },
      { $project: { category: '$_id', count: 1, revenue: 1, approved: 1, avgFee: 1, _id: 0 } },
      { $sort: { revenue: -1 } }
    ]);

    const byDistrict = await PermitApplication.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$district',
          count: { $sum: 1 },
          revenue: { $sum: '$formData.totalFee' },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          returned: { $sum: { $cond: [{ $eq: ['$status', 'Returned'] }, 1, 0] } }
        }
      },
      { $project: { district: '$_id', count: 1, revenue: 1, approved: 1, pending: 1, returned: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    const byRequestType = await PermitApplication.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $cond: [
              {
                $or: [
                  { $eq: [{ $ifNull: ['$formData.requestType', ''] }, ''] },
                  { $eq: ['$formData.requestType', null] },
                ],
              },
              'New Construction',
              '$formData.requestType',
            ],
          },
          count: { $sum: 1 },
          revenue: { $sum: '$formData.totalFee' },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
          avgFee: { $avg: '$formData.totalFee' },
        }
      },
      { $project: { requestType: '$_id', count: 1, revenue: 1, approved: 1, avgFee: 1, _id: 0 } },
      { $sort: { revenue: -1 } }
    ]);

    const byPaymentStatus = await PermitApplication.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $ifNull: ['$paymentStatus', 'Pending'] },
          count: { $sum: 1 },
          revenue: { $sum: '$formData.totalFee' },
        }
      },
      { $project: { paymentStatus: '$_id', count: 1, revenue: 1, _id: 0 } },
      { $sort: { revenue: -1 } }
    ]);

    // Top repetitive applicants (by application count + revenue)
    const topApplicants = await PermitApplication.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { user: '$user', name: '$formData.fullName', phone: '$formData.phone', email: '$formData.email' },
          applications: { $sum: 1 },
          revenue: { $sum: '$formData.totalFee' },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
          districts: { $addToSet: '$district' }
        }
      },
      { $sort: { applications: -1, revenue: -1 } },
      { $limit: 25 },
      {
        $project: {
          _id: 0,
          userId: '$_id.user',
          applicant: '$_id.name',
          phone: '$_id.phone',
          email: '$_id.email',
          applications: 1,
          revenue: 1,
          approved: 1,
          districts: 1
        }
      }
    ]);

    const revenueByDistrict = [...byDistrict].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
    const revenueByCategory = [...byCategory].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
    const revenueByRequestType = [...byRequestType].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
    const highestRevenueDistrict = revenueByDistrict[0] || null;
    const lowestRevenueDistrict = revenueByDistrict.length
      ? revenueByDistrict[revenueByDistrict.length - 1]
      : null;
    const mostPermitsDistrict = [...byDistrict].sort((a, b) => (b.count || 0) - (a.count || 0))[0] || null;
    const topRevenueCategory = revenueByCategory[0] || null;
    const topRevenueRequestType = revenueByRequestType[0] || null;

    const rows = applications.map(app => ({
      applicationId: app.applicationId,
      permitId: app.permitId || '—',
      applicant: app.user?.fullName || app.formData?.fullName,
      phone: app.user?.phone || app.formData?.phone,
      email: app.user?.email || app.formData?.email,
      district: app.district,
      plotId: app.formData?.plotId,
      requestType: app.formData?.requestType || 'New Construction',
      buildingCategory: app.formData?.buildingCategory,
      floors: /dabaq/i.test(app.formData?.buildingCategory || '') ? app.formData?.floors : '—',
      landArea: app.formData?.landArea,
      totalFee: app.formData?.totalFee,
      status: app.status,
      paymentStatus: app.paymentStatus,
      submittedAt: app.createdAt,
      approvalDate: app.approvalDate,
      expiryDate: app.expiryDate,
      reviewedBy: app.reviewedBy?.fullName || '—',
      staffRemarks: app.staffRemarks || ''
    }));

    res.json({
      success: true,
      scope: req.user.role === 'staff' ? req.user.district : (req.query.district || 'all'),
      section,
      summary: {
        ...summary,
        highestRevenueDistrict,
        lowestRevenueDistrict,
        mostPermitsDistrict,
        topRevenueCategory,
        topRevenueRequestType,
      },
      breakdowns: {
        byCategory,
        byDistrict,
        byRequestType,
        byPaymentStatus,
        revenueByDistrict,
        revenueByCategory,
        revenueByRequestType,
        topApplicants
      },
      rows,
      users: users.map(u => ({
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        district: u.district,
        gender: u.gender,
        isActive: u.isActive !== false,
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    console.error('Reports Error:', error);
    res.status(500).json({ success: false, message: 'Server Error generating reports' });
  }
};

module.exports = {
  getDashboardStats,
  getReports
};
