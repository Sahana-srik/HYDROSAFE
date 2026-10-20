const mongoose = require('mongoose');

// Sub-schema for individual workflow steps
const stepSchema = new mongoose.Schema({
  order: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'overridden', 'skipped'],
    default: 'pending'
  },
  dueAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  note: {
    type: String,
    default: ''
  }
}, { _id: true });

// Sub-schema for override audit trail entries
const overrideLogSchema = new mongoose.Schema({
  stepOrder: {
    type: Number,
    required: true
  },
  stepName: {
    type: String,
    default: ''
  },
  overriddenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const emergencyWorkflowSchema = new mongoose.Schema(
  {
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: [true, 'Workflow must be linked to an incident']
    },
    templateType: {
      type: String,
      enum: ['gas_leak', 'fire', 'pressure_spike', 'chemical_spill', 'explosion', 'evacuation', 'general'],
      required: [true, 'Please specify a workflow template type']
    },
    title: {
      type: String,
      trim: true,
      default: ''
    },
    steps: [stepSchema],
    overallStatus: {
      type: String,
      enum: ['active', 'completed', 'overridden', 'cancelled'],
      default: 'active'
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    overrideLog: [overrideLogSchema]
  },
  {
    timestamps: true
  }
);

// Helper: generate default steps for each template type
emergencyWorkflowSchema.statics.getTemplateSteps = function (templateType, hoursFromNow) {
  const now = new Date();
  const addHours = (h) => new Date(now.getTime() + h * 60 * 60 * 1000);

  const templates = {
    gas_leak: [
      { order: 1, name: 'Isolate the affected area and shut off gas supply', dueAt: addHours(0.25) },
      { order: 2, name: 'Notify ERT (Emergency Response Team)', dueAt: addHours(0.5) },
      { order: 3, name: 'Evacuate personnel from danger zone', dueAt: addHours(1) },
      { order: 4, name: 'Deploy gas detectors and monitor concentration levels', dueAt: addHours(2) },
      { order: 5, name: 'Contain the leak and execute repair procedures', dueAt: addHours(4) },
      { order: 6, name: 'Conduct post-incident debrief and submit report', dueAt: addHours(24) }
    ],
    fire: [
      { order: 1, name: 'Activate fire alarm and alert ERT', dueAt: addHours(0.08) },
      { order: 2, name: 'Call fire department (emergency services)', dueAt: addHours(0.17) },
      { order: 3, name: 'Evacuate all personnel immediately', dueAt: addHours(0.25) },
      { order: 4, name: 'Shut off gas and electrical supplies to affected zone', dueAt: addHours(0.5) },
      { order: 5, name: 'Attempt suppression only if safe to do so', dueAt: addHours(1) },
      { order: 6, name: 'Post-incident inspection and incident report', dueAt: addHours(24) }
    ],
    pressure_spike: [
      { order: 1, name: 'Reduce system pressure via pressure relief valve', dueAt: addHours(0.17) },
      { order: 2, name: 'Notify control room and safety officer', dueAt: addHours(0.5) },
      { order: 3, name: 'Evacuate proximate personnel', dueAt: addHours(1) },
      { order: 4, name: 'Inspect pipeline and pressure vessel integrity', dueAt: addHours(3) },
      { order: 5, name: 'Document findings and authorize restart', dueAt: addHours(8) }
    ],
    chemical_spill: [
      { order: 1, name: 'Isolate spill area and prevent spread', dueAt: addHours(0.25) },
      { order: 2, name: 'Notify ERT and don appropriate PPE', dueAt: addHours(0.5) },
      { order: 3, name: 'Evacuate non-essential personnel', dueAt: addHours(1) },
      { order: 4, name: 'Apply appropriate containment and neutralization', dueAt: addHours(2) },
      { order: 5, name: 'Dispose of hazardous materials per MSDS/SDS', dueAt: addHours(6) },
      { order: 6, name: 'Decontaminate area and verify safe levels', dueAt: addHours(12) }
    ],
    explosion: [
      { order: 1, name: 'Call emergency services immediately (fire/ambulance)', dueAt: addHours(0.08) },
      { order: 2, name: 'Evacuate all plant personnel to muster point', dueAt: addHours(0.17) },
      { order: 3, name: 'Shut off all hydrogen supply feeds', dueAt: addHours(0.25) },
      { order: 4, name: 'Account for all personnel at muster point', dueAt: addHours(0.5) },
      { order: 5, name: 'Do not re-enter until declared safe by fire department', dueAt: addHours(4) },
      { order: 6, name: 'Initiate regulatory notification and incident investigation', dueAt: addHours(24) }
    ],
    evacuation: [
      { order: 1, name: 'Sound evacuation alarm', dueAt: addHours(0.08) },
      { order: 2, name: 'ERT leads personnel to designated muster points', dueAt: addHours(0.25) },
      { order: 3, name: 'Take headcount and identify missing personnel', dueAt: addHours(0.5) },
      { order: 4, name: 'Report muster point status to safety officer', dueAt: addHours(0.75) },
      { order: 5, name: 'Provide all-clear or escalate to emergency services', dueAt: addHours(1) }
    ],
    general: [
      { order: 1, name: 'Assess the situation and secure the area', dueAt: addHours(0.5) },
      { order: 2, name: 'Notify Safety Officer and ERT', dueAt: addHours(1) },
      { order: 3, name: 'Implement immediate mitigation measures', dueAt: addHours(2) },
      { order: 4, name: 'Monitor situation and maintain communication', dueAt: addHours(4) },
      { order: 5, name: 'Document actions taken and submit incident report', dueAt: addHours(24) }
    ]
  };

  return (templates[templateType] || templates.general).map((s) => ({
    ...s,
    status: 'pending',
    assignedTo: null,
    completedAt: null,
    completedBy: null,
    note: ''
  }));
};

module.exports = mongoose.model('EmergencyWorkflow', emergencyWorkflowSchema);
