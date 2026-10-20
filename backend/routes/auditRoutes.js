const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);

router.get(
  '/',
  requireRole('safetyOfficer', 'complianceAdmin', 'superAdmin'),
  getAuditLogs
);

module.exports = router;
