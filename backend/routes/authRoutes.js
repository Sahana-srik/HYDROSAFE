const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  getAdminOnlyData,
  getInspectors,
  getUsers,
  seedInitialUsers,
  createUserByAdmin,
  updateUserByAdmin,
  toggleUserStatus
} = require('../controllers/authController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/seed', seedInitialUsers);

// Protected routes
router.get('/me', protect, getUserProfile);
router.get('/inspectors', protect, getInspectors);
router.get('/admin-only', protect, requireRole('safetyOfficer', 'superAdmin'), getAdminOnlyData);

// Admin User Management Routes (RBAC Protected)
router.get('/users', protect, requireRole('safetyOfficer', 'complianceAdmin', 'superAdmin'), getUsers);
router.post('/users', protect, requireRole('safetyOfficer', 'complianceAdmin', 'superAdmin'), createUserByAdmin);
router.patch('/users/:id', protect, requireRole('safetyOfficer', 'complianceAdmin', 'superAdmin'), updateUserByAdmin);
router.patch('/users/:id/status', protect, requireRole('safetyOfficer', 'complianceAdmin', 'superAdmin'), toggleUserStatus);

module.exports = router;



