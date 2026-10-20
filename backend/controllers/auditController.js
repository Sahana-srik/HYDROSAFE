const AuditLog = require('../models/AuditLog');

// @desc   Get system audit logs
// @route  GET /api/audit-logs
// @access safetyOfficer, complianceAdmin, superAdmin
const getAuditLogs = async (req, res, next) => {
  try {
    const query = {};

    if (req.query.module) {
      query.module = req.query.module.toUpperCase();
    }

    if (req.query.action) {
      query.action = req.query.action;
    }

    if (req.query.search) {
      query.details = { $regex: req.query.search, $options: 'i' };
    }

    const limit = parseInt(req.query.limit, 10) || 50;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('performedBy', 'name email role employeeId department')
        .populate('userId', 'name email role employeeId department')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip),
      AuditLog.countDocuments(query)
    ]);

    res.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs
};
