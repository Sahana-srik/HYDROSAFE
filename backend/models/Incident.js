const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['reported', 'acknowledged', 'underInvestigation', 'resolved', 'closed'],
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    default: ''
  }
});

const incidentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide incident title'],
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Please specify incident type (e.g., Hydrogen Leak, Pressure Spike, Near Miss)'],
      trim: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: [true, 'Please specify incident severity level']
    },
    location: {
      type: String,
      required: [true, 'Please specify incident location within plant'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Please provide detailed incident description'],
      trim: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['reported', 'acknowledged', 'underInvestigation', 'resolved', 'closed'],
      default: 'reported'
    },
    evidenceUrls: [
      {
        type: String
      }
    ],
    timeline: [timelineSchema],
    linkedWorkflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyWorkflow',
      default: null
    },
    linkedInspectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inspection',
      default: null
    },
    linkedChecklistItem: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Incident', incidentSchema);
