require('dotenv').config();
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const axios = require('axios');

const app = express();

// Session setup
app.use(session({ secret: 'secret-key', resave: false, saveUninitialized: true }));

// Passport setup
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  (token, refreshToken, profile, done) => {
    return done(null, { profile, refreshToken });
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email', 'openid', 'https://www.googleapis.com/auth/userinfo.profile '] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  async (req, res) => {
    const { refreshToken } = req.user;
    const email = req.user.profile.emails[0].value;

    try {
      // Send data to n8n webhook
      const response = await axios.post(
        'https://n8n-app-gn6h.onrender.com/webhook-test/userdata ',
        {
          email,
          refreshToken
        }
      );

      if (response.data.success === true) {
        return res.redirect('https://n8n-app-gn6h.onrender.com/workflow/kLnZzGQKAqVqDTL9 ');
      } else {
        res.status(500).send('Webhook failed');
      }

    } catch (error) {
      console.error('Error sending to webhook:', error.message);
      res.status(500).send('Internal Server Error');
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});
