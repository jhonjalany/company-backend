require('dotenv').config();
const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cookieParser());

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI; // e.g., https://your-render-url.onrender.com/auth/callback 
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL; // Your n8n webhook URL

// Step 1: Handle Google OAuth callback
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) return res.status(400).send('No code provided.');

  try {
    // Step 2: Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token ',
      querystring.stringify({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Step 3: Get user's email
    const userInfoResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo ',
      {
        headers: { Authorization: `Bearer ${access_token}` }
      }
    );

    const email = userInfoResponse.data.email;

    // Step 4: Send data to n8n
    const n8nPayload = {
      access_token,
      refresh_token,
      email
    };

    console.log("Sending data to n8n...");
    const n8nResponse = await axios.post(N8N_WEBHOOK_URL, n8nPayload);

    // Step 5: Wait for n8n success
    if (n8nResponse.data && n8nResponse.data.success === true) {
      res.redirect('https://n8n-app-gn6h.onrender.com/'); // Redirect after success
    } else {
      res.status(500).send('n8n did not respond successfully.');
    }

  } catch (error) {
    console.error('Error during OAuth:', error.message);
    res.status(500).send('Authentication failed.');
  }
});

// Serve static files
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});