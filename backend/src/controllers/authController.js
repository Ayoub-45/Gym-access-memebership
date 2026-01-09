const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Signup function
const signup = async (req, res) => {
  try {
    const { email, password, gymName, role } = req.body;

    // 1. Validate input
    if (!email || !password || !gymName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password, and gym name are required' 
      });
    }

    // 2. Check if email already exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email already exists' 
      });
    }

    const userRole = 'admin';

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Start transaction (create gym and user together)
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create gym first
      const gymResult = await client.query(
        'INSERT INTO gyms (name, subscription_status) VALUES ($1, $2) RETURNING *',
        [gymName, 'trial']
      );
      const gym = gymResult.rows[0];

      // Create user linked to gym
      const userResult = await client.query(
        'INSERT INTO users (email, password, role, gym_id) VALUES ($1, $2, $3, $4) RETURNING id, email, role, gym_id, created_at',
        [email, hashedPassword, userRole, gym.id]
      );
      const user = userResult.rows[0];

      // Update gym's owner_id
      await client.query(
        'UPDATE gyms SET owner_id = $1 WHERE id = $2',
        [user.id, gym.id]
      );

      await client.query('COMMIT');

      // 5. Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, gymId: gym.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // 6. Return success response
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          gymId: gym.id,
          gymName: gym.name
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error during signup' 
    });
  }
};

// Login function
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1) Try USERS (admin/staff) first
    const userResult = await pool.query(
      'SELECT * FROM public.users WHERE email = $1',
      [cleanEmail]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' });

      const gymResult = await pool.query('SELECT * FROM public.gyms WHERE id = $1', [user.gym_id]);
      const gym = gymResult.rows[0];

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, gymId: user.gym_id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          gymId: user.gym_id,
          gymName: gym ? gym.name : null,
        },
      });
    }

    // 2) If not a user, try MEMBERS
    const memberResult = await pool.query(
      `SELECT id, name, email, password, gym_id, membership_start, membership_end, status
       FROM public.members
       WHERE email = $1`,
      [cleanEmail]
    );

    if (memberResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const member = memberResult.rows[0];

    if (!member.password) {
      return res.status(401).json({ success: false, error: 'This member has no login credentials' });
    }

    const ok = await bcrypt.compare(password, member.password);
    if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const token = jwt.sign(
      { memberId: member.id, email: member.email, role: 'member', gymId: member.gym_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: member.id,
        email: member.email,
        role: 'member',
        gymId: member.gym_id,
        name: member.name,
        membership_start: member.membership_start,
        membership_end: member.membership_end,
        status: member.status,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Server error during login' });
  }
};

const createStaff = async (req, res) => {
  try {
    const { email, password } = req.body;
    const gymId = req.user.gymId;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    const userExists = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ success: false, error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userResult = await pool.query(
      "INSERT INTO users (email, password, role, gym_id) VALUES ($1, $2, $3, $4) RETURNING id, email, role, gym_id, created_at",
      [email, hashedPassword, "staff", gymId]
    );

    res.status(201).json({ success: true, staff: userResult.rows[0] });
  } catch (error) {
    console.error("Create staff error:", error);
    res.status(500).json({ success: false, error: "Server error during staff creation" });
  }
};

module.exports = { signup , login , createStaff };