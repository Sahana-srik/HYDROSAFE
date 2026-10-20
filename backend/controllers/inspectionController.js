const mongoose = require('mongoose');
const Inspection = require('../models/Inspection');
const AuditLog = require('../models/AuditLog');

const DEFAULT_HYDROGEN_CHECKLIST = [
  { item: 'Inspect H2 leak detector sensor calibration & zero-point baseline', result: 'pass', note: '' },
  { item: 'Verify Emergency Shutdown Valve (ESV) pneumatic pressure actuation', result: 'pass', note: '' },
  { item: 'Check Pressure Relief Valve (PRV) mechanical seal & vent piping', result: 'pass', note: '' },
  { item: 'Monitor electrolysis stack thermal temperature & water flow rate', result: 'pass', note: '' }
];

// @desc    Schedule a new safety inspection
// @route   POST /api/inspections
// @access  Private (safetyOfficer, inspector, complianceAdmin, superAdmin)
const createInspection = async (req, res, next) => {
  try {
    const { equipment, zone, type, scheduledDate, inspector, checklist, summaryNotes } = req.body;

    if (!equipment || !zone || !scheduledDate || !inspector) {
      return res.status(400).json({
        message: 'Please provide all required fields: equipment, zone, scheduledDate, inspector'
      });
    }

    const items = Array.isArray(checklist) && checklist.length > 0
      ? checklist
      : DEFAULT_HYDROGEN_CHECKLIST;

    const inspection = await Inspection.create({
      equipment,
      zone,
      type: type || 'routine',
      scheduledDate,
      inspector,
      status: 'scheduled',
      overallResult: 'pending',
      checklist: items,
      summaryNotes: summaryNotes || ''
    });

    // Audit Log
    await AuditLog.create({
      action: 'INSPECTION_SCHEDULED',
      performedBy: req.user._id,
      userId: req.user._id,
      module: 'INSPECTION',
      entityType: 'Inspection',
      entityId: inspection._id,
      beforeState: null,
      afterState: inspection.toObject(),
      details: `Scheduled ${inspection.type} inspection for ${inspection.equipment} in ${inspection.zone}`,
      ipAddress: req.ip || ''
    }).catch(err => console.warn('AuditLog note:', err.message));

    const populated = await Inspection.findById(inspection._id)
      .populate('inspector', 'name email role employeeId department');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Get list of inspections
// @route   GET /api/inspections
// @access  Private
const getInspections = async (req, res, next) => {
  try {
    let query = {};

    // Filter assigned inspections for inspectors unless admin
    if (req.user.role === 'inspector' && req.query.all !== 'true') {
      query.inspector = req.user._id;
    }

    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;
    if (req.query.result) query.overallResult = req.query.result;

    const inspections = await Inspection.find(query)
      .populate('inspector', 'name email role employeeId department')
      .sort({ scheduledDate: -1, createdAt: -1 });

    res.json(inspections);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single inspection by ID
// @route   GET /api/inspections/:id
// @access  Private
const getInspectionById = async (req, res, next) => {
  try {
    const inspection = await Inspection.findById(req.params.id)
      .populate('inspector', 'name email role employeeId department phone');

    if (!inspection) {
      return res.status(404).json({ message: 'Inspection record not found' });
    }

    res.json(inspection);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Inspection record not found' });
    }
    next(error);
  }
};

// @desc    Update inspection details / schedule
// @route   PUT /api/inspections/:id
// @access  Private (safetyOfficer, complianceAdmin, superAdmin)
const updateInspection = async (req, res, next) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) {
      return res.status(404).json({ message: 'Inspection record not found' });
    }

    const beforeState = inspection.toObject();
    const { equipment, zone, type, scheduledDate, inspector, checklist, status } = req.body;

    if (equipment) inspection.equipment = equipment;
    if (zone) inspection.zone = zone;
    if (type) inspection.type = type;
    if (scheduledDate) inspection.scheduledDate = scheduledDate;
    if (inspector) inspection.inspector = inspector;
    if (Array.isArray(checklist)) inspection.checklist = checklist;
    if (status) inspection.status = status;

    await inspection.save();
    const afterState = inspection.toObject();

    await AuditLog.create({
      action: 'INSPECTION_UPDATED',
      performedBy: req.user._id,
      userId: req.user._id,
      module: 'INSPECTION',
      entityType: 'Inspection',
      entityId: inspection._id,
      beforeState,
      afterState,
      details: `Updated inspection [${inspection._id}] for ${inspection.equipment}`,
      ipAddress: req.ip || ''
    }).catch(err => console.warn('AuditLog note:', err.message));

    const populated = await Inspection.findById(inspection._id)
      .populate('inspector', 'name email role employeeId department');

    res.json(populated);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Inspection record not found' });
    }
    next(error);
  }
};

// @desc    Submit & complete inspection checklist
// @route   POST /api/inspections/:id/submit
// @access  Private (assigned inspector, safetyOfficer, superAdmin)
const submitInspection = async (req, res, next) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) {
      return res.status(404).json({ message: 'Inspection record not found' });
    }

    // Role check: assigned inspector or safety officer/admin
    const isAssigned = inspection.inspector.toString() === req.user._id.toString();
    const isAdminRole = ['safetyOfficer', 'complianceAdmin', 'superAdmin'].includes(req.user.role);

    if (!isAssigned && !isAdminRole) {
      return res.status(403).json({
        message: 'Forbidden: Only the assigned inspector or safety officer can execute this inspection'
      });
    }

    const { checklist, summaryNotes } = req.body;

    if (!Array.isArray(checklist) || checklist.length === 0) {
      return res.status(400).json({ message: 'Please provide a non-empty checklist array' });
    }

    // Validate checklist item results
    const validResults = ['pass', 'fail', 'NA'];
    for (const item of checklist) {
      if (!validResults.includes(item.result)) {
        return res.status(400).json({
          message: `Invalid result '${item.result}' for item '${item.item}'. Must be pass, fail, or NA`
        });
      }
    }

    // Calculate Overall Result
    let overallResult = 'pass';
    const hasFailures = checklist.some((item) => item.result === 'fail');
    const hasPasses = checklist.some((item) => item.result === 'pass');

    if (hasFailures) {
      overallResult = 'fail';
    } else if (!hasPasses) {
      overallResult = 'NA';
    } else {
      overallResult = 'pass';
    }

    const beforeState = inspection.toObject();

    inspection.checklist = checklist;
    if (summaryNotes !== undefined) inspection.summaryNotes = summaryNotes;
    inspection.overallResult = overallResult;
    inspection.status = 'completed';
    inspection.completedAt = new Date();

    await inspection.save();
    const afterState = inspection.toObject();

    // Audit Log
    await AuditLog.create({
      action: 'INSPECTION_SUBMITTED',
      performedBy: req.user._id,
      userId: req.user._id,
      module: 'INSPECTION',
      entityType: 'Inspection',
      entityId: inspection._id,
      beforeState,
      afterState,
      details: `Completed inspection [${inspection._id}] for ${inspection.equipment}. Result: ${overallResult.toUpperCase()}`,
      ipAddress: req.ip || ''
    }).catch(err => console.warn('AuditLog note:', err.message));

    const completedInspection = await Inspection.findById(inspection._id)
      .populate('inspector', 'name email role employeeId department');

    res.json({
      message: `Inspection successfully submitted and marked COMPLETED (${overallResult.toUpperCase()})`,
      inspection: completedInspection
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Inspection record not found' });
    }
    next(error);
  }
};


module.exports = {
  createInspection,
  getInspections,
  getInspectionById,
  updateInspection,
  submitInspection
};
