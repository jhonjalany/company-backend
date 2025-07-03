const express = require('express');
const axios = require('axios');
const qs = require('qs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // Step 1: Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token ',
      qs.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'http://127.0.0.1:5500/auth/google/callback',
        grant_type: 'authorization_code'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Step 2: Get user info
    const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo ', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const email = userInfo.data.email;

    // Step 3: Trigger n8n webhook
    const n8nResponse = await axios.post(process.env.N8N_WEBHOOK_URL, {
      email,
      refresh_token
    });

    if (n8nResponse.data.success === true) {
      return res.redirect('https://converterv3.pages.dev/ ');
    } else {
      return res.status(500).send('n8n workflow failed');
    }

  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Authentication failed');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
