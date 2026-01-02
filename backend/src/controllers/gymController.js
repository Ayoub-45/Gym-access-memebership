const pool = require('../config/database');

// Get gym profile
const getGymProfile = async (req, res) => {
  try {
    const { gymId } = req.user; // From JWT token

    const result = await pool.query(
      'SELECT id, name, logo, address, subscription_status, created_at FROM gyms WHERE id = $1',
      [gymId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Gym not found' 
      });
    }

    res.json({
      success: true,
      gym: result.rows[0]
    });
  } catch (error) {
    console.error('Get gym profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// Update gym profile
const updateGymProfile = async (req, res) => {
  try {
    const { gymId, role } = req.user;
    const { name, address } = req.body;

    // Only admin can update gym profile
    if (role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only gym owner can update profile' 
      });
    }

    // Validate input
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Gym name is required' 
      });
    }

    let logoPath = null;
    if (req.file) {
      logoPath = req.file.path;
    } else {
      // Récupérer l'ancien logo si pas de nouveau fichier
      const oldProfile = await pool.query(
        'SELECT logo FROM gyms WHERE id = $1',
        [gymId]
      );
      logoPath = oldProfile.rows[0]?.logo || null;
    }

    // Update query (changez logo = $2 par logoPath)
    const result = await pool.query(
      'UPDATE gyms SET name = $1, logo = $2, address = $3, updated_at = NOW() WHERE id = $4 RETURNING id, name, logo, address, subscription_status, created_at',
      [name.trim(), logoPath, address || null, gymId]  // <-- logoPath au lieu de logo
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Gym not found' 
      });
    }

    res.json({
      success: true,
      message: 'Gym profile updated successfully',
      gym: result.rows[0]
    });
  } catch (error) {
    console.error('Update gym profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// Check if gym name is unique
const checkGymName = async (req, res) => {
  try {
    const { name } = req.query;
    const { gymId } = req.user;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Gym name is required' 
      });
    }

    const result = await pool.query(
      'SELECT id FROM gyms WHERE LOWER(name) = LOWER($1) AND id != $2',
      [name.trim(), gymId]
    );

    res.json({
      success: true,
      available: result.rows.length === 0
    });
  } catch (error) {
    console.error('Check gym name error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

module.exports = { 
  getGymProfile, 
  updateGymProfile,
  checkGymName
};