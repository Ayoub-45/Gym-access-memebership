const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database connection
const pool = require('./config/database');

// Create Express app
const app = express();

// Middleware
app.use(cors()); // Allow frontend to connect
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('src/uploads'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Gym Access Membership API is running!' });
});

// Health check route (test database connection)
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].now 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message 
    });
  }
});

// Import routes
const authRoutes = require('./routes/authRoutes');

// Use routes
app.use('/api/auth', authRoutes);

const verifyRoutes = require("./routes/verifyRoutes");
app.use("/api/verify", verifyRoutes);

const gymRoutes = require('./routes/gym');
// ...
app.use('/api/gym', gymRoutes);

const memberRoutes = require('./routes/memberRoutes');
app.use('/api/members', memberRoutes);

const qrRoutes = require('./routes/qrRoutes');
app.use('/api/qr', qrRoutes);

const memberSelfRoutes = require('./routes/memberSelfRoutes');
app.use('/api/member', memberSelfRoutes);

const staffRoutes = require('./routes/staffRoutes');
app.use('/api/staff', staffRoutes);

const accessLogRoutes = require('./routes/accessLogRoutes');
app.use('/api/access-logs', accessLogRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});