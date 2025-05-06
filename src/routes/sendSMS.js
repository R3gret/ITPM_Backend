// pages/api/sendSMS.js
import axios from 'axios';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    // Your SMS API credentials (consider using environment variables)
    const username = 'ZJ62BX';
    const password = 'ua9sk3r7vjjgaw';
    
    // Extract data from the request
    const { message, phoneNumbers } = req.body;

    // Make request to the SMS API
    const response = await axios.post(
      'https://api.sms-gate.app/3rdparty/v1/message',
      {
        message,
        phoneNumbers
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
        }
      }
    );

    // Forward the response from SMS API to the client
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error);
    
    // Handle axios errors
    if (error.response) {
      // Forward the error response from the SMS API
      res.status(error.response.status).json(error.response.data);
    } else {
      // Generic error response
      res.status(500).json({ 
        message: 'Internal server error',
        details: error.message 
      });
    }
  }
}