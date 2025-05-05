const jwt = require('jsonwebtoken');
const { promisify } = require('util');

// Convert jwt.verify to promise-based
const verify = promisify(jwt.verify);

const authenticate = async (req, res, next) => {
  try {
    // 1) Get token
    const authHeader = req.header('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authorization token required (Bearer token)' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // 2) Verify token
    const decoded = await verify(token, process.env.JWT_SECRET);
    
    // 3) Check if user still exists (optional)
    // const currentUser = await User.findById(decoded.id);
    // if (!currentUser) return next(new Error('User no longer exists'));
    
    // 4) Grant access
    req.user = decoded;
    next();
  } catch (err) {
    let message = 'Invalid token';
    if (err.name === 'TokenExpiredError') message = 'Token expired';
    if (err.name === 'JsonWebTokenError') message = 'Malformed token';
    
    return res.status(401).json({ 
      success: false, 
      message,
      error: err.name,
      timestamp: new Date().toISOString()
    });
  }
};

// Higher-order function for role-based access
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

module.exports = { authenticate, restrictTo };