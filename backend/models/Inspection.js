const mongoose = require('mongoose');

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
  }
});

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
    checklist: [checklistItemSchema],
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
