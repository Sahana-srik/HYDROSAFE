const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, employeeId, department, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Allowed roles safety check
    const validRoles = ['worker', 'safetyOfficer', 'inspector', 'ert', 'complianceAdmin', 'superAdmin'];
    const assignedRole = validRoles.includes(role) ? role : 'worker';
    const autoEmployeeId = employeeId || `EMP-${Date.now().toString().slice(-4)}`;

    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      employeeId: autoEmployeeId,
      department: department || 'General Operations',
      phone: phone || ''
    });

    if (user) {
      // Create Audit Log if possible
      await AuditLog.create({
        action: 'USER_REGISTERED',
        performedBy: user._id,
        module: 'AUTH',
        details: `User registered: ${user.email} with role ${user.role}`,
        ipAddress: req.ip || ''
      }).catch(err => console.warn('AuditLog note:', err.message));

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        department: user.department,
        phone: user.phone,
        createdAt: user.createdAt,
        token: generateToken(user._id, user.role)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data provided' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      if (!user.isActive) {
        return res.status(403).json({ message: 'Your account has been deactivated.' });
      }

      // Log audit
      await AuditLog.create({
        action: 'USER_LOGIN',
        performedBy: user._id,
        module: 'AUTH',
        details: `Successful login by ${user.email}`,
        ipAddress: req.ip || ''
      }).catch(err => console.warn('AuditLog note:', err.message));

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        department: user.department,
        phone: user.phone,
        createdAt: user.createdAt,
        token: generateToken(user._id, user.role)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        department: user.department,
        phone: user.phone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Test Admin/SafetyOfficer protected resource
// @route   GET /api/auth/admin-only
// @access  Private (safetyOfficer, superAdmin)
const getAdminOnlyData = async (req, res, next) => {
  res.json({
    message: 'Access granted to high-privilege safety administration endpoint.',
    authorizedRole: req.user.role,
    user: req.user.email
  });
};

// @desc    Get all users with inspector/safetyOfficer/superAdmin roles for assignment dropdowns
// @route   GET /api/auth/inspectors
// @access  Private (All authenticated personnel)
const getInspectors = async (req, res, next) => {
  try {
    const inspectors = await User.find({
      role: { $in: ['inspector', 'safetyOfficer', 'superAdmin'] }
    }).select('name email role employeeId department').sort({ name: 1 });
    res.json(inspectors);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (for management views)
// @route   GET /api/auth/users
// @access  Private (safetyOfficer, complianceAdmin, superAdmin)
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Create user by Admin
// @route   POST /api/auth/users
// @access  Private (safetyOfficer, complianceAdmin, superAdmin)
const createUserByAdmin = async (req, res, next) => {
  try {
    const { name, email, password, role, employeeId, department, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email address already exists' });
    }

    const validRoles = ['worker', 'safetyOfficer', 'inspector', 'ert', 'complianceAdmin', 'superAdmin'];
    const assignedRole = validRoles.includes(role) ? role : 'worker';
    const autoEmpId = employeeId || `EMP-${Date.now().toString().slice(-4)}`;

    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      employeeId: autoEmpId,
      department: department || 'General Operations',
      phone: phone || ''
    });

    const userSafe = await User.findById(user._id).select('-password');

    await AuditLog.create({
      action: 'USER_CREATED',
      performedBy: req.user._id,
      userId: req.user._id,
      module: 'USER_MGMT',
      entityType: 'User',
      entityId: user._id,
      beforeState: null,
      afterState: userSafe.toObject(),
      details: `Created new user ${user.email} (${user.role})`,
      ipAddress: req.ip || ''
    }).catch(err => console.warn('AuditLog note:', err.message));

    res.status(201).json(userSafe);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile & role by Admin
// @route   PATCH /api/auth/users/:id
// @access  Private (safetyOfficer, complianceAdmin, superAdmin)
const updateUserByAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User record not found' });
    }

    const beforeState = user.toObject();
    delete beforeState.password;

    const { name, email, role, department, employeeId, phone } = req.body;

    let roleChanged = false;
    if (role && role !== user.role) {
      const validRoles = ['worker', 'safetyOfficer', 'inspector', 'ert', 'complianceAdmin', 'superAdmin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: `Invalid role '${role}'` });
      }
      user.role = role;
      roleChanged = true;
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (department !== undefined) user.department = department;
    if (employeeId !== undefined) user.employeeId = employeeId;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    const afterState = updatedUser.toObject();

    const actionName = roleChanged ? 'USER_ROLE_CHANGED' : 'USER_UPDATED';
    const detailMsg = roleChanged
      ? `Role updated for ${user.email}: ${beforeState.role} → ${user.role}`
      : `User profile updated for ${user.email}`;

    await AuditLog.create({
      action: actionName,
      performedBy: req.user._id,
      userId: req.user._id,
      module: 'USER_MGMT',
      entityType: 'User',
      entityId: user._id,
      beforeState,
      afterState,
      details: detailMsg,
      ipAddress: req.ip || ''
    }).catch(err => console.warn('AuditLog note:', err.message));

    res.json(updatedUser);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User record not found' });
    }
    next(error);
  }
};

// @desc    Toggle user status (Active / Inactive)
// @route   PATCH /api/auth/users/:id/status
// @access  Private (safetyOfficer, complianceAdmin, superAdmin)
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User record not found' });
    }

    // Prevent self-deactivation
    if (req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({ message: 'Cannot deactivate your own logged-in administrator account' });
    }

    const beforeState = user.toObject();
    delete beforeState.password;

    const { isActive } = req.body;
    user.isActive = typeof isActive === 'boolean' ? isActive : !user.isActive;
    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    const afterState = updatedUser.toObject();

    const actionName = user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';

    await AuditLog.create({
      action: actionName,
      performedBy: req.user._id,
      userId: req.user._id,
      module: 'USER_MGMT',
      entityType: 'User',
      entityId: user._id,
      beforeState,
      afterState,
      details: `User ${user.email} account status set to ${user.isActive ? 'ACTIVE' : 'INACTIVE'}`,
      ipAddress: req.ip || ''
    }).catch(err => console.warn('AuditLog note:', err.message));

    res.json(updatedUser);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User record not found' });
    }
    next(error);
  }
};

// @desc    Seed initial demonstration users for all 6 roles
// @route   POST /api/auth/seed
// @access  Public / Protected (Idempotent seed helper)
const seedInitialUsers = async (req, res, next) => {
  try {
    const defaultUsers = [
      { name: 'Worker One', email: 'worker@hydro.com', password: 'password123', role: 'worker', employeeId: 'EMP-W001', department: 'Plant Operations', phone: '+1-555-0101' },
      { name: 'Chief Safety Officer', email: 'safety@hydro.com', password: 'password123', role: 'safetyOfficer', employeeId: 'EMP-S001', department: 'HSE Safety', phone: '+1-555-0102' },
      { name: 'Senior Inspector', email: 'inspector@hydro.com', password: 'password123', role: 'inspector', employeeId: 'EMP-I001', department: 'Quality & Inspection', phone: '+1-555-0103' },
      { name: 'ERT Commander', email: 'ert@hydro.com', password: 'password123', role: 'ert', employeeId: 'EMP-E001', department: 'Emergency Response', phone: '+1-555-0104' },
      { name: 'Compliance Officer', email: 'compliance@hydro.com', password: 'password123', role: 'complianceAdmin', employeeId: 'EMP-C001', department: 'Regulatory Compliance', phone: '+1-555-0105' },
      { name: 'Super Administrator', email: 'admin@hydro.com', password: 'password123', role: 'superAdmin', employeeId: 'EMP-A001', department: 'Executive Management', phone: '+1-555-0106' }
    ];

    const createdUsers = [];
    for (const u of defaultUsers) {
      let existing = await User.findOne({ email: u.email });
      if (!existing) {
        existing = await User.create(u);
        createdUsers.push({ email: u.email, role: u.role, status: 'created' });
      } else {
        createdUsers.push({ email: u.email, role: u.role, status: 'already_exists' });
      }
    }

    res.status(200).json({
      message: 'Initial system users check/seed completed successfully',
      seededCount: createdUsers.filter(u => u.status === 'created').length,
      users: createdUsers
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};



