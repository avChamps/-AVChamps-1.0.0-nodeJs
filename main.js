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
const mailService = require('./mail-services.js');
const userPoints = require('./userPoints.js');
const productReview = require('./product_review.js');
const quiz = require('./quiz.js');
const stateCity = require('./state-city.js')
// console.log = () => {};

const app = express();
const port = 3000;
app.use(express.json());
app.use(cors());

// const allowedDomains = ['https://avchamps.com', 'https://avchamps.com/nodejs', 'https://accounts.google.com','https://www.linkedin.com'];

// app.use((req, res, next) => {
//   const referer = req.headers.referer || req.headers.origin;
//   console.log("Referer:", referer); // Log the referer for debugging
//   if (referer && allowedDomains.some(domain => referer.startsWith(domain))) {
//     next();
//   } else {
//     res.status(403).json({ error: 'Forbidden: Access denied' });
//   }
// });


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
app.use('/',mailService);
app.use('/',userPoints);
app.use('/', productReview);
app.use('/',quiz);
app.use('/',stateCity);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

