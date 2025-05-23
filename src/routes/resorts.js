const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { body, validationResult } = require('express-validator');



// Get user density for resorts
// Add this near your other routes
router.get('/user-density', async (req, res) => {
    let connection;
    try {
      connection = await db.promisePool.getConnection();
      
      // Query to count users near each resort
      const [results] = await connection.query(`
        SELECT 
          r.resort_id,
          COUNT(ul.user_id) as user_count
        FROM resorts r
        LEFT JOIN user_distance ul ON 
          ST_Distance_Sphere(
            POINT(r.longitude, r.lat),
            POINT(ul.longitude, ul.latitude)
          ) <= 150  -- 150 meter radius
        GROUP BY r.resort_id
      `);
  
      return res.json({
        success: true,
        data: results
      });
  
    } catch (error) {
      console.error('Error fetching user density:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching user density data'
      });
    } finally {
      if (connection) connection.release();
    }
  });

// Get all resorts
router.get('/', async (req, res) => {
  try {
    const [resorts] = await db.promisePool.query('SELECT * FROM resorts');
    res.json({
      success: true,
      data: resorts
    });
  } catch (error) {
    console.error('Error fetching resorts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get a single resort by ID
router.get('/:id', async (req, res) => {
  try {
    const [resort] = await db.promisePool.query('SELECT * FROM resorts WHERE resort_id = ?', [req.params.id]);
    
    if (resort.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resort not found'
      });
    }
    
    res.json({
      success: true,
      data: resort[0]
    });
  } catch (error) {
    console.error('Error fetching resort:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create a new resort
router.post('/', 
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('lat').isDecimal().withMessage('Latitude must be a decimal'),
    body('longitude').isDecimal().withMessage('Longitude must be a decimal'),
    body('description').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    try {
      const { name, lat, longitude, address, description, contact_number, email, website } = req.body;
      
      const [result] = await db.promisePool.query(
        'INSERT INTO resorts (name, lat, longitude, address, description, contact_number, email, website) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, lat, longitude, address, description, contact_number, email, website]
      );
      
      res.status(201).json({
        success: true,
        resort_id: result.insertId
      });
    } catch (error) {
      console.error('Error creating resort:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Update a resort
router.put('/:id', 
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('lat').optional().isDecimal().withMessage('Latitude must be a decimal'),
    body('longitude').optional().isDecimal().withMessage('Longitude must be a decimal')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    try {
      const { name, lat, longitude, address, description, contact_number, email, website } = req.body;
      
      const [result] = await db.promisePool.query(
        'UPDATE resorts SET name = ?, lat = ?, longitude = ?, address = ?, description = ?, contact_number = ?, email = ?, website = ? WHERE resort_id = ?',
        [name, lat, longitude, address, description, contact_number, email, website, req.params.id]
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
        message: 'Internal server error'
      });
    }
  }
);

// Delete a resort
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.promisePool.query('DELETE FROM resorts WHERE resort_id = ?', [req.params.id]);
    
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
      message: 'Internal server error'
    });
  }
});

// Track user location
router.post('/user-location', 
    [
      body('user_id').isInt().withMessage('User ID must be an integer'),
      body('latitude').isDecimal().withMessage('Latitude must be decimal'),
      body('longitude').isDecimal().withMessage('Longitude must be decimal')
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      try {
        const { user_id, latitude, longitude } = req.body;
        
        await db.promisePool.query(
          'INSERT INTO user_distance (user_id, latitude, longitude) VALUES (?, ?, ?)',
          [user_id, latitude, longitude]
        );
        
        res.json({ success: true });
      } catch (error) {
        console.error('Error saving user location:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    }
  );
  


module.exports = router;