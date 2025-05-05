const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Login route (public)
router.post('/login', authController.login);

// Protected test route
router.get('/protected', authenticate, (req, res) => {
  res.json({ message: 'This is protected', user: req.user });
});

module.exports = router;