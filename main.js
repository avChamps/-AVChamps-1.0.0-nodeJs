// index.js
const express = require('express');
const cors = require('cors');
const db = require('./dbConnection');
const signUp = require('./signUp');
const feed = require('./feed');
const getUserData = require('./get_Data');
const eKart = require('./eKart');
const feedBack = require('./feedBack.js');
const download = require('./download_reports')
const bussinessCard = require('./bussiness-card.js')
const contactUs = require('./contactUs.js');
const profileInfo = require('./profile_Info.js');
const community = require('./community.js');
const socialSignUp = require('./socialLogin.js');
const text_generator = require('./text_generator.js');
const jobPortal = require('./jobs_portal.js');
const mailService = require('./mail-services.js')

const app = express();
const port = 3000;
app.use(express.json());
app.use(cors());

const allowedDomain = 'https://avchamps.com';

app.use((req, res, next) => {
  const referer = req.headers.referer || req.headers.origin;
  if (referer && referer.startsWith(allowedDomain)) {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Access denied' });
  }
});

app.use('/', signUp);
app.use('/', feed);
app.use('/', getUserData);
app.use('/', eKart);
app.use('/', feedBack);
app.use('/', download);
app.use('/', bussinessCard);
app.use('/', contactUs);
app.use('/', profileInfo);
app.use('/', community);
app.use('/', socialSignUp);
app.use('/', text_generator);
app.use('/',jobPortal);
app.use('/',mailService)

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

