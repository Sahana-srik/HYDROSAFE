const mongoose = require('mongoose');
try {
  require('./Incident');
} catch (e) {
  // Incident model will be registered when required
}

const checklistItemSchema = new mongoose.Schema({
  item: {
    type: String,
    required: true,
    trim: true
  },
  result: {
    type: String,
    enum: ['pass', 'fail', 'NA'],
    default: 'pass'
  },
  note: {
    type: String,
    default: ''
  },
  photoUrl: {
    type: String,
    default: ''
  },
  linkedIncidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    default: null
  }
});

const DEFAULT_HYDROGEN_CHECKLIST = [
  { item: 'Inspect hydrogen piping, flange joints and O-ring seal condition for degradation or embrittlement', result: 'pass', note: '' },
  { item: 'Verify hydrogen leak detection sensors, zero-point baseline and acoustic alarm condition', result: 'pass', note: '' },
  { item: 'Check differential pressure transmitter readings, cell stack vessel integrity and PRV seals', result: 'pass', note: '' },
  { item: 'Test safety interlocks, ESD emergency shutdown actuation readiness and isolation valves', result: 'pass', note: '' }
];

const inspectionSchema = new mongoose.Schema(
  {
    equipment: {
      type: String,
      required: [true, 'Please specify equipment or component name'],
      trim: true
    },
    zone: {
      type: String,
      required: [true, 'Please specify plant zone'],
      trim: true
    },
    type: {
      type: String,
      enum: ['routine', 'ad-hoc', 'emergency'],
      default: 'routine',
      required: true
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Please specify scheduled inspection date']
    },
    inspector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please assign an inspector']
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'missed'],
      default: 'scheduled'
    },
    overallResult: {
      type: String,
      enum: ['pending', 'pass', 'fail', 'NA'],
      default: 'pending'
    },
    checklist: {
      type: [checklistItemSchema],
      default: () => DEFAULT_HYDROGEN_CHECKLIST.map(i => ({ ...i }))
    },
    linkedIncidents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Incident'
      }
    ],
    completedAt: {
      type: Date,
      default: null
    },
    summaryNotes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Inspection', inspectionSchema);
module.exports.DEFAULT_HYDROGEN_CHECKLIST = DEFAULT_HYDROGEN_CHECKLIST;
