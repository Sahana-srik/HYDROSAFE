const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const AuditLog = require('../models/AuditLog');


// @desc    Create a new safety incident report
// @route   POST /api/incidents
// @access  Private (All authenticated roles: worker, safetyOfficer, etc.)
const createIncident = async (req, res, next) => {
  try {
    const { title, type, severity, location, description, evidenceUrls } = req.body;

    if (!title || !type || !severity || !location || !description) {
      return res.status(400).json({
        message: 'Please provide all required fields: title, type, severity, location, description'
      });
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        message: `Invalid severity level '${severity}'. Must be one of: ${validSeverities.join(', ')}`
      });
    }

    const initialTimeline = [
      {
        status: 'reported',
        changedBy: req.user._id,
        timestamp: new Date(),
        note: 'Incident report submitted'
      }
    ];

    const incident = await Incident.create({
      title,
      type,
      severity,
      location,
      description,
      reportedBy: req.user._id,
      status: 'reported',
      evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : [],
      timeline: initialTimeline
    });

    // Audit Log
    await AuditLog.create({
      action: 'INCIDENT_CREATED',
      performedBy: req.user._id,
      module: 'INCIDENT',
      details: `Incident reported: ${incident.title} [Severity: ${incident.severity}]`,
      ipAddress: req.ip || ''
    }).catch(err => console.warn('AuditLog note:', err.message));

    const populatedIncident = await Incident.findById(incident._id)
      .populate('reportedBy', 'name email role employeeId department')
      .populate('timeline.changedBy', 'name email role');

    res.status(201).json(populatedIncident);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all incidents (filtered by role)
// @route   GET /api/incidents
// @access  Private
const getIncidents = async (req, res, next) => {
  try {
    let query = {};

    // Workers can only see their own reported incidents
    if (req.user.role === 'worker') {
      query.reportedBy = req.user._id;
    }

    // Optional query parameter filters
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.severity) {
      query.severity = req.query.severity;
    }

    const incidents = await Incident.find(query)
      .populate('reportedBy', 'name email role employeeId department')
      .populate('timeline.changedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json(incidents);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single incident details
// @route   GET /api/incidents/:id
// @access  Private
const getIncidentById = async (req, res, next) => {
  try {
    let query = Incident.findById(req.params.id)
      .populate('reportedBy', 'name email role employeeId department phone')
      .populate('timeline.changedBy', 'name email role department');

    if (mongoose.models.EmergencyWorkflow) {
      query = query.populate('linkedWorkflowId');
    }

    const incident = await query;

    if (!incident) {
      return res.status(404).json({ message: 'Incident record not found' });
    }

    // Role-based access check
    if (
      req.user.role === 'worker' &&
      incident.reportedBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: 'Forbidden: Workers are only authorized to access their own reported incidents'
      });
    }

    res.json(incident);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Incident record not found' });
    }
    next(error);
  }
};


// @desc    Update incident status & append to timeline
// @route   PATCH /api/incidents/:id/status
// @access  Private (safetyOfficer, inspector, ert, complianceAdmin, superAdmin)
const updateIncidentStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const validStatuses = ['reported', 'acknowledged', 'underInvestigation', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident record not found' });
    }

    // Append new timeline entry
    const newTimelineEntry = {
      status,
      changedBy: req.user._id,
      timestamp: new Date(),
      note: note || `Status transitioned from ${incident.status} to ${status}`
    };

    incident.status = status;
    incident.timeline.push(newTimelineEntry);
    await incident.save();

    // Audit Log
    await AuditLog.create({
      action: 'INCIDENT_STATUS_UPDATED',
      performedBy: req.user._id,
      module: 'INCIDENT',
      details: `Incident [${incident._id}] status updated to ${status}`,
      ipAddress: req.ip || ''
    }).catch(err => console.warn('AuditLog note:', err.message));

    const updatedIncident = await Incident.findById(incident._id)
      .populate('reportedBy', 'name email role employeeId department')
      .populate('timeline.changedBy', 'name email role');

    res.json(updatedIncident);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Incident record not found' });
    }
    next(error);
  }
};

const EmergencyWorkflow = require('../models/EmergencyWorkflow');

// Helper: map incident type string to emergency workflow template type
const mapTypeToTemplate = (type) => {
  if (!type) return 'general';
  const lower = type.toLowerCase();
  if (lower.includes('gas') || lower.includes('leak')) return 'gas_leak';
  if (lower.includes('fire')) return 'fire';
  if (lower.includes('pressure') || lower.includes('spike')) return 'pressure_spike';
  if (lower.includes('chemical') || lower.includes('spill')) return 'chemical_spill';
  if (lower.includes('explosion')) return 'explosion';
  if (lower.includes('evacu')) return 'evacuation';
  return 'general';
};

// @desc    Escalate incident to Emergency Response
// @route   POST /api/incidents/:id/escalate
// @access  Private (safetyOfficer, inspector, ert, complianceAdmin, superAdmin)
const escalateIncident = async (req, res, next) => {
  try {
    const { reason, targetSeverity, templateType } = req.body;

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident record not found' });
    }

    if (targetSeverity && ['high', 'critical'].includes(targetSeverity)) {
      incident.severity = targetSeverity;
    } else if (incident.severity === 'low' || incident.severity === 'medium') {
      incident.severity = 'high';
    }

    // Automatically create & link EmergencyWorkflow if none exists
    let workflow = null;
    if (incident.linkedWorkflowId) {
      workflow = await EmergencyWorkflow.findById(incident.linkedWorkflowId);
    }

    if (!workflow) {
      const selectedTemplate = templateType || mapTypeToTemplate(incident.type);
      const defaultSteps = EmergencyWorkflow.getTemplateSteps(selectedTemplate);

      workflow = await EmergencyWorkflow.create({
        incidentId: incident._id,
        templateType: selectedTemplate,
        title: `[ESCALATED] ${incident.title}`,
        steps: defaultSteps,
        overallStatus: 'active',
        triggeredBy: req.user._id,
        overrideLog: []
      });

      incident.linkedWorkflowId = workflow._id;

      await AuditLog.create({
        action: 'WORKFLOW_CREATED',
        performedBy: req.user._id,
        userId: req.user._id,
        module: 'EMERGENCY',
        entityType: 'EmergencyWorkflow',
        entityId: workflow._id,
        afterState: workflow.toObject(),
        details: `Emergency response workflow automatically created via incident escalation [Incident: ${incident._id}]`,
        ipAddress: req.ip || ''
      }).catch(err => console.warn('AuditLog note:', err.message));
    }

    const escalationNote = reason
      ? `ESCALATION TRIGGERED: ${reason}`
      : `ESCALATION TRIGGERED: Escalated to emergency triage status [Severity: ${incident.severity}]`;

    incident.timeline.push({
      status: incident.status,
      changedBy: req.user._id,
      timestamp: new Date(),
      note: escalationNote
    });

    await incident.save();

    // Audit Log for Incident
    await AuditLog.create({
      action: 'INCIDENT_ESCALATED',
      performedBy: req.user._id,
      userId: req.user._id,
      module: 'INCIDENT',
      entityType: 'Incident',
      entityId: incident._id,
      details: `Incident [${incident._id}] escalated by ${req.user.role}. Linked workflow: ${workflow._id}`,
      ipAddress: req.ip || ''
    }).catch(err => console.warn('AuditLog note:', err.message));

    const updatedIncident = await Incident.findById(incident._id)
      .populate('reportedBy', 'name email role employeeId department')
      .populate('timeline.changedBy', 'name email role')
      .populate('linkedWorkflowId');

    res.json({
      message: 'Incident successfully escalated for high-priority emergency response',
      incident: updatedIncident,
      workflow
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Incident record not found' });
    }
    next(error);
  }
};


module.exports = {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  escalateIncident
};
