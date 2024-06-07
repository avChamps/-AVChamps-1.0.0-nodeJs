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
const app = express();
const port = 3000;
app.use(express.json());
app.use(cors());

app.use('/', signUp);
app.use('/',feed);
app.use('/',getUserData);
app.use('/',eKart);
app.use('/',feedBack);
app.use('/',download);
app.use('/',bussinessCard);
app.use('/',contactUs);
app.use('/',profileInfo);
app.use('/',community);
app.use('/',socialSignUp);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
