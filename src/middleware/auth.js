const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    
    if (!token) {
      return res.status(401).json({ 
        errors: [{ msg: 'No token, authorization denied' }] 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.user.id };
    next();
    
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ 
      errors: [{ msg: 'Token is not valid' }] 
    });
  }
};