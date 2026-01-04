const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { 
  getGymProfile, 
  updateGymProfile,
  checkGymName 
} = require('../controllers/gymController');

// GET /api/gym/profile - Get current gym profile (admin or staff)
router.get('/profile', requireAuth, requireRole('admin', 'staff'), getGymProfile);

// GET /api/gym/check-name - Check if gym name is available (admin only)
router.get('/check-name', requireAuth, requireRole('admin'), checkGymName);

// PUT /api/gym/profile - Update avec upload
router.put('/profile', requireAuth, requireRole('admin'), upload.single('logo'), updateGymProfile);

module.exports = router;