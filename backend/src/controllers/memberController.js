const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const addMember = async (req, res) => {
  try {
    const { gymId } = req.user;
    const { name, membership_start, membership_end, email, password } = req.body;

    // Validate required fields
    if (!name || !membership_start || !membership_end || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, email, password, and membership dates are required' 
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

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
          email,  -- ADD THIS LINE
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
    const { name, membership_start, membership_end, email, password } = req.body;

    // Ensure the member belongs to this gym
    const check = await pool.query(
      `SELECT id FROM public.members WHERE id = $1 AND gym_id = $2`,
      [id, gymId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    // Check if email is already taken by another member in the same gym
    if (email) {
      const emailCheck = await pool.query(
        `SELECT id FROM public.members WHERE email = $1 AND gym_id = $2 AND id != $3`,
        [email.trim().toLowerCase(), gymId, id]
      );
      
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Email already exists in this gym' });
      }
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex}`);
      values.push(name.trim());
      paramIndex++;
    }

    if (email) {
      updates.push(`email = $${paramIndex}`);
      values.push(email.trim().toLowerCase());
      paramIndex++;
    }

    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password = $${paramIndex}`);
      values.push(hashedPassword);
      paramIndex++;
    }

    if (membership_start) {
      updates.push(`membership_start = $${paramIndex}`);
      values.push(membership_start);
      paramIndex++;
    }

    if (membership_end) {
      updates.push(`membership_end = $${paramIndex}`);
      values.push(membership_end);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE public.members
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, email, 
       to_char(membership_start, 'YYYY-MM-DD') AS membership_start,
       to_char(membership_end, 'YYYY-MM-DD') AS membership_end,
       status`,
      values
    );

    res.json({ success: true, member: result.rows[0] });
  } catch (error) {
    console.error('Update member error:', error);
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