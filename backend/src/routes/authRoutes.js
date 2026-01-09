const express = require('express');
const router = express.Router();
const { signup , login , createStaff } = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

// POST /api/auth/signup
router.post('/signup', signup);

// POST /api/auth/login
router.post('/login', login);

router.post("/staff", requireAuth, requireRole("admin"), createStaff);

module.exports = router;