const Incident = require('../models/Incident');
const Inspection = require('../models/Inspection');
const ComplianceDoc = require('../models/ComplianceDoc');
const EmergencyWorkflow = require('../models/EmergencyWorkflow');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// @desc    Get aggregated real database dashboard analytics
// @route   GET /api/dashboard/stats
// @access  Private (All authenticated roles)
const getDashboardStats = async (req, res, next) => {
  try {
    const role = req.user.role;
    const userId = req.user._id;

    const now = new Date();
    const exp30Cutoff = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const exp60Cutoff = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const exp90Cutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // 1. INCIDENTS AGGREGATION
    let incidentQuery = {};
    if (role === 'worker') {
      incidentQuery.reportedBy = userId;
    }

    const incidents = await Incident.find(incidentQuery);
    const incidentsTotal = incidents.length;
    const incidentsActive = incidents.filter((i) => !['resolved', 'closed'].includes(i.status)).length;
    const incidentsBySeverity = {
      low: incidents.filter((i) => i.severity === 'low').length,
      medium: incidents.filter((i) => i.severity === 'medium').length,
      high: incidents.filter((i) => i.severity === 'high').length,
      critical: incidents.filter((i) => i.severity === 'critical').length
    };
    const incidentsByStatus = {
      reported: incidents.filter((i) => i.status === 'reported').length,
      acknowledged: incidents.filter((i) => i.status === 'acknowledged').length,
      underInvestigation: incidents.filter((i) => i.status === 'underInvestigation').length,
      resolved: incidents.filter((i) => i.status === 'resolved').length,
      closed: incidents.filter((i) => i.status === 'closed').length
    };

    // 2. INSPECTIONS AGGREGATION
    let inspectionQuery = {};
    if (role === 'inspector') {
      inspectionQuery.inspector = userId;
    }

    const inspections = await Inspection.find(inspectionQuery);
    const inspectionsTotal = inspections.length;
    const inspectionsUpcoming = inspections.filter((i) => i.status === 'scheduled').length;
    const inspectionsCompleted = inspections.filter((i) => i.status === 'completed').length;
    const inspectionsFailed = inspections.filter((i) => i.overallResult === 'fail').length;
    const inspectionsByResult = {
      pass: inspections.filter((i) => i.overallResult === 'pass').length,
      fail: inspectionsFailed,
      NA: inspections.filter((i) => i.overallResult === 'NA').length,
      pending: inspections.filter((i) => i.overallResult === 'pending').length
    };

    // 3. COMPLIANCE DOCUMENTS AGGREGATION
    const docs = await ComplianceDoc.find({ isActive: true });
    const docsTotal = docs.length;
    const docsExpired = docs.filter((d) => d.expiryDate && new Date(d.expiryDate) < now).length;
    const docsExp30 = docs.filter((d) => d.expiryDate && new Date(d.expiryDate) >= now && new Date(d.expiryDate) <= exp30Cutoff).length;
    const docsExp60 = docs.filter((d) => d.expiryDate && new Date(d.expiryDate) >= now && new Date(d.expiryDate) <= exp60Cutoff).length;
    const docsExp90 = docs.filter((d) => d.expiryDate && new Date(d.expiryDate) >= now && new Date(d.expiryDate) <= exp90Cutoff).length;

    // 4. EMERGENCY WORKFLOWS AGGREGATION
    let workflowQuery = {};
    if (role === 'ert') {
      workflowQuery.$or = [{ 'steps.assignedTo': userId }, { overallStatus: 'active' }];
    } else if (role === 'worker') {
      const myIncidents = incidents.map((i) => i._id);
      workflowQuery.incidentId = { $in: myIncidents };
    }

    const workflows = await EmergencyWorkflow.find(workflowQuery);
    const workflowsTotal = workflows.length;
    const workflowsActive = workflows.filter((w) => w.overallStatus === 'active').length;
    const workflowsCompleted = workflows.filter((w) => w.overallStatus === 'completed').length;
    const workflowsOverridden = workflows.filter((w) => w.overallStatus === 'overridden').length;
    const workflowsCancelled = workflows.filter((w) => w.overallStatus === 'cancelled').length;

    let pendingStepsCount = 0;
    workflows.forEach((w) => {
      if (w.overallStatus === 'active' && Array.isArray(w.steps)) {
        pendingStepsCount += w.steps.filter((s) => s.status === 'pending').length;
      }
    });

    // 5. USER & AUDIT METRICS (ADMIN / SYSTEM WIDE)
    let userStats = null;
    if (['safetyOfficer', 'complianceAdmin', 'superAdmin'].includes(role)) {
      const users = await User.find({}).select('role isActive');
      userStats = {
        totalUsers: users.length,
        activeUsers: users.filter((u) => u.isActive !== false).length,
        byRole: {
          worker: users.filter((u) => u.role === 'worker').length,
          safetyOfficer: users.filter((u) => u.role === 'safetyOfficer').length,
          inspector: users.filter((u) => u.role === 'inspector').length,
          ert: users.filter((u) => u.role === 'ert').length,
          complianceAdmin: users.filter((u) => u.role === 'complianceAdmin').length,
          superAdmin: users.filter((u) => u.role === 'superAdmin').length
        }
      };
    }

    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentAuditCount = await AuditLog.countDocuments({ createdAt: { $gte: past24h } });

    res.json({
      role,
      incidents: {
        total: incidentsTotal,
        active: incidentsActive,
        bySeverity: incidentsBySeverity,
        byStatus: incidentsByStatus
      },
      inspections: {
        total: inspectionsTotal,
        upcoming: inspectionsUpcoming,
        completed: inspectionsCompleted,
        failed: inspectionsFailed,
        byResult: inspectionsByResult
      },
      compliance: {
        total: docsTotal,
        expired: docsExpired,
        expiring30: docsExp30,
        expiring60: docsExp60,
        expiring90: docsExp90
      },
      emergency: {
        total: workflowsTotal,
        active: workflowsActive,
        completed: workflowsCompleted,
        overridden: workflowsOverridden,
        cancelled: workflowsCancelled,
        pendingStepsCount
      },
      users: userStats,
      system: {
        recentAuditCount,
        timestamp: now.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats
};
