const express = require('express');
const router = express.Router();
const { getAccessLogs } = require('../controllers/accessLogController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, requireRole('admin'), getAccessLogs);

module.exports = router;
