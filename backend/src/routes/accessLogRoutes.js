const express = require('express');
const router = express.Router();
const { getAccessLogs } = require('../controllers/accessLogController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, getAccessLogs);

module.exports = router;
