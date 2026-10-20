const express = require('express');
const router = express.Router();
const {
  createInspection,
  getInspections,
  getInspectionById,
  updateInspection,
  submitInspection
} = require('../controllers/inspectionController');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .post(requireRole('safetyOfficer', 'inspector', 'complianceAdmin', 'superAdmin'), createInspection)
  .get(getInspections);

router.route('/:id')
  .get(getInspectionById)
  .put(requireRole('safetyOfficer', 'complianceAdmin', 'superAdmin'), updateInspection);

router.post('/:id/submit', requireRole('inspector', 'safetyOfficer', 'complianceAdmin', 'superAdmin'), submitInspection);

module.exports = router;
