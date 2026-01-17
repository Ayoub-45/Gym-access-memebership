const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateMemberQR, verifyQRAccess, generateMyQR } = require('../controllers/qrController');

// Admin only - Generate QR code for any member
router.get('/members/:id', requireAuth, requireRole('admin'), generateMemberQR);

// Member only - Generate their own QR code
router.get('/my-qr', requireAuth, requireRole('member'), generateMyQR);

// Admin and Staff - Verify QR codes at entrance
router.post('/verify', requireAuth, requireRole('admin', 'staff'), verifyQRAccess);

module.exports = router;
