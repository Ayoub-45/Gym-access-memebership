const jwt = require('jsonwebtoken');

// Middleware to require authentication
function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      gymId: payload.gymId,
      memberId: payload.memberId || null, // For member logins
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token has expired. Please login again.' 
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token. Please login again.' 
      });
    }

    return res.status(401).json({ 
      success: false, 
      error: 'Authentication failed.' 
    });
  }
}

// Middleware to require specific role(s)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Check if user is authenticated first
    if (!req.user || !req.user.role) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required.' 
      });
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}` 
      });
    }

    next();
  };
}

// Middleware to check if user can access specific member data
function requireOwnDataOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required.' 
    });
  }

  const requestedMemberId = req.params.id || req.body.memberId;

  // Admin can access any member's data
  if (req.user.role === 'admin') {
    return next();
  }

  // Staff can view member data (but not modify)
  if (req.user.role === 'staff' && req.method === 'GET') {
    return next();
  }

  // Member can only access their own data
  if (req.user.role === 'member' && req.user.memberId === requestedMemberId) {
    return next();
  }

  return res.status(403).json({ 
    success: false, 
    error: 'Access denied. You can only access your own data.' 
  });
}

module.exports = { requireAuth, requireRole, requireOwnDataOrAdmin };
