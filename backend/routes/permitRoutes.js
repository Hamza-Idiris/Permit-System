const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  applyForPermit,
  updateApplication,
  getMyApplications,
  getAllApplications,
  getApplicationById,
  getMyTransactions,
  reviewApplication,
  updateExpiryDate,
  verifyPermit,
  getRenewablePermits,
  renewPermit,
  quoteRenewFee
} = require('../controllers/permitController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    cb(null, `${req.user._id}-${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const cpUpload = upload.fields([
  { name: 'nationalId', maxCount: 1 },
  { name: 'ownershipDocs', maxCount: 1 },
  { name: 'blueprints', maxCount: 1 },
  { name: 'eia', maxCount: 1 }
]);

router.post('/apply', protect, authorizeRoles('applicant', 'staff', 'superadmin'), cpUpload, applyForPermit);
router.put('/:id', protect, authorizeRoles('applicant', 'superadmin'), cpUpload, updateApplication);
router.get('/my-applications', protect, authorizeRoles('applicant', 'superadmin'), getMyApplications);
router.get('/my-transactions', protect, authorizeRoles('applicant', 'superadmin'), getMyTransactions);
router.get('/all', protect, authorizeRoles('staff', 'superadmin', 'inspector'), getAllApplications);
router.get('/renewable', protect, authorizeRoles('applicant', 'staff', 'superadmin'), getRenewablePermits);
router.get('/renew/:id/quote', protect, authorizeRoles('applicant', 'staff', 'superadmin'), quoteRenewFee);
router.post('/renew/:id', protect, authorizeRoles('applicant', 'staff', 'superadmin'), renewPermit);
router.get('/verify/:code', protect, authorizeRoles('staff', 'superadmin', 'inspector'), verifyPermit);
router.post('/verify', protect, authorizeRoles('staff', 'superadmin', 'inspector'), verifyPermit);
router.get('/:id', protect, authorizeRoles('applicant', 'staff', 'superadmin', 'inspector'), getApplicationById);
router.put('/:id/review', protect, authorizeRoles('staff', 'superadmin'), reviewApplication);
router.put('/:id/expiry', protect, authorizeRoles('staff', 'superadmin'), updateExpiryDate);

module.exports = router;
