const express = require('express');
const router = express.Router();
const {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  completeStep,
  overrideStep,
  cancelWorkflow
} = require('../controllers/emergencyController');
const { protect, requireRole } = require('../middleware/auth');

// All emergency routes require authentication
router.use(protect);

// Create workflow — Safety Officer and Super Admin only
router.post(
  '/',
  requireRole('safetyOfficer', 'superAdmin'),
  createWorkflow
);

// Get all workflows — all authenticated roles
router.get('/', getWorkflows);

// Get single workflow — all authenticated roles
router.get('/:id', getWorkflowById);

// Complete a step — ERT, Safety Officer, Super Admin
router.patch(
  '/:id/steps/:stepOrder/complete',
  requireRole('ert', 'safetyOfficer', 'superAdmin'),
  completeStep
);

// Override a step — Safety Officer, Super Admin ONLY
router.patch(
  '/:id/steps/:stepOrder/override',
  requireRole('safetyOfficer', 'superAdmin'),
  overrideStep
);

// Cancel the workflow — Safety Officer, Super Admin
router.patch(
  '/:id/cancel',
  requireRole('safetyOfficer', 'superAdmin'),
  cancelWorkflow
);

module.exports = router;
