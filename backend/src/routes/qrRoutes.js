const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateMemberQR, verifyQRAccess } = require('../controllers/qrController');

// GET /api/qr/members/:id - Generate QR code for a member
router.get('/members/:id', requireAuth, requireRole('admin', 'staff'), generateMemberQR);

// POST /api/qr/verify - Verify QR code for access
router.post('/verify', requireAuth, requireRole('admin', 'staff'), verifyQRAccess);

module.exports = router;
