const path = require('path');
const fs = require('fs');
const ComplianceDoc = require('../models/ComplianceDoc');
const AuditLog = require('../models/AuditLog');

// Helper: write audit log (non-blocking)
const audit = async ({ action, performedBy, entityId, beforeState, afterState, details, ip }) => {
  try {
    await AuditLog.create({
      action,
      performedBy,
      userId: performedBy,
      module: 'COMPLIANCE',
      entityType: 'ComplianceDoc',
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

// @desc   Create a new compliance document
// @route  POST /api/compliance-docs
// @access complianceAdmin, superAdmin
const createDoc = async (req, res, next) => {
  try {
    const { title, category, issueDate, expiryDate, version, notes, previousVersionId } = req.body;

    if (!title || !category || !expiryDate) {
      return res.status(400).json({
        message: 'title, category, and expiryDate are required'
      });
    }

    const validCategories = ['certificate', 'license', 'sds', 'permit', 'regulation', 'procedure', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      });
    }

    // Handle uploaded file
    let fileUrl = '';
    let originalFilename = '';
    if (req.file) {
      fileUrl = `/uploads/compliance/${req.file.filename}`;
      originalFilename = req.file.originalname;
    }

    const doc = await ComplianceDoc.create({
      title,
      category,
      fileUrl,
      originalFilename,
      uploadedBy: req.user._id,
      issueDate: issueDate ? new Date(issueDate) : null,
      expiryDate: new Date(expiryDate),
      version: version || '1.0',
      notes: notes || '',
      previousVersionId: previousVersionId || null,
      isActive: true
    });

    await audit({
      action: 'COMPLIANCE_DOC_CREATED',
      performedBy: req.user._id,
      entityId: doc._id,
      afterState: doc.toObject(),
      details: `Compliance document created: "${title}" [Category: ${category}, Version: ${doc.version}, Expires: ${expiryDate}]`,
      ip: req.ip
    });

    const populated = await ComplianceDoc.findById(doc._id)
      .populate('uploadedBy', 'name email role')
      .populate('previousVersionId', 'title version createdAt');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc   Get all compliance documents
// @route  GET /api/compliance-docs
// @access All authenticated
const getDocs = async (req, res, next) => {
  try {
    const query = {};

    // Default to only active documents
    query.isActive = req.query.isActive === 'false' ? false : true;

    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.search) {
      query.title = { $regex: req.query.search, $options: 'i' };
    }

    const docs = await ComplianceDoc.find(query)
      .populate('uploadedBy', 'name email role')
      .populate('previousVersionId', 'title version')
      .sort({ createdAt: -1 });

    res.json(docs);
  } catch (error) {
    next(error);
  }
};

// @desc   Get single compliance document by ID
// @route  GET /api/compliance-docs/:id
// @access All authenticated
const getDocById = async (req, res, next) => {
  try {
    const doc = await ComplianceDoc.findById(req.params.id)
      .populate('uploadedBy', 'name email role employeeId department')
      .populate('previousVersionId', 'title version createdAt fileUrl');

    if (!doc) {
      return res.status(404).json({ message: 'Compliance document not found' });
    }

    res.json(doc);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Compliance document not found' });
    }
    next(error);
  }
};

// @desc   Update a compliance document
// @route  PATCH /api/compliance-docs/:id
// @access complianceAdmin, superAdmin
const updateDoc = async (req, res, next) => {
  try {
    const { title, category, issueDate, expiryDate, version, notes } = req.body;

    const doc = await ComplianceDoc.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Compliance document not found' });
    }

    const before = doc.toObject();

    // Update fields
    if (title) doc.title = title;
    if (category) doc.category = category;
    if (issueDate !== undefined) doc.issueDate = issueDate ? new Date(issueDate) : null;
    if (expiryDate) doc.expiryDate = new Date(expiryDate);
    if (version) doc.version = version;
    if (notes !== undefined) doc.notes = notes;

    // Handle new file upload
    if (req.file) {
      doc.fileUrl = `/uploads/compliance/${req.file.filename}`;
      doc.originalFilename = req.file.originalname;
    }

    await doc.save();
    const after = doc.toObject();

    await audit({
      action: 'COMPLIANCE_DOC_UPDATED',
      performedBy: req.user._id,
      entityId: doc._id,
      beforeState: before,
      afterState: after,
      details: `Compliance document [${doc._id}] "${doc.title}" updated. Version: ${before.version} → ${doc.version}`,
      ip: req.ip
    });

    const updated = await ComplianceDoc.findById(doc._id)
      .populate('uploadedBy', 'name email role')
      .populate('previousVersionId', 'title version');

    res.json(updated);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Compliance document not found' });
    }
    next(error);
  }
};

// @desc   Soft-delete a compliance document
// @route  DELETE /api/compliance-docs/:id
// @access complianceAdmin, superAdmin
const deleteDoc = async (req, res, next) => {
  try {
    const doc = await ComplianceDoc.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Compliance document not found' });
    }

    const beforeState = doc.toObject();
    doc.isActive = false;
    await doc.save();
    const afterState = doc.toObject();

    await audit({
      action: 'COMPLIANCE_DOC_DELETED',
      performedBy: req.user._id,
      entityId: doc._id,
      beforeState,
      afterState,
      details: `Compliance document [${doc._id}] "${doc.title}" soft-deleted by ${req.user.role}`,
      ip: req.ip
    });

    res.json({ message: 'Compliance document successfully archived', docId: doc._id });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Compliance document not found' });
    }
    next(error);
  }
};

// @desc   Get documents expiring within N days
// @route  GET /api/compliance-docs/expiring?days=30
// @access All authenticated
const getExpiringDocs = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;

    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const docs = await ComplianceDoc.find({
      isActive: true,
      expiryDate: { $gte: now, $lte: cutoff }
    })
      .populate('uploadedBy', 'name email role')
      .sort({ expiryDate: 1 });

    // Also get already-expired docs
    const expired = await ComplianceDoc.find({
      isActive: true,
      expiryDate: { $lt: now }
    })
      .populate('uploadedBy', 'name email role')
      .sort({ expiryDate: 1 });

    res.json({
      days,
      expiringSoon: docs,
      alreadyExpired: expired,
      total: docs.length + expired.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Create a new version of an existing document
// @route  POST /api/compliance-docs/:id/new-version
// @access complianceAdmin, superAdmin
const newVersion = async (req, res, next) => {
  try {
    const { title, issueDate, expiryDate, version, notes } = req.body;

    const oldDoc = await ComplianceDoc.findById(req.params.id);
    if (!oldDoc) {
      return res.status(404).json({ message: 'Compliance document not found' });
    }

    if (!expiryDate) {
      return res.status(400).json({ message: 'expiryDate is required for new version' });
    }

    // Auto-increment version if not provided
    const newVersionNum = version || incrementVersion(oldDoc.version);

    // Handle uploaded file
    let fileUrl = oldDoc.fileUrl; // inherit old file if no new upload
    let originalFilename = oldDoc.originalFilename;
    if (req.file) {
      fileUrl = `/uploads/compliance/${req.file.filename}`;
      originalFilename = req.file.originalname;
    }

    const beforeOldState = oldDoc.toObject();

    // Create new version document
    const newDoc = await ComplianceDoc.create({
      title: title || oldDoc.title,
      category: oldDoc.category,
      fileUrl,
      originalFilename,
      uploadedBy: req.user._id,
      issueDate: issueDate ? new Date(issueDate) : oldDoc.issueDate,
      expiryDate: new Date(expiryDate),
      version: newVersionNum,
      notes: notes || '',
      previousVersionId: oldDoc._id,
      isActive: true
    });

    // Deactivate the old version
    oldDoc.isActive = false;
    await oldDoc.save();

    await audit({
      action: 'COMPLIANCE_VERSION_UPDATED',
      performedBy: req.user._id,
      entityId: newDoc._id,
      beforeState: beforeOldState,
      afterState: newDoc.toObject(),
      details: `New version "${newVersionNum}" created for "${newDoc.title}" [New ID: ${newDoc._id}, Previous ID: ${oldDoc._id}]`,
      ip: req.ip
    });

    const populated = await ComplianceDoc.findById(newDoc._id)
      .populate('uploadedBy', 'name email role')
      .populate('previousVersionId', 'title version createdAt');

    res.status(201).json(populated);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Compliance document not found' });
    }
    next(error);
  }
};

// Helper: auto-increment version string (e.g. "1.0" → "2.0", "1.3" → "1.4")
function incrementVersion(versionStr) {
  if (!versionStr) return '2.0';
  const parts = versionStr.split('.');
  if (parts.length >= 2) {
    const major = parseInt(parts[0], 10);
    const minor = parseInt(parts[1], 10);
    return `${major}.${minor + 1}`;
  }
  const v = parseInt(parts[0], 10);
  return `${v + 1}.0`;
}

module.exports = {
  createDoc,
  getDocs,
  getDocById,
  updateDoc,
  deleteDoc,
  getExpiringDocs,
  newVersion
};

