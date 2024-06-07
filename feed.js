const express = require('express');
const bodyParser = require('body-parser');
const db = require('./dbConnection');
const cron = require('node-cron');
const nm = require('nodemailer');
// const moment = require('moment');
const axios = require('axios');
const moment = require('moment-timezone');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const router = express.Router();

router.post('/insertFeed', (req, res) => {
  const { sender, title, description, link, dltFeedDate } = req.body;
  const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
  const data = { sender, title, description, createdDate, link, dltFeedDate };

  const sql = 'INSERT INTO Community_Announcements SET ?';

  db.query(sql, data, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ status: false, message: err.message });
    } else {
      return res.send({ status: true, message: 'Feed Inserted Successfully' });
    }
  });
});

router.get('/getFeedData', (req, res) => {
  const sql = 'SELECT * FROM Community_Announcements ORDER BY createdDate DESC;';

  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).send({ status: false, message: err.message });
    } else {
      return res.send({
        status: true,
        records: result,
        message: 'Details Fetched Successfully'
      });
    }
  });
});

router.get('/getEvents', (req, res) => {
  const sql = 'SELECT * FROM events';

  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).send({ status: false, message: err.message });
    } else {
      return res.send({
        status: true,
        records: result,
        message: 'Details Fetched Successfully'
      });
    }
  });
}); 

router.post('/insertEvent', (req, res) => {
  const { event_name, event_date, eventEndDate, website_Url, dltFeedDate } = req.body;
  console.log(req.body);
  // Parse the dates
  const startDate = moment(event_date, 'YYYY-MM-DD');
  const endDate = moment(eventEndDate, 'YYYY-MM-DD');

  // Check if dates are valid
  if (!startDate.isValid() || !endDate.isValid()) {
    return res.status(400).send({ status: false, message: 'Invalid date format. Use YYYY-MM-DD.' });
  }
  // Create an array to hold all the insert promises
  const insertPromises = [];
  // Loop through each date in the range
  for (let date = startDate; date.isSameOrBefore(endDate); date.add(1, 'days')) {
    const data = {
      event_name,
      event_date: date.format('YYYY-MM-DD'), // Format date to match SQL date format
      website_Url,
      dltFeedDate,
    };
    // Create a promise for each insert query
    const insertPromise = new Promise((resolve, reject) => {
      const sql = 'INSERT INTO events SET ?';
      db.query(sql, data, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
    // Push the promise to the array
    insertPromises.push(insertPromise);
  }
  // Execute all insert queries
  Promise.all(insertPromises)
    .then(() => {
      res.send({ status: true, message: 'Event Added Successfully' });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send({ status: false, message: err.message });
    });
});

router.get('/getTradeShow', (req, res) => {
  const sql = 'SELECT * FROM tradeShow';

  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).send({ status: false, message: err.message });
    } else {
      return res.send({
        status: true,
        records: result,
        message: 'Details Fetched Successfully'
      });
    }
  });
}); 


router.post('/insertTradeShow', (req, res) => {
  const { title, website_Url, dltFeedDate } = req.body;
  const createdDate = new Date();
  const data = { title,website_Url, dltFeedDate,createdDate };

  const sql = 'INSERT INTO tradeShow SET ?';

  db.query(sql, data, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ status: false, message: err.message });
    } else {
      return res.send({ status: true, message: 'TradeShow Inserted Successfully' });
    }
  });
});

router.get('/getMacData/:sysAddress', async (req, res) => {
  try {
    const response = await axios.get(`https://macvendorlookup.com/api/v2/${req.params.sysAddress}`);
    return res.send({ records: response.data, message: 'Mac Details Fetched Successfully'});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching Mac details.' });
  }
});

router.post('/postEvent', (req) => {
  const { eventName, eventUrl, startDate, endDate } = req.body;
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const startDateOnly = startDateObj.toISOString().split('T')[0];
  const endDateOnly = endDateObj.toISOString().split('T')[0];
  sendMail(eventName, eventUrl, startDateOnly, endDateOnly);
})

function sendMail(eventName, eventUrl, startDate, endDate) {
  console.log(eventName, eventUrl, startDate, endDate);
  const transporter = nm.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_PASSWORD 
    }
  });
  const options = {
      from: 'AVChamps.com',
      to: 'Avchamps1@gmail.com',
      subject: "Post Add Notification",
      html: `<h1>Hello, Somebody tried to Post Event</h1>
          <p>Event Name: ${eventName}</p>
          <p>Event Url: ${eventUrl}</p>
          <p>StartDate: ${startDate}</p>
          <p>EndDate: ${endDate}</p>`
  };

  transporter.sendMail(options, function (error, info) {
      if (error) {
          console.log(error);
      } else {
          console.log("Email sent");
      }
  });
}

const deleteExpiredRecords = () => {
  const currentDate = new Date().toISOString().slice(0, 10); // Get current date in YYYY-MM-DD format
  const deleteQueries = [
    `DELETE FROM Community_Announcements WHERE dltFeedDate = '${currentDate}'`,
    `DELETE FROM events WHERE dltFeedDate = '${currentDate}'`,
    `DELETE FROM tradeShow WHERE dltFeedDate = '${currentDate}'`
  ];
  deleteQueries.forEach((deleteSql) => {
    db.query(deleteSql, (err, result) => {
      if (err) {
        console.error('Error deleting expired records:', err);
      } else {
        console.log('Expired records deleted successfully from table:', deleteSql.split(' ')[2]);
      }
    });
  });
};

// Schedule the task to run every day at midnight (00:00)
cron.schedule('58 11 * * *', () => {
  deleteExpiredRecords();
});

module.exports = router;
