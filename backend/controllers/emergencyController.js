const EmergencyWorkflow = require('../models/EmergencyWorkflow');
const Incident = require('../models/Incident');
const AuditLog = require('../models/AuditLog');

// Helper: write audit log (non-blocking, never crashes main flow)
const audit = async ({ action, performedBy, entityId, beforeState, afterState, details, ip }) => {
  try {
    await AuditLog.create({
      action,
      performedBy,
      userId: performedBy,
      module: 'EMERGENCY',
      entityType: 'EmergencyWorkflow',
      entityId: entityId || null,
      beforeState: beforeState || null,
      afterState: afterState || null,
      details,
      ipAddress: ip || ''
    });
  } catch (err) {
    console.warn('[AuditLog] Failed to write audit entry:', err.message);
  }
};

// @desc   Create a new emergency response workflow linked to an incident
// @route  POST /api/emergency-workflows
// @access safetyOfficer, superAdmin
const createWorkflow = async (req, res, next) => {
  try {
    const { incidentId, templateType, title, customSteps } = req.body;

    if (!incidentId || !templateType) {
      return res.status(400).json({ message: 'incidentId and templateType are required' });
    }

    const validTemplates = ['gas_leak', 'fire', 'pressure_spike', 'chemical_spill', 'explosion', 'evacuation', 'general'];
    if (!validTemplates.includes(templateType)) {
      return res.status(400).json({
        message: `Invalid templateType. Must be one of: ${validTemplates.join(', ')}`
      });
    }

    // Verify the incident exists
    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Build steps: use custom steps if provided, otherwise generate from template
    let steps;
    if (Array.isArray(customSteps) && customSteps.length > 0) {
      steps = customSteps.map((s, i) => ({
        order: s.order ?? i + 1,
        name: s.name,
        assignedTo: s.assignedTo || null,
        dueAt: s.dueAt ? new Date(s.dueAt) : null,
        status: 'pending',
        completedAt: null,
        completedBy: null,
        note: ''
      }));
    } else {
      steps = EmergencyWorkflow.getTemplateSteps(templateType);
    }

    const workflow = await EmergencyWorkflow.create({
      incidentId,
      templateType,
      title: title || `${templateType.replace(/_/g, ' ').toUpperCase()} Response`,
      steps,
      overallStatus: 'active',
      triggeredBy: req.user._id,
      overrideLog: []
    });

    // Link workflow back to the incident
    incident.linkedWorkflowId = workflow._id;
    await incident.save();

    await audit({
      action: 'WORKFLOW_CREATED',
      performedBy: req.user._id,
      entityId: workflow._id,
      afterState: workflow.toObject(),
      details: `Emergency workflow [${workflow._id}] created for incident [${incidentId}] — type: ${templateType}`,
      ip: req.ip
    });

    const populated = await EmergencyWorkflow.findById(workflow._id)
      .populate('incidentId', 'title severity status')
      .populate('triggeredBy', 'name email role')
      .populate('steps.assignedTo', 'name email role')
      .populate('steps.completedBy', 'name email role')
      .populate('overrideLog.overriddenBy', 'name email role');

    res.status(201).json(populated);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid incidentId format' });
    }
    next(error);
  }
};

// @desc   Get all emergency workflows
// @route  GET /api/emergency-workflows
// @access All authenticated
const getWorkflows = async (req, res, next) => {
  try {
    let query = {};

    // ERT users see active workflows OR workflows that have a step assigned to them
    if (req.user.role === 'ert') {
      query.$or = [
        { 'steps.assignedTo': req.user._id },
        { 'steps.assignedTo': null },
        { overallStatus: 'active' }
      ];
    } else if (req.user.role === 'worker') {
      // Workers see only workflows linked to their reported incidents
      const myIncidents = await Incident.find({ reportedBy: req.user._id }).select('_id');
      const incidentIds = myIncidents.map((i) => i._id);
      query.incidentId = { $in: incidentIds };
    }

    // Optional filters
    if (req.query.status) {
      query.overallStatus = req.query.status;
    }
    if (req.query.templateType) {
      query.templateType = req.query.templateType;
    }

    const workflows = await EmergencyWorkflow.find(query)
      .populate('incidentId', 'title severity status location')
      .populate('triggeredBy', 'name email role')
      .populate('steps.assignedTo', 'name email role')
      .sort({ createdAt: -1 });

    res.json(workflows);
  } catch (error) {
    next(error);
  }
};

// @desc   Get a single workflow by ID
// @route  GET /api/emergency-workflows/:id
// @access All authenticated
const getWorkflowById = async (req, res, next) => {
  try {
    const workflow = await EmergencyWorkflow.findById(req.params.id)
      .populate('incidentId', 'title severity status location description reportedBy')
      .populate('triggeredBy', 'name email role employeeId department')
      .populate('steps.assignedTo', 'name email role employeeId department')
      .populate('steps.completedBy', 'name email role')
      .populate('overrideLog.overriddenBy', 'name email role');

    if (!workflow) {
      return res.status(404).json({ message: 'Emergency workflow not found' });
    }

    res.json(workflow);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Emergency workflow not found' });
    }
    next(error);
  }
};

// @desc   Complete a workflow step (enforces sequential order)
// @route  PATCH /api/emergency-workflows/:id/steps/:stepOrder/complete
// @access ert, safetyOfficer, superAdmin
const completeStep = async (req, res, next) => {
  try {
    const { note } = req.body;
    const stepOrder = parseInt(req.params.stepOrder, 10);

    if (isNaN(stepOrder)) {
      return res.status(400).json({ message: 'Invalid step order' });
    }

    const workflow = await EmergencyWorkflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ message: 'Emergency workflow not found' });
    }

    if (workflow.overallStatus !== 'active') {
      return res.status(400).json({
        message: `Cannot modify steps. Workflow status is '${workflow.overallStatus}'`
      });
    }

    const step = workflow.steps.find((s) => s.order === stepOrder);
    if (!step) {
      return res.status(404).json({ message: `Step with order ${stepOrder} not found` });
    }

    if (step.status === 'completed') {
      return res.status(400).json({ message: 'Step is already completed' });
    }

    // Check step assignment for ERT role: if assigned to another user, forbid action
    if (req.user.role === 'ert' && step.assignedTo && step.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: Step is assigned to another user' });
    }

    // Sequential order enforcement: all previous steps must be completed or overridden
    const previousIncomplete = workflow.steps.filter(
      (s) => s.order < stepOrder && !['completed', 'overridden', 'skipped'].includes(s.status)
    );
    if (previousIncomplete.length > 0) {
      return res.status(400).json({
        message: `Cannot complete step ${stepOrder}. Previous step(s) [${previousIncomplete.map(s => s.order).join(', ')}] are not yet completed.`
      });
    }

    const beforeState = workflow.toObject();

    // Mark step as completed
    step.status = 'completed';
    step.completedAt = new Date();
    step.completedBy = req.user._id;
    step.note = note || '';

    // Check if all steps are now completed/overridden → update overallStatus
    const allDone = workflow.steps.every((s) => ['completed', 'overridden', 'skipped'].includes(s.status));
    if (allDone) {
      workflow.overallStatus = 'completed';
    }

    await workflow.save();
    const afterState = workflow.toObject();

    await audit({
      action: 'WORKFLOW_STEP_COMPLETED',
      performedBy: req.user._id,
      entityId: workflow._id,
      beforeState,
      afterState,
      details: `Step ${stepOrder} ("${step.name}") completed on workflow [${workflow._id}]`,
      ip: req.ip
    });

    if (workflow.overallStatus === 'completed') {
      await audit({
        action: 'WORKFLOW_STATUS_CHANGED',
        performedBy: req.user._id,
        entityId: workflow._id,
        beforeState,
        afterState,
        details: `Workflow [${workflow._id}] status changed to 'completed' — all steps finished`,
        ip: req.ip
      });
    }

    const updated = await EmergencyWorkflow.findById(workflow._id)
      .populate('incidentId', 'title severity status')
      .populate('triggeredBy', 'name email role')
      .populate('steps.assignedTo', 'name email role')
      .populate('steps.completedBy', 'name email role')
      .populate('overrideLog.overriddenBy', 'name email role');

    res.json(updated);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Emergency workflow not found' });
    }
    next(error);
  }
};

// @desc   Override a workflow step (Safety Officer only — creates mandatory audit log)
// @route  PATCH /api/emergency-workflows/:id/steps/:stepOrder/override
// @access safetyOfficer, superAdmin
const overrideStep = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const stepOrder = parseInt(req.params.stepOrder, 10);

    if (isNaN(stepOrder)) {
      return res.status(400).json({ message: 'Invalid step order' });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ message: 'A reason of at least 5 characters is required for step override' });
    }

    const workflow = await EmergencyWorkflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ message: 'Emergency workflow not found' });
    }

    if (workflow.overallStatus !== 'active') {
      return res.status(400).json({
        message: `Cannot override steps. Workflow status is '${workflow.overallStatus}'`
      });
    }

    const step = workflow.steps.find((s) => s.order === stepOrder);
    if (!step) {
      return res.status(404).json({ message: `Step with order ${stepOrder} not found` });
    }

    if (['completed', 'overridden'].includes(step.status)) {
      return res.status(400).json({ message: `Step is already '${step.status}' and cannot be overridden` });
    }

    const beforeState = workflow.toObject();

    // Mark step as overridden
    step.status = 'overridden';
    step.note = `[OVERRIDE] ${reason}`;

    // Add override log entry
    workflow.overrideLog.push({
      stepOrder,
      stepName: step.name,
      overriddenBy: req.user._id,
      reason: reason.trim(),
      timestamp: new Date()
    });

    // Check if all steps are completed/overridden
    const allDone = workflow.steps.every((s) => ['completed', 'overridden', 'skipped'].includes(s.status));
    if (allDone) {
      workflow.overallStatus = 'overridden';
    }

    await workflow.save();
    const afterState = workflow.toObject();

    // MANDATORY audit entry for override
    await audit({
      action: 'WORKFLOW_STEP_OVERRIDDEN',
      performedBy: req.user._id,
      entityId: workflow._id,
      beforeState,
      afterState,
      details: `Step ${stepOrder} ("${step.name}") overridden on workflow [${workflow._id}] by ${req.user.role} [${req.user._id}]. Reason: ${reason}`,
      ip: req.ip
    });

    const updated = await EmergencyWorkflow.findById(workflow._id)
      .populate('incidentId', 'title severity status')
      .populate('triggeredBy', 'name email role')
      .populate('steps.assignedTo', 'name email role')
      .populate('steps.completedBy', 'name email role')
      .populate('overrideLog.overriddenBy', 'name email role');

    res.json(updated);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Emergency workflow not found' });
    }
    next(error);
  }
};

// @desc   Cancel a workflow
// @route  PATCH /api/emergency-workflows/:id/cancel
// @access safetyOfficer, superAdmin
const cancelWorkflow = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const workflow = await EmergencyWorkflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ message: 'Emergency workflow not found' });
    }

    if (workflow.overallStatus !== 'active') {
      return res.status(400).json({
        message: `Cannot cancel workflow with status '${workflow.overallStatus}'`
      });
    }

    const beforeState = workflow.toObject();
    workflow.overallStatus = 'cancelled';
    await workflow.save();
    const afterState = workflow.toObject();

    await audit({
      action: 'WORKFLOW_CANCELLED',
      performedBy: req.user._id,
      entityId: workflow._id,
      beforeState,
      afterState,
      details: `Workflow [${workflow._id}] cancelled by ${req.user.role}. Reason: ${reason || 'No reason provided'}`,
      ip: req.ip
    });

    const updated = await EmergencyWorkflow.findById(workflow._id)
      .populate('incidentId', 'title severity status')
      .populate('triggeredBy', 'name email role')
      .populate('steps.assignedTo', 'name email role')
      .populate('steps.completedBy', 'name email role');

    res.json(updated);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Emergency workflow not found' });
    }
    next(error);
  }
};

module.exports = {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  completeStep,
  overrideStep,
  cancelWorkflow
};

