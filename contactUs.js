// routes.js
const express = require('express');
const db = require('./dbConnection');
const nm = require('nodemailer');
require('dotenv').config();

const router = express.Router();

function sendMail(personName, emailId, mobileNumber, subject, message) {
   console.log(personName, emailId, mobileNumber, subject, message);
   const transporter = nm.createTransport({
    host: "smtpout.secureserver.net",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USERNAME,
      pass: process.env.GMAIL_PASSWORD,
    },
  });
   
    // Check for undefined values and provide default values if they are undefined
    const name = personName || 'Unknown';
    const email = emailId || 'Unknown';
    const mobile = mobileNumber || 'Unknown';
    const sub = subject || 'No subject';
    const msg = message || 'No message';

    const options = {
        from: 'hello@avchamps.com',
        to: 'avchamps1@gmail.com',
        subject: `Contact Us Notification`,
        html: `<h1>Hello, Somebody tried to contact Us</h1>
            <p>Person Name: ${name}</p>
            <p>Email: ${email}</p>
            <p>Mobile Number: ${mobile}</p>
            <p>Subject: ${sub}</p>
            <p>Message: ${msg}</p>
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


function newsLettersendMail( emailId, requestedDate) {
    const transporter = nm.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.GMAIL_USERNAME,
            pass: process.env.GMAIL_PASSWORD 
        }
    });
   
    const email = emailId || 'Unknown';

    const options = {
        from: 'AV-Project',
        to: 'avchamps1@gmail.com',
        subject: `News Letter Subscription`,
        html: `<h1>Hello, Somebody tried to contact Us</h1>
            <p>Email: ${email}</p>
            <p>Requested Date: ${requestedDate}</p>
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


router.post('/contactUs', (req, res) => {
    const { personName, emailId, mobileNumber, subject, message } = req.body;
    const createdDate = new Date();
    sendMail(personName, emailId, mobileNumber, subject, message);
    const data = { personName, emailId, mobileNumber, subject, message, createdDate };
    const sql = 'INSERT INTO contactUs SET ?';

    db.query(sql, data, (err, result) => {
        if (err) {
            console.log(err)
            return res.send({ status: false, message: 'Failed to Submit' });
        } else {
            return res.send({ status: true, message: 'Your Request Submitted Successfully.' });
        }
    });
});


router.post('/newsLetter', (req, res) => {
    const {  emailId } = req.body;
    const requestedDate = new Date();
    newsLettersendMail( emailId, requestedDate);
    const data = { emailId,requestedDate };
    const sql = 'INSERT INTO news_Letter SET ?';
    db.query(sql, data, (err, result) => {
        if (err) {
            console.log(err)
            return res.send({ status: false, message: 'Failed to Submit' });
        } else {
            return res.send({ status: true, message: 'News Letter Subscription Successfull' });
        }
    });
});

module.exports = router;
