const QRCode = require('qrcode');
const pool = require('../config/database');
const jwt = require('jsonwebtoken');

// Helper function to log access attempts
const logAccess = async (data) => {
  try {
    await pool.query(
      `INSERT INTO public.access_logs 
       (member_id, member_name, gym_id, result, reason, scanned_by_staff_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        data.memberId,
        data.memberName,
        data.gymId,
        data.result,
        data.reason,
        data.staffId || null,
      ]
    );
    console.log('✅ Access logged:', data.result, '-', data.memberName);
  } catch (error) {
    // Don't let logging failure break the verification
    console.error('❌ Failed to log access:', error.message);
  }
};

// Generate QR code for a specific member
const generateMemberQR = async (req, res) => {
  try {
    const { gymId } = req.user;
    const { id } = req.params; // member ID

    // Get member details and verify gym ownership
    const memberResult = await pool.query(
      `SELECT id, name, qr_token, membership_end, status, gym_id 
       FROM public.members 
       WHERE id = $1 AND gym_id = $2`,
      [id, gymId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Member not found' 
      });
    }

    const member = memberResult.rows[0];

    // Check if member is active
    if (member.status !== 'ACTIVE') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot generate QR for inactive member' 
      });
    }

    // Create secure token with member info
    const qrToken = jwt.sign(
      {
        memberId: member.id,
        gymId: member.gym_id,
        qrToken: member.qr_token,
        type: 'gym_access'
      },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(qrToken, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1
    });

    res.json({
      success: true,
      qrCode: qrCodeDataURL,
      member: {
        id: member.id,
        name: member.name,
        membershipEnd: member.membership_end
      }
    });

  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error generating QR code' 
    });
  }
};

// Verify QR code for access (staff scans member QR) - WITH LOGGING
const verifyQRAccess = async (req, res) => {
  try {
    const { gymId, userId: staffId } = req.user; // Staff's gym and ID
    const { qrData } = req.body; // Scanned QR code data

    if (!qrData) {
      return res.status(400).json({ 
        success: false, 
        error: 'QR code data is required' 
      });
    }

    // Decode JWT from QR
    let decoded;
    try {
      decoded = jwt.verify(qrData, process.env.JWT_SECRET);
    } catch (err) {
      // Log invalid QR attempt
      await logAccess({
        gymId,
        memberId: null,
        memberName: 'Unknown',
        result: 'DENIED_INVALID',
        reason: 'Invalid or expired JWT token',
        staffId,
      });

      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired QR code' 
      });
    }

    // Verify it's a gym access QR
    if (decoded.type !== 'gym_access') {
      await logAccess({
        gymId,
        memberId: decoded.memberId || null,
        memberName: 'Unknown',
        result: 'DENIED_INVALID',
        reason: 'Invalid QR code type',
        staffId,
      });

      return res.status(400).json({ 
        success: false, 
        error: 'Invalid QR code type' 
      });
    }

    // Verify gym matches
    if (decoded.gymId !== gymId) {
      await logAccess({
        gymId,
        memberId: decoded.memberId,
        memberName: 'Unknown Member',
        result: 'DENIED_INVALID',
        reason: 'QR code is for a different gym',
        staffId,
      });

      return res.status(403).json({ 
        success: false, 
        error: 'QR code is for a different gym' 
      });
    }

    // Get current member status from database
    const memberResult = await pool.query(
      `SELECT id, name, membership_end, status, qr_token
       FROM public.members 
       WHERE id = $1 AND gym_id = $2`,
      [decoded.memberId, gymId]
    );

    if (memberResult.rows.length === 0) {
      await logAccess({
        gymId,
        memberId: decoded.memberId,
        memberName: 'Deleted Member',
        result: 'DENIED_INVALID',
        reason: 'Member not found in database',
        staffId,
      });

      return res.status(404).json({ 
        success: false, 
        error: 'Member not found' 
      });
    }

    const member = memberResult.rows[0];

    // Verify QR token matches (check if revoked)
    if (member.qr_token !== decoded.qrToken) {
      await logAccess({
        gymId,
        memberId: member.id,
        memberName: member.name,
        result: 'DENIED_INVALID',
        reason: 'QR code has been revoked',
        staffId,
      });

      return res.status(401).json({ 
        success: false, 
        error: 'QR code has been revoked' 
      });
    }

    // Check if member is active
    if (member.status !== 'ACTIVE') {
      await logAccess({
        gymId,
        memberId: member.id,
        memberName: member.name,
        result: 'DENIED_INACTIVE',
        reason: `Member status is ${member.status}`,
        staffId,
      });

      return res.status(403).json({ 
        success: false, 
        error: 'Member account is inactive',
        member: { name: member.name, status: member.status }
      });
    }

    // Check if membership has expired
    const today = new Date();
    const membershipEnd = new Date(member.membership_end);
    
    if (today >= membershipEnd) {
      await logAccess({
        gymId,
        memberId: member.id,
        memberName: member.name,
        result: 'DENIED_EXPIRED',
        reason: `Membership expired on ${member.membership_end}`,
        staffId,
      });

      return res.status(403).json({ 
        success: false, 
        error: 'Membership has expired',
        member: { 
          name: member.name, 
          membershipEnd: member.membership_end 
        }
      });
    }

    // ✅ ACCESS GRANTED - Log success
    await logAccess({
      gymId,
      memberId: member.id,
      memberName: member.name,
      result: 'SUCCESS',
      reason: 'Access granted - Valid membership',
      staffId,
    });

    res.json({
      success: true,
      message: 'Access granted',
      member: {
        id: member.id,
        name: member.name,
        membershipEnd: member.membership_end,
        status: member.status
      }
    });

  } catch (error) {
    console.error('Verify QR access error:', error);
    
    // Log system error
    await logAccess({
      gymId: req.user?.gymId,
      memberId: null,
      memberName: 'System Error',
      result: 'DENIED_INVALID',
      reason: `Server error: ${error.message}`,
      staffId: req.user?.userId,
    });

    res.status(500).json({ 
      success: false, 
      error: 'Server error verifying access' 
    });
  }
};

// Generate member's own QR code
const generateMyQR = async (req, res) => {
  try {
    const { gymId, memberId } = req.user;

    const memberResult = await pool.query(
      `SELECT id, name, qr_token, membership_end, status, gym_id
       FROM public.members
       WHERE id = $1 AND gym_id = $2`,
      [memberId, gymId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    const member = memberResult.rows[0];

    if (member.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Cannot generate QR for inactive member' });
    }

    const qrToken = jwt.sign(
      {
        memberId: member.id,
        gymId: member.gym_id,
        qrToken: member.qr_token,
        type: 'gym_access',
      },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    const qrCodeDataURL = await QRCode.toDataURL(qrToken, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
    });

    res.json({
      success: true,
      qrCode: qrCodeDataURL,
      member: { id: member.id, name: member.name, membershipEnd: member.membership_end },
    });
  } catch (error) {
    console.error('Generate my QR error:', error);
    res.status(500).json({ success: false, error: 'Server error generating QR code' });
  }
};

module.exports = { generateMemberQR, verifyQRAccess, generateMyQR };
