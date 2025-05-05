// routes/resorts.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/authenticate'); // Assuming you have an auth middleware

// Validation rules for resort creation/update
const validateResort = [
  body('name').trim().notEmpty().withMessage('Resort name is required'),
  body('lat').isDecimal().withMessage('Latitude must be a decimal number'),
  body('longitude').isDecimal().withMessage('Longitude must be a decimal number'),
  body('description').optional().trim(),
  body('address').optional().trim(),
  body('contact_number').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('website').optional().isURL().withMessage('Invalid website URL')
];

// Get all resorts
router.get('/', async (req, res) => {
  try {
    const [resorts] = await db.promisePool.query(
      'SELECT resort_id, name, lat, longitude, description FROM resorts'
    );
    
    res.json({
      success: true,
      data: resorts
    });
  } catch (error) {
    console.error('Error fetching resorts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resorts'
    });
  }
});

// Get a single resort by ID
router.get('/:id', async (req, res) => {
  try {
    const [resorts] = await db.promisePool.query(
      'SELECT * FROM resorts WHERE resort_id = ?',
      [req.params.id]
    );
    
    if (resorts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resort not found'
      });
    }
    
    res.json({
      success: true,
      data: resorts[0]
    });
  } catch (error) {
    console.error('Error fetching resort:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resort'
    });
  }
});

// Create a new resort (protected route)
router.post('/', authenticate, validateResort, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { name, lat, longitude, description, address, contact_number, email, website } = req.body;
  
  try {
    const [result] = await db.promisePool.query(
      `INSERT INTO resorts 
       (name, lat, longitude, description, address, contact_number, email, website)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, lat, longitude, description, address, contact_number, email, website]
    );
    
    res.status(201).json({
      success: true,
      resort_id: result.insertId,
      message: 'Resort created successfully'
    });
  } catch (error) {
    console.error('Error creating resort:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create resort'
    });
  }
});

// Update a resort (protected route)
router.put('/:id', authenticate, validateResort, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { name, lat, longitude, description, address, contact_number, email, website } = req.body;
  
  try {
    const [result] = await db.promisePool.query(
      `UPDATE resorts SET 
        name = ?, lat = ?, longitude = ?, description = ?, 
        address = ?, contact_number = ?, email = ?, website = ?
       WHERE resort_id = ?`,
      [name, lat, longitude, description, address, contact_number, email, website, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resort not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Resort updated successfully'
    });
  } catch (error) {
    console.error('Error updating resort:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update resort'
    });
  }
});

// Delete a resort (protected route)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [result] = await db.promisePool.query(
      'DELETE FROM resorts WHERE resort_id = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resort not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Resort deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting resort:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete resort'
    });
  }
});

module.exports = router;