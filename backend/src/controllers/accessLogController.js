const pool = require('../config/database');

// Get access logs for gym owner
const getAccessLogs = async (req, res) => {
  try {
    const { gymId } = req.user;
    const { limit = 100 } = req.query;

    const result = await pool.query(
      `SELECT 
        id, member_name, scanned_at, result, reason
       FROM public.access_logs
       WHERE gym_id = $1
       ORDER BY scanned_at DESC
       LIMIT $2`,
      [gymId, limit]
    );

    res.json({ success: true, logs: result.rows });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getAccessLogs };
