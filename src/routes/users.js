const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Shared configuration
const saltRounds = 12;
const JWT_CONFIG = {
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  algorithm: 'HS256'
};

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many attempts, please try again later',
  trustProxy: true,
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip
});

// Validation chains
const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores'),
  
  body('password')
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    })
    .withMessage('Password must be at least 8 characters with 1 lowercase, 1 uppercase, 1 number, and 1 symbol'),
  
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail()
];

const validateLogin = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Get all users route (protected, admin-only)
router.get('/users', async (req, res) => {
    // Verify JWT token first
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }
  
    let connection;
    try {
      // Verify token and check if user is admin
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admin users can access this endpoint'
        });
      }
  
      connection = await db.promisePool.getConnection();
      
      // Fetch all users (excluding passwords for security)
      const [users] = await connection.query(
        'SELECT user_id as id, username, email, type, created_at FROM users'
      );
  
      return res.json({
        success: true,
        users
      });
  
    } catch (error) {
      console.error('Get users error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
  
      return res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    } finally {
      if (connection) connection.release();
    }
  });

// Registration Route
// Registration Route
router.post('/register', authLimiter, validateRegister, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
  
    const { username, password, email } = req.body;
    let connection;
  
    try {
      connection = await db.promisePool.getConnection();
      
      // Check for existing user (updated to use user_id)
      const [existing] = await connection.query(
        'SELECT user_id FROM users WHERE username = ? OR email = ?',
        [username, email]
      );
  
      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Username or email already exists'
        });
      }
  
      // Hash password
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      // Create user
      const [result] = await connection.query(
        'INSERT INTO users (username, password, email, type) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, email, 'user']
      );
  
      // Generate token (using user_id as id)
      const token = jwt.sign(
        { id: result.insertId, username, type: 'user' },
        process.env.JWT_SECRET,
        JWT_CONFIG
      );
  
      return res.status(201).json({
        success: true,
        token,
        user: { id: result.insertId, username, email, type: 'user' }
      });
  
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: error.message // Added for debugging
      });
    } finally {
      if (connection) connection.release();
    }
  });
  
  // Login Route
  router.post('/login', authLimiter, validateLogin, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
  
    const { username, password } = req.body;
    let connection;
  
    try {
      connection = await db.promisePool.getConnection();
      
      // Find user by username (updated to use user_id as id)
      const [users] = await connection.query(
        'SELECT user_id as id, username, password, type FROM users WHERE username = ?',
        [username]
      );
  
      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }
  
      const user = users[0];
  
      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }
  
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          type: user.type 
        },
        process.env.JWT_SECRET,
        JWT_CONFIG
      );
  
      // Return success response with token and user data
      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          type: user.type
        }
      });
  
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: error.message // Added for debugging
      });
    } finally {
      if (connection) connection.release();
    }
  });
module.exports = router;