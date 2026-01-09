const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/me', requireAuth, requireRole('member'), async (req, res) => {
  try {
    const { memberId } = req.user;

    const result = await pool.query(
      `SELECT id, name, email,
              to_char(membership_start,'YYYY-MM-DD') AS membership_start,
              to_char(membership_end,'YYYY-MM-DD') AS membership_end,
              status, gym_id
       FROM public.members
       WHERE id = $1`,
      [memberId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    res.json({ success: true, member: result.rows[0] });
  } catch (err) {
    console.error('Member me error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
