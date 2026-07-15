const PermitApplication = require('../models/PermitApplication');
const User = require('../models/User');

// @desc    Get Analytics for Super Admin Dashboard
// @route   GET /api/analytics
// @access  Private/SuperAdmin
const getDashboardStats = async (req, res) => {
  try {
    const { range, startDate: customStart, endDate: customEnd, graphView } = req.query;
    let startDate = new Date();
    let endDate = new Date();

    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '7') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (range === '30') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (range === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }

    const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

    // 1. Summary Cards
    const totalUsers = await User.countDocuments({});
    const revenueData = await PermitApplication.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, total: { $sum: "$formData.totalFee" } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    const appStats = await PermitApplication.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] } },
        }
      }
    ]);
    const { pending, approved } = appStats.length > 0 ? appStats[0] : { pending: 0, approved: 0 };

    // 2. District Distribution
    const districtData = await PermitApplication.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$district", count: { $sum: 1 } } },
      { $project: { name: "$_id", value: "$count", _id: 0 } }
    ]);

    // 3. User Funnel
    const appliedUsersCount = (await PermitApplication.distinct('user', dateFilter)).length;
    const funnelData = [
      { name: 'Total Users', value: totalUsers },
      { name: 'Applicants', value: appliedUsersCount }
    ];

    // 4. Growth Trends (Daily for Month View, Monthly for Year View)
    let growthTrends = [];
    const targetMonth = parseInt(req.query.selectedMonth) || (new Date().getMonth() + 1);
    const targetYear = parseInt(req.query.selectedYear) || new Date().getFullYear();

    if (graphView === 'year') {
      const monthlyData = await PermitApplication.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(`${targetYear}-01-01`),
              $lte: new Date(`${targetYear}-12-31`)
            }
          }
        },
        { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
        { $sort: { "_id": 1 } }
      ]);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      growthTrends = months.map((month, i) => {
        const match = monthlyData.find(d => d._id === i + 1);
        return { name: month, applications: match ? match.count : 0 };
      });
    } else {
      // Month view: Daily stats for a specific calendar month
      const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
      const endOfMonth = new Date(targetYear, targetMonth, 0);

      const dailyData = await PermitApplication.aggregate([
        { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
        {
          $group: {
            _id: { $dateToString: { format: "%d %b", date: "$createdAt" } },
            count: { $sum: 1 },
            day: { $first: { $dayOfMonth: "$createdAt" } }
          }
        },
        { $sort: { "day": 1 } }
      ]);

      // Fill in all days of the month
      const daysInMonth = endOfMonth.getDate();
      const monthLabel = startOfMonth.toLocaleString('default', { month: 'short' });
      growthTrends = Array.from({ length: daysInMonth }, (_, i) => {
        const dayNum = i + 1;
        const label = `${dayNum.toString().padStart(2, '0')} ${monthLabel}`;
        const match = dailyData.find(d => d._id === label);
        return { name: label, applications: match ? match.count : 0 };
      });
    }

    // 5. Recent Applications
    const recentApplications = await PermitApplication.find(dateFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'fullName')
      .select('applicationId formData.fullName district status formData.totalFee createdAt user expiryDate');

    // 6. District Performance Table (Aggregated)
    const districtPerformance = await PermitApplication.aggregate([
      {
        $group: {
          _id: "$district",
          volume: { $sum: 1 },
          revenueYield: { $sum: "$formData.totalFee" },
          approvedCount: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] } },
          processingTimeSum: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$status", "Approved"] }, { $ne: ["$approvalDate", null] }] },
                { $subtract: ["$approvalDate", "$createdAt"] },
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          district: "$_id",
          volume: 1,
          revenueYield: 1,
          avgTime: {
            $cond: [
              { $gt: ["$approvedCount", 0] },
              {
                $concat: [
                  { $toString: { $round: [{ $divide: ["$processingTimeSum", { $multiply: ["$approvedCount", 1000 * 60 * 60 * 24] }] }, 1] } },
                  " Days"
                ]
              },
              "N/A"
            ]
          },
          conversionRate: {
            $multiply: [{ $divide: ["$approvedCount", "$volume"] }, 100]
          },
          _id: 0
        }
      },
      { $sort: { revenueYield: -1 } }
    ]);

    // 7. Last 7 Months Revenue
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 6);
    sevenMonthsAgo.setDate(1);

    const revenueByMonth = await PermitApplication.aggregate([
      { $match: { createdAt: { $gte: sevenMonthsAgo } } },
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          revenue: { $sum: "$formData.totalFee" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyRevenue = revenueByMonth.map(m => ({
      name: monthNames[m._id.month - 1],
      revenue: m.revenue
    }));

    res.status(200).json({
      success: true,
      summary: {
        totalUsers,
        totalRevenue,
        pendingApps: pending,
        approvedApps: approved,
        actualApplicants: appliedUsersCount
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

module.exports = {
  getDashboardStats
};
