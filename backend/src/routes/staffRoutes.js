const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { listStaff, updateStaff, deleteStaff } = require('../controllers/staffController');

// GET /api/staff - List all staff (admin only)
router.get('/', requireAuth, requireRole('admin'), listStaff);

// PATCH /api/staff/:id - Update staff credentials (admin only)
router.patch('/:id', requireAuth, requireRole('admin'), updateStaff);

// DELETE /api/staff/:id - Delete staff (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), deleteStaff);

module.exports = router;
