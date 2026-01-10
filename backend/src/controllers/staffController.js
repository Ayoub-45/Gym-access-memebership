const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// Get all staff for current gym
const listStaff = async (req, res) => {
  try {
    const { gymId } = req.user;
    
    const result = await pool.query(
      `SELECT id, email, role, created_at
       FROM public.users
       WHERE gym_id = $1 AND role = 'staff'
       ORDER BY created_at DESC`,
      [gymId]
    );
    
    res.json({ success: true, staff: result.rows });
  } catch (error) {
    console.error('List staff error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update staff credentials
const updateStaff = async (req, res) => {
  try {
    const { gymId } = req.user;
    const { id } = req.params;
    const { email, password } = req.body;

    // Verify staff belongs to this gym
    const check = await pool.query(
      `SELECT id FROM public.users WHERE id = $1 AND gym_id = $2 AND role = 'staff'`,
      [id, gymId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    // Check if email is already taken by another user
    if (email) {
      const emailCheck = await pool.query(
        `SELECT id FROM public.users WHERE email = $1 AND id != $2`,
        [email.trim().toLowerCase(), id]
      );
      
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Email already exists' });
      }
    }

    let hashedPassword = null;
    if (password && password.trim()) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (email) {
      updates.push(`email = $${paramIndex}`);
      values.push(email.trim().toLowerCase());
      paramIndex++;
    }

    if (hashedPassword) {
      updates.push(`password = $${paramIndex}`);
      values.push(hashedPassword);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE public.users
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, email, role, created_at`,
      values
    );

    res.json({ success: true, staff: result.rows[0] });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete/deactivate staff
const deleteStaff = async (req, res) => {
  try {
    const { gymId } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM public.users
       WHERE id = $1 AND gym_id = $2 AND role = 'staff'
       RETURNING id, email`,
      [id, gymId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    res.json({ success: true, message: 'Staff deleted', staff: result.rows[0] });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { listStaff, updateStaff, deleteStaff };
