const mongoose = require('mongoose');

const complianceDocSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a document title'],
      trim: true
    },
    category: {
      type: String,
      enum: ['certificate', 'license', 'sds', 'permit', 'regulation', 'procedure', 'other'],
      required: [true, 'Please specify document category']
    },
    fileUrl: {
      type: String,
      default: ''
    },
    originalFilename: {
      type: String,
      default: ''
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    issueDate: {
      type: Date,
      default: null
    },
    expiryDate: {
      type: Date,
      required: [true, 'Please provide an expiry date for compliance tracking']
    },
    version: {
      type: String,
      default: '1.0',
      trim: true
    },
    previousVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ComplianceDoc',
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    notes: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ComplianceDoc', complianceDocSchema);
