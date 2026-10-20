const express = require('express');
const router = express.Router();
const {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  escalateIncident
} = require('../controllers/incidentController');
const { protect, requireRole } = require('../middleware/auth');

// All incident routes require JWT authentication
router.use(protect);

router.route('/')
  .post(createIncident)
  .get(getIncidents);

router.route('/:id')
  .get(getIncidentById);

router.patch('/:id/status', requireRole('safetyOfficer', 'inspector', 'ert', 'complianceAdmin', 'superAdmin'), updateIncidentStatus);
router.post('/:id/escalate', requireRole('safetyOfficer', 'inspector', 'ert', 'complianceAdmin', 'superAdmin'), escalateIncident);

module.exports = router;
