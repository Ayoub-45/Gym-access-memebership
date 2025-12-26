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

    const userRole = role === 'staff' ? 'staff' : 'admin';

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

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    // 2. Check if user exists
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    const user = userResult.rows[0];

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // 4. Get gym information
    const gymResult = await pool.query(
      'SELECT * FROM gyms WHERE id = $1',
      [user.gym_id]
    );

    const gym = gymResult.rows[0];

    // 5. Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role, 
        gymId: user.gym_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 6. Return success response
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        gymId: user.gym_id,
        gymName: gym ? gym.name : null
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error during login' 
    });
  }
};

module.exports = { signup , login };