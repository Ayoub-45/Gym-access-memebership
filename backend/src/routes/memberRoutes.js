const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { addMember, listMembers } = require('../controllers/memberController');
const { updateMember } = require('../controllers/memberController');
const { deactivateMember } = require('../controllers/memberController');
const pool = require('../config/database');

// POST /api/members - Add member (admin only)
router.post('/', requireAuth, requireRole('admin'), addMember);

// GET /api/members/stats - Get dashboard stats
router.get('/stats', requireAuth, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { gymId } = req.user;
    console.log('Stats request for gymId:', gymId);

    const totalResult = await pool.query(
      'SELECT COUNT(*)::integer as total_members FROM public.members WHERE gym_id = $1', 
      [gymId]
    );

    // FIXED: Now checks CURRENT_DATE < membership_end (28 Jan < 30 Jan = active)
    const activeResult = await pool.query(
      `SELECT COUNT(*)::integer as active_members 
       FROM public.members 
       WHERE gym_id = $1 
         AND status = 'ACTIVE' 
         AND CURRENT_DATE < membership_end::date`, 
      [gymId]
    );

    console.log('DB Results:', totalResult.rows[0], activeResult.rows[0]);

    res.json({ 
      success: true, 
      stats: {
        total_members: totalResult.rows[0].total_members,
        active_members: activeResult.rows[0].active_members,
        today_checkins: 0
      }
    });
  } catch (error) {
    console.error('Stats API ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', requireAuth, requireRole('admin', 'staff'), listMembers);

router.patch('/:id', requireAuth, requireRole('admin'), updateMember);

router.patch('/:id/deactivate', requireAuth, requireRole('admin'), deactivateMember);

module.exports = router;