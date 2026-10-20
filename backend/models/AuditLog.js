const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    module: {
      type: String,
      enum: ['AUTH', 'INCIDENT', 'EMERGENCY', 'INSPECTION', 'COMPLIANCE', 'USER_MGMT'],
      required: true
    },
    entityType: {
      type: String,
      default: ''
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    details: {
      type: String,
      default: ''
    },
    beforeState: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    afterState: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook: Ensure userId is synced with performedBy if not explicitly set
auditLogSchema.pre('save', function (next) {
  if (!this.userId && this.performedBy) {
    this.userId = this.performedBy;
  }
  next();
});

module.exports = mongoose.model('AuditLog', auditLogSchema);

