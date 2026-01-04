const pool = require('../config/database');

const addMember = async (req, res) => {
  try {
    const { gymId } = req.user;
    const { name, membership_start, membership_end } = req.body;

    if (!name || !membership_start || !membership_end) {
      return res.status(400).json({ success: false, error: 'Name and membership dates required' });
    }

    const result = await pool.query(
      'INSERT INTO public.members (name, membership_start, membership_end, status, gym_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name.trim(), membership_start, membership_end, 'ACTIVE', gymId]
    );

    res.status(201).json({ success: true, member: result.rows[0] });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { addMember };