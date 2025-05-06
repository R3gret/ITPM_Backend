// src/routes/sms.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/sendSMS', async (req, res) => {
  try {
    const username = 'ZJ62BX';
    const password = 'ua9sk3r7vjjgaw';
    const { message, phoneNumbers } = req.body;

    const response = await axios.post(
      'https://api.sms-gate.app/3rdparty/v1/message',
      { message, phoneNumbers },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
        }
      }
    );

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Internal server error',
        details: error.message 
      });
    }
  }
});

module.exports = router;