require('dotenv').config();
const express = require('express');
const db = require('./dbConnection');
const nm = require('nodemailer');
const router = express.Router();
const bodyParser = require('body-parser');
const moment = require('moment');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


router.get('/sendBirthdayMail', (req, res) => {
    const sql = 'SELECT emailId, dob FROM signup_table';
    
    db.query(sql, (err, result) => {
      if (err) {
        return res.status(500).send({ status: false, message: err.message });
      }
      const today = moment().format('MM-DD');
      const birthdayRecords = result.filter(record => {
        if (record.dob) {
          const dobFormatted = moment(record.dob).format('MM-DD');
          return dobFormatted === today;
        }
        return false;
      });

      if (birthdayRecords.length > 0) {
        sendBirthdayMails(birthdayRecords);
        return res.send({
          status: true, 
          records: birthdayRecords,
          message: 'Birthday emails sent successfully'
        });
      } else {
        return res.send({
          status: true, 
          message: 'No birthdays today'
        });
      }
    });
});

function sendBirthdayMails(records) {
    const transporter = nm.createTransport({
      host: "smtpout.secureserver.net",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_PASSWORD,
      },
    });
  
    records.forEach(record => {
      const options = {
        from: 'hello@avchamps.com',
        to: record.emailId,
        subject: 'Happy Birthday!',
        html: `<h1>Happy Birthday!</h1><p>We wish you all the best on your special day!</p>`
      };
  
      transporter.sendMail(options, function (error, info) {
        if (error) {
          console.log(`Error sending email to ${record.emailId}: `, error);
        } else {
          console.log(`Birthday email sent to ${record.emailId}`);
        }
      });
    });
  }
  
  module.exports = router;
