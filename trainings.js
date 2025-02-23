// routes.js
const express = require('express');
const db = require('./dbConnection');
const nm = require('nodemailer');
require('dotenv').config();

const router = express.Router();

function sendMail({ fullName, mobileNumber, location, working, training, createdDate,courseType }) {
    const transporter = nm.createTransport({
        host: 'smtpout.secureserver.net',
        port: 465,
        secure: true,
        auth: {
            user: process.env.GMAIL_USERNAME,
            pass: process.env.GMAIL_PASSWORD
        }
    });

    const mailOptions = {
        from: 'hello@avchamps.com',
        to: process.env.RECIPIENT_EMAIL || 'avchamps1@gmail.com',
        subject: 'Contact Us Notification',
        html: `
            <h1>Hello, Somebody tried to contact us</h1>
            <p><strong>Full Name:</strong> ${fullName}</p>
            <p><strong>Mobile Number:</strong> ${mobileNumber}</p>
            <p><strong>Location:</strong> ${location}</p>
            <p><strong>Working:</strong> ${working}</p>
            <p><strong>Training:</strong> ${training}</p>
             <p><strong>Course Name:</strong> ${courseType}</p>
            <p><strong>Created Date:</strong> ${createdDate}</p>
        `
    };

    return transporter
        .sendMail(mailOptions)
        .then((info) => {
            console.log('Email sent successfully:', info.response);
        })
        .catch((error) => {
            console.error('Error sending email:', error);
        });
}

router.post('/insertTraining', (req, res) => {
    console.log(req.body);

    const { fullName, mobileNumber, location, working, training,courseType } = req.body;
    const createdDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (!fullName || !mobileNumber || !location || !working || !training || !courseType) {
        return res.send({ status: false, message: 'All fields are required.' });
    }

    const sql = `INSERT INTO trainings (fullName, mobileNumber, location, working, training, createdDate, courseType) 
                 VALUES (?, ?, ?, ?, ?, ?,?)`;

    const values = [fullName, mobileNumber, location, working, training, createdDate,courseType];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.send({ status: false, message: 'Failed to Submit' });
        } else {
            // Call the sendMail function with correct object structure
            sendMail({
                fullName,
                mobileNumber,
                location,
                working,
                training,
                createdDate,
                courseType
            });
            return res.send({ status: true, message: 'Thank you for registering for the course! Our team will be in touch with you shortly to provide further details. We’re excited to have you on board!.' });
        }
    });
});


module.exports = router;
