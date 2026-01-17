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
    console.error('❌ Failed to log access:', error.message);
  }
};

// Generate single-use QR code for a specific member (admin only)
const generateMemberQR = async (req, res) => {
  try {
    const { gymId } = req.user;
    const { id } = req.params; // member ID

    // Get member details and verify gym ownership
    const memberResult = await pool.query(
      `SELECT id, name, membership_end, status, gym_id
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

    // *** NEW: Invalidate all previous unused sessions for this member ***
    await pool.query(
      `UPDATE public.qr_sessions 
       SET used = TRUE, used_at = NOW()
       WHERE member_id = $1 AND used = FALSE`,
      [member.id]
    );

    // Create session that expires in 30 minutes (same as member's own QR)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const sessionResult = await pool.query(
      `INSERT INTO public.qr_sessions (member_id, expires_at)
       VALUES ($1, $2)
       RETURNING session_token, expires_at`,
      [member.id, expiresAt]
    );

    const sessionToken = sessionResult.rows[0].session_token;

    // Create JWT with session token
    const qrToken = jwt.sign(
      {
        memberId: member.id,
        gymId: member.gym_id,
        sessionToken,
        type: 'gym_access_session'
      },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
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
      type: 'session',
      expiresAt: sessionResult.rows[0].expires_at,
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

// Verify QR code for access (staff scans member QR)
const verifyQRAccess = async (req, res) => {
  try {
    const { gymId, userId: staffId } = req.user;
    const { qrData } = req.body;

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

    // Verify gym matches
    if (decoded.gymId !== gymId) {
      await logAccess({
        gymId,
        memberId: decoded.memberId || null,
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

    // Check if it's a session-based QR (single-use)
    if (decoded.type === 'gym_access_session') {
      const sessionResult = await pool.query(
        `SELECT member_id, used, expires_at FROM public.qr_sessions 
         WHERE session_token = $1`,
        [decoded.sessionToken]
      );

      if (sessionResult.rows.length === 0) {
        await logAccess({
          gymId,
          memberId: decoded.memberId,
          memberName: 'Unknown',
          result: 'DENIED_INVALID',
          reason: 'Invalid session token',
          staffId,
        });
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid QR session' 
        });
      }

      const session = sessionResult.rows[0];

      // Check if already used
      if (session.used) {
        await logAccess({
          gymId,
          memberId: decoded.memberId,
          memberName: 'Unknown',
          result: 'DENIED_INVALID',
          reason: 'QR code already used',
          staffId,
        });
        return res.status(401).json({ 
          success: false, 
          error: 'This QR code was already used' 
        });
      }

      // Check if expired
      if (new Date() > new Date(session.expires_at)) {
        await logAccess({
          gymId,
          memberId: decoded.memberId,
          memberName: 'Unknown',
          result: 'DENIED_INVALID',
          reason: 'QR session expired',
          staffId,
        });
        return res.status(401).json({ 
          success: false, 
          error: 'QR code expired. Generate a new one.' 
        });
      }

      // Mark session as used FIRST (before other checks)
      await pool.query(
        `UPDATE public.qr_sessions 
         SET used = TRUE, used_at = NOW() 
         WHERE session_token = $1`,
        [decoded.sessionToken]
      );
    }

    // Check if it's a permanent QR (revocation check)
    if (decoded.type === 'gym_access_permanent') {
      const memberResult = await pool.query(
        `SELECT qr_token FROM public.members WHERE id = $1 AND gym_id = $2`,
        [decoded.memberId, gymId]
      );

      if (memberResult.rows.length === 0 || 
          memberResult.rows[0].qr_token !== decoded.qrToken) {
        await logAccess({
          gymId,
          memberId: decoded.memberId,
          memberName: 'Unknown',
          result: 'DENIED_INVALID',
          reason: 'QR code has been revoked',
          staffId,
        });
        return res.status(401).json({ 
          success: false, 
          error: 'QR code has been revoked' 
        });
      }
    }

    // Get current member status
    const memberResult = await pool.query(
      `SELECT id, name, membership_end, status FROM public.members 
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

    // Check membership expiration (with end-of-day logic)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const membershipEnd = new Date(member.membership_end);
    membershipEnd.setHours(23, 59, 59, 999);

    if (today > membershipEnd) {
      const expiredDate = new Date(member.membership_end);
      const day = String(expiredDate.getDate()).padStart(2, '0');
      const month = String(expiredDate.getMonth() + 1).padStart(2, '0');
      const year = expiredDate.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;

      await logAccess({
        gymId,
        memberId: member.id,
        memberName: member.name,
        result: 'DENIED_EXPIRED',
        reason: `Membership expired on ${formattedDate}`,
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

    // ✅ ACCESS GRANTED
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

// Generate member's own QR code (SINGLE-USE, 30 MINUTES)
const generateMyQR = async (req, res) => {
  try {
    const { gymId, memberId } = req.user;

    const memberResult = await pool.query(
      `SELECT id, name, membership_end, status FROM public.members
       WHERE id = $1 AND gym_id = $2`,
      [memberId, gymId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Member not found' 
      });
    }

    const member = memberResult.rows[0];

    if (member.status !== 'ACTIVE') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot generate QR for inactive member' 
      });
    }

    // *** NEW: Invalidate all previous unused sessions for this member ***
    await pool.query(
      `UPDATE public.qr_sessions 
       SET used = TRUE, used_at = NOW()
       WHERE member_id = $1 AND used = FALSE`,
      [memberId]
    );

    // Create session that expires in 30 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const sessionResult = await pool.query(
      `INSERT INTO public.qr_sessions (member_id, expires_at)
       VALUES ($1, $2)
       RETURNING session_token, expires_at`,
      [memberId, expiresAt]
    );

    const sessionToken = sessionResult.rows[0].session_token;

    // Create JWT with session token
    const qrToken = jwt.sign(
      {
        memberId: member.id,
        gymId,
        sessionToken,
        type: 'gym_access_session'
      },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(qrToken, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
    });

    res.json({
      success: true,
      qrCode: qrCodeDataURL,
      type: 'session',
      expiresAt: sessionResult.rows[0].expires_at,
      member: { 
        id: member.id, 
        name: member.name, 
        membershipEnd: member.membership_end 
      },
    });

  } catch (error) {
    console.error('Generate my QR error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error generating QR code' 
    });
  }
};

module.exports = { generateMemberQR, verifyQRAccess, generateMyQR };
