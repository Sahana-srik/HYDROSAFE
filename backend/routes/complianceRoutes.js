const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const {
  createDoc,
  getDocs,
  getDocById,
  updateDoc,
  deleteDoc,
  getExpiringDocs,
  newVersion
} = require('../controllers/complianceController');
const { protect, requireRole } = require('../middleware/auth');

// Ensure uploads/compliance directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'compliance');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `compliance-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept PDFs, images, and common document types
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, images, Word, Excel'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// All compliance routes require authentication
router.use(protect);

// IMPORTANT: /expiring must be defined BEFORE /:id to avoid route conflict
router.get('/expiring', getExpiringDocs);

// List all / Create new
router.get('/', getDocs);
router.post(
  '/',
  requireRole('complianceAdmin', 'superAdmin'),
  upload.single('file'),
  createDoc
);

// Single document CRUD
router.get('/:id', getDocById);
router.patch(
  '/:id',
  requireRole('complianceAdmin', 'superAdmin'),
  upload.single('file'),
  updateDoc
);
router.delete(
  '/:id',
  requireRole('complianceAdmin', 'superAdmin'),
  deleteDoc
);

// Create new version
router.post(
  '/:id/new-version',
  requireRole('complianceAdmin', 'superAdmin'),
  upload.single('file'),
  newVersion
);

module.exports = router;
