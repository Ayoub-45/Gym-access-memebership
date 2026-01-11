const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireOwnDataOrAdmin } = require('../middleware/auth');
const { addMember, listMembers, updateMember, deactivateMember } = require('../controllers/memberController');
const pool = require('../config/database');

// POST /api/members - Add member (admin only)
router.post('/', requireAuth, requireRole('admin'), addMember);

// GET /api/members/stats - Get dashboard stats (admin and staff can view)
router.get('/stats', requireAuth, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { gymId } = req.user;
    console.log('Stats request for gymId:', gymId);

    const totalResult = await pool.query(
      'SELECT COUNT(*)::integer as total_members FROM public.members WHERE gym_id = $1', 
      [gymId]
    );

    const activeResult = await pool.query(
      `SELECT COUNT(*)::integer as active_members
      FROM public.members
      WHERE gym_id = $1
      AND status = 'ACTIVE'
      AND CURRENT_DATE <= membership_end::date`,
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

// GET /api/members - List all members (admin and staff can view)
router.get('/', requireAuth, requireRole('admin', 'staff'), listMembers);

// GET /api/members/:id - Get specific member (admin, staff, or own data)
router.get('/:id', requireAuth, requireOwnDataOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { gymId } = req.user;

    const result = await pool.query(
      `SELECT id, name, email, membership_start, membership_end, status, created_at 
       FROM public.members 
       WHERE id = $1 AND gym_id = $2`,
      [id, gymId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    res.json({ success: true, member: result.rows[0] });
  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/members/:id - Update member (admin only)
router.patch('/:id', requireAuth, requireRole('admin'), updateMember);

// PATCH /api/members/:id/deactivate - Deactivate member (admin only)
router.patch('/:id/deactivate', requireAuth, requireRole('admin'), deactivateMember);

// DELETE /api/members/:id - Delete member (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { gymId } = req.user;

    const result = await pool.query(
      'DELETE FROM public.members WHERE id = $1 AND gym_id = $2 RETURNING id',
      [id, gymId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
