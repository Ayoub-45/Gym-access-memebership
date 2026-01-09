const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const addMember = async (req, res) => {
  try {
    const { gymId } = req.user;
    const { name, membership_start, membership_end, email, password } = req.body;

    if (!name || !membership_start || !membership_end) {
      return res.status(400).json({ success: false, error: 'Name and membership dates required' });
    }

    // optional login: require both or neither
    if ((email && !password) || (!email && password)) {
      return res
        .status(400)
        .json({ success: false, error: 'Provide both email and password (or neither)' });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : null;
    let hashedPassword = null;

    if (cleanEmail && password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
      `INSERT INTO public.members
       (name, email, password, membership_start, membership_end, status, gym_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email,
                 to_char(membership_start, 'YYYY-MM-DD') AS membership_start,
                 to_char(membership_end, 'YYYY-MM-DD') AS membership_end,
                 status, gym_id, qr_token, created_at`,
      [name.trim(), cleanEmail, hashedPassword, membership_start, membership_end, 'ACTIVE', gymId]
    );

    res.status(201).json({ success: true, member: result.rows[0] });
  } catch (error) {
    // this will catch unique index violation too (email already exists in gym)
    console.error('Add member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


const listMembers = async (req, res) => {
  try {
    const { gymId } = req.user;

    const result = await pool.query(
      `SELECT
          id,
          name,
          to_char(membership_start, 'YYYY-MM-DD') AS membership_start,
          to_char(membership_end, 'YYYY-MM-DD') AS membership_end,
          status,
          CASE 
            WHEN status = 'ACTIVE' AND CURRENT_DATE < membership_end::date 
            THEN 'ACTIVE' 
            ELSE 'INACTIVE' 
          END as effective_status
      FROM public.members
      WHERE gym_id = $1
      ORDER BY id DESC`,
      [gymId]
    );

    res.json({ success: true, members: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


const updateMember = async (req, res) => {
  try {
    const { gymId } = req.user;
    const { id } = req.params;
    const { name, membership_start, membership_end } = req.body;

    // ensure the member belongs to this gym
    const check = await pool.query(
      `SELECT id FROM public.members WHERE id = $1 AND gym_id = $2`,
      [id, gymId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    const result = await pool.query(
      `UPDATE public.members
       SET name = COALESCE($1, name),
           membership_start = COALESCE($2, membership_start),
           membership_end = COALESCE($3, membership_end)
       WHERE id = $4
       RETURNING id, name, membership_start, membership_end, status`,
      [name?.trim() || null, membership_start || null, membership_end || null, id]
    );

    res.json({ success: true, member: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deactivateMember = async (req, res) => {
  try {
    const { gymId } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE public.members
       SET status = 'INACTIVE'
       WHERE id = $1 AND gym_id = $2
       RETURNING id, name, status`,
      [id, gymId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    res.json({ success: true, member: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


module.exports = { addMember, listMembers, updateMember, deactivateMember };