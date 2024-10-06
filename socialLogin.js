require('dotenv').config();
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('./dbConnection');
const fetch = require('node-fetch2');
const crypto = require('crypto');
const cors = require('cors');
const nm = require('nodemailer');

router.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true }));
const secretKey = crypto.randomBytes(32).toString('hex');
router.use(passport.initialize());
router.use(passport.session());
router.use(cors());

let jwtToken;
let destination;
let userEmailId;
// let url = 'http://localhost:4200/redirected-page';
// let googleRedirectUrl = 'http://localhost:3000/auth/google/callback';
let url = 'https://avchamps.com/redirected-page';
let googleRedirectUrl = 'https://avchamps.com/nodejs/auth/google/callback';

let linkedinRedirectUrl = 'https://avchamps.com/nodejs/auth/linkedin/callback';
let facebookRedirectUrl = 'https://avchamps.com/auth/facebook/callback';
let microsoftRedirectUrl = 'https://avchamps.com/nodejs/auth/microsoft/callback';

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

router.get('/auth/google', (req, res) => {
  destination = req.query.destination || 'default';
  console.log(destination);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = googleRedirectUrl;
  const scope = 'email profile';
  const responseType = 'code';
  const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=${responseType}&prompt=select_account`;
  res.redirect(googleOAuthUrl);
});

router.get('/auth/google/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        redirect_uri: googleRedirectUrl,
        grant_type: 'authorization_code'
      })
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(`Failed to exchange code for token: ${tokenData.error}`);
    }
    const accessToken = tokenData.access_token;
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!userInfoResponse.ok) {
      throw new Error(`Failed to fetch user info: ${userData.error}`);
    }
    const userData = await userInfoResponse.json();
    jwtToken = jwt.sign(userData, secretKey);
    console.log(jwtToken);
    insertUserData(userData, jwtToken);
    console.log(userData);
    res.redirect(`${url}/${destination}`);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send('An error occurred during Google OAuth login.');
  }
});

router.get('/auth/linkedin', (req, res) => {
  destination = req.query.destination || 'default';
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = linkedinRedirectUrl;
  const scopes = 'openid email profile';
  const state = 'random';

  const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`;
  res.redirect(linkedInAuthUrl);
});

router.get('/auth/linkedin/callback', (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = linkedinRedirectUrl;
  const code = req.query.code;

  const accessTokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
  const accessTokenParams = {
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret
  };

  fetch(accessTokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(accessTokenParams)
  })
  .then(response => response.json())
  .then(data => {
    const id_token = data.id_token;
    const decodedToken = jwt.decode(id_token);
    console.log("user Data ", decodedToken);
    insertUserData(decodedToken);
    jwtToken = jwt.sign(decodedToken, secretKey);
    console.log(jwtToken);
    res.redirect(`${url}/${destination}`);
  })
  .catch(error => {
    console.error('Error exchanging authorization code for access token:', error);
    res.status(500).send('Error exchanging authorization code for access token');
  });
});


router.get('/auth/microsoft', (req, res) => {
  destination = req.query.destination || 'default';
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = microsoftRedirectUrl;
  const scope = 'openid email profile User.Read User.ReadBasic.All';
  const responseType = 'code';
  const microsoftAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=${responseType}`;
  res.redirect(microsoftAuthUrl);
});

router.get('/auth/microsoft/callback', async (req, res) => {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = microsoftRedirectUrl;
  const code = req.query.code;

  if (!clientSecret) {
    console.error('Microsoft client secret is missing or invalid.');
    return res.status(500).send('Microsoft client secret is missing or invalid.');
  }

  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  const tokenParams = {
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  };

  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(tokenParams)
    });
    const data = await tokenResponse.json();
    console.log("Token Response:", data);

    if (!data.id_token) {
      throw new Error('id_token not provided by Microsoft');
    }

    const idToken = data.id_token;
    const decodedToken = jwt.decode(idToken);
    console.log("Decoded Token:", decodedToken);

    if (!decodedToken) {
      throw new Error('Invalid id_token provided by Microsoft');
    }

    // Fetch user profile using Microsoft Graph API
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${data.access_token}`
      }
    });
    const userInfo = await userInfoResponse.json();
    console.log("User Info:", userInfo);

    if (!userInfo || !userInfo.mail) {
      throw new Error('Email not provided by Microsoft');
    }

    // Fetch user profile photo
    let photoUrl = null;
    try {
      const photoResponse = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      });
      if (photoResponse.ok) {
        const photoBuffer = await photoResponse.arrayBuffer();
        photoUrl = `data:${photoResponse.headers.get('Content-Type')};base64,` + Buffer.from(photoBuffer).toString('base64');
      }
    } catch (error) {
      console.error('Error fetching profile photo:', error);
    }

    const userData = {
      ...decodedToken,
      email: decodedToken.preferred_username,
      given_name: decodedToken.preferred_username.split('@')[0] || '',
      name: decodedToken.preferred_username.split('@')[0] || '',
      photo: photoUrl
    };

    console.log('userData', userData);

    insertUserData(userData);
    jwtToken = jwt.sign(userData, secretKey);
    res.redirect(`${url}/${destination}`);
  } catch (error) {
    console.error('Error exchanging authorization code for access token:', error);
    res.status(500).send('Error exchanging authorization code for access token');
  }
});

router.get('/auth/facebook', (req, res) => {
  destination = req.query.destination || 'default';
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const redirectUri = facebookRedirectUrl;
  const scopes = 'email public_profile';
  const state = crypto.randomBytes(16).toString('hex'); // Generate a unique state

  const facebookAuthUrl = `https://www.facebook.com/v12.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`;
  res.redirect(facebookAuthUrl);
});

router.get('/auth/facebook/callback', (req, res) => {
  // const destination = req.query.destination || 'default';
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  const redirectUri = facebookRedirectUrl;
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('No code provided');
  }

  const accessTokenUrl = `https://graph.facebook.com/v12.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`;

  fetch(accessTokenUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error fetching access token: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      const accessToken = data.access_token;
      if (!accessToken) {
        throw new Error('Access token not returned');
      }
      const userProfileUrl = `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,first_name,last_name,email,picture`;
      return fetch(userProfileUrl);
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error fetching user profile: ${response.statusText}`);
      }
      return response.json();
    })
    .then(profile => {
      if (!profile.email) {
        throw new Error('Email not provided by Facebook');
      }
      const modifiedProfile = {
        name: profile.name,
        given_name: profile.first_name,
        family_name: profile.last_name,
        email: profile.email,
        picture: profile.picture?.data?.url || null
      };
      insertUserData(modifiedProfile); // Insert user data into your database
      const jwtToken = jwt.sign(modifiedProfile, secretKey);
      res.redirect(`${url}/${destination}?token=${jwtToken}`);
    })
    .catch(error => {
      console.error('Error in OAuth flow:', error.message);
      res.status(500).send('Error in OAuth flow');
    });
});

function insertUserData(userData, jwtSessionToken) {
  console.log('New', userData);
  const { email, name, given_name, family_name, picture } = userData;
  userEmailId = email;
  const signupDate = new Date();
  const data = {
    fullName: name,
    firstName: given_name,
    lastName: family_name,
    signupDate,
    imagePath: picture,
    jwtToken: jwtSessionToken
  };

  const checkEmailSql = 'SELECT COUNT(*) AS count FROM signup_table WHERE emailId = ?';
  const selectUserSql = 'SELECT * FROM signup_table WHERE emailId = ?';
  const insertUserSql = `
    INSERT INTO signup_table 
      (emailId, fullName, firstName, lastName, signupDate, imagePath, jwtToken) 
    VALUES 
      (?, ?, ?, ?, ?, ?, ?)
  `;
  const updateUserSql = `
    UPDATE signup_table 
    SET 
      fullName = ?, 
      firstName = ?, 
      lastName = ?, 
      signupDate = ?, 
      imagePath = ?, 
      jwtToken = ?
    WHERE 
      emailId = ?
  `;
  const values = [email, data.fullName, data.firstName, data.lastName, data.signupDate, data.imagePath, data.jwtToken];

  db.query(checkEmailSql, [email], (err, result) => {
    if (err) {
      console.error('Error checking email existence:', err);
      return;
    }
    const emailExists = result[0].count > 0;
    if (emailExists) {
      console.log('User already exists:', email);
      db.query(updateUserSql, [data.fullName, data.firstName, data.lastName, data.signupDate, data.imagePath, data.jwtToken, email], (err, result) => {
        if (err) {
          console.error('Error updating user data:', err);
          return;
        }
        console.log('User data updated successfully:', result);
      });
    } else {
      console.log('New user detected:', email);
      sendMail(email); // Send email for new user
      db.query(insertUserSql, values, (err, result) => {
        if (err) {
          console.error('Error inserting user data:', err);
          return;
        }
        console.log('User data inserted successfully:', result);
      });
    }
  });
}

function sendMail(email) {
  const transporter = nm.createTransport({
      host: "smtpout.secureserver.net",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_PASSWORD 
    }
  });
  const options = {
      from: 'hello@avchamps.com',
      to: email,
      subject: "Welcome to the AV CAMPS Community!",
        html: `
            <p>Dear User,</p>
            <p>Welcome to the AV CHAMPS Community!</p>
            <p>We are thrilled to have you join our vibrant and diverse community. Your registration marks the beginning of an exciting journey where you can connect, learn, and grow with fellow members who share your interests and passions.</p>
            <p>As a new member, here's what you can look forward to:</p>
            <ul>
                <li>Engaging Discussions: Join conversations on topics that matter to you and share your insights with like-minded individuals.</li>
                <li>Exclusive Resources: Access a wealth of articles, tutorials, and guides to enhance your knowledge and skills.</li>
                <li>Events and Webinars: Participate in events and webinars hosted by industry experts and community leaders.</li>
                <li>Support and Collaboration: Get help and advice from experienced members and collaborate on projects.</li>
            </ul>
            <p>To get started, we recommend you:</p>
            <ol>
                <li>Complete Your Profile: Add details about yourself to help others get to know you better.</li>
                <li>Contribute to Community: Browse through the various posts and join discussions that pique your interest.</li>
                <li>Explore AV Calculators: Where predefined calculators are available to simplify complex AV calculations.</li>
            </ol>
            <p>If you have any questions or need assistance, our support team is here to help. Feel free to reach out to us at <a href="mailto:hello@avchamps.com">hello@avchamps.com</a>.</p>
            <p>Once again, welcome to the AV CHAMPS Community. We are excited to have you with us and look forward to your active participation!</p>
            <p>Best Regards,<br>AV CHAMPS<br>
            <a href="https://avchamps.com/">https://avchamps.com/</a></p>
             <p>
           <a href="https://www.facebook.com/people/AV-Champs/pfbid0UNunL8ku31fRE41hod6ivS5WVcDugsiFoDYU6JMtsZtGNfvSKhSTPNfix4rX4xUkl/" target="_blank" style="text-decoration: none;">
           <img src="https://avchamps.com/assets/images/socialmediacons/facebook.png" alt="Facebook" width="30" height="30" style="margin-right: 10px;" />
           </a>
           <a href="https://x.com/rgbaudiovideo" target="_blank" style="text-decoration: none;">
            <img src="https://avchamps.com/assets/images/socialmediacons/twitter.png" width="30" height="30" style="margin-right: 10px;" />
          </a>
           <a href="https://www.instagram.com/av.champs/" target="_blank" style="text-decoration: none;">
          <img src="https://avchamps.com/assets/images/socialmediacons/instagram.png" alt="Instagram" width="30" height="30" style="margin-right: 10px;" />
          </a> 
          <a href="https://www.linkedin.com/in/avchamps/" target="_blank" style="text-decoration: none;">
          <img src="https://avchamps.com/assets/images/socialmediacons/linkedin.png" alt="LinkedIn" width="30" height="30" style="margin-right: 10px;" />
          </a>    
          </p> 
        `
  };
  transporter.sendMail(options, function (error, info) {
      if (error) {
          console.log(error);
      } else {
          console.log("Email sent");
      }
  });
}

router.get('/getSession', (req, res) => {
  emailId = userEmailId;
  console.log("getSession calling");
  const sql = 'SELECT emailId,firstName,jwtToken FROM signup_table WHERE emailId = ?';
  db.query(sql, [userEmailId], (err, results) => {
    if (err) {
      console.error('Error fetching records:', err);
      res.status(500).json({ error: 'Error fetching records' });
    } else {
      console.log('JwtToken', results);
      return res.send({ status: true, session: results, message: 'Details Fetched Successfully' });
    }
  });
});

module.exports = router;
