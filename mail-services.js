require('dotenv').config();
const express = require('express');
const db = require('./dbConnection');
const nm = require('nodemailer');
const router = express.Router();
const bodyParser = require('body-parser');
const moment = require('moment');
const cron = require('node-cron');
const multer = require('multer');

// Multer Configuration for Handling File Uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });




const app = express();
process.env.TZ = 'Asia/Kolkata';
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const BirthdayMail = ()  => {
     const sql = 'SELECT emailId, dob FROM signup_table';
    
    db.query(sql, (err, result) => {
      if (err) {
        console.log('Error while sending Birthday wishes',err);
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
      } else {
        console.log('Failed to send the birthday wishes');
      }
    });
}

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
        html: `<h1 style="font-family: cursive; color: #008b8b;">Happy Birthday!</h1>
       <p style="font-family: cursive;font-size: 20px;">We wish you all the best on your special day!</p>
       <p style="font-family: cursive;font-size: 20px;">Count your life by smiles, not tears. Count your age by friends, not years. Wishing you a year full of joy and unforgettable moments!</p>
       <img src="https://images.wondershare.com/filmora/article-images/2021/happy-birthday-animated-gif-1.jpg" alt="Happy Birthday Image"/>
       <p>Best Regards,<br>AV CHAMPS<br>
            <a href="https://avchamps.com/">https://avchamps.com/</a></p>
             <p>
           <a href="https://www.facebook.com/people/AV-Champs/pfbid0UNunL8ku31fRE41hod6ivS5WVcDugsiFoDYU6JMtsZtGNfvSKhSTPNfix4rX4xUkl/" target="_blank" style="text-decoration: none;">
           <img src="https://avchamps.com/assets/images/socialmediacons/facebook.png" alt="Facebook" width="30" height="30" style="margin-right: 10px;" />
           </a>
           <a href="https://x.com/rgbaudiovideo" target="_blank" style="text-decoration: none;">
            <img src="https://avchamps.com/assets/images/socialmediacons/twitter.png" width="30" height="30" style="margin-right: 10px;" />
          </a>
           <a href="https://www.instagram.com/av.champs/" target="_blank" style="text-decoration: none;" >
          <img src="https://avchamps.com/assets/images/socialmediacons/instagram.png" alt="Instagram" width="30" height="30" style="margin-right: 10px;" />
          </a> 
          <a href="https://www.linkedin.com/in/avchamps/" target="_blank" style="text-decoration: none;">
          <img src="https://avchamps.com/assets/images/socialmediacons/linkedin.png" alt="LinkedIn" width="30" height="30" style="margin-right: 10px;" />
          </a>   
          <a href="https://www.youtube.com/@AVChamps/" target="_blank" style="text-decoration: none;">
          <img src="https://avchamps.com/assets/images/socialmediacons/youtube.png" alt="youtube" width="30" height="30" style="margin-right: 10px;" />
          </a>   
          </p>`
      }
  
      transporter.sendMail(options, function (error, info) {
        if (error) {
          console.log(`Error sending email to ${record.emailId}: `, error);
        } else {
          console.log(`Birthday email sent to ${record.emailId}`);
        }
      });
    });
  }

  const eventsMails = () => {
    const today = moment().format('YYYY-MM-DD');
    console.log('Today\'s date:', today);
    
    const sql = 'SELECT event_name, event_date FROM sample_events';
    const singUpSQL = 'SELECT emailId FROM signup_table';
    
    db.query(sql,singUpSQL, (err, result) => {
      if (err) {
        console.log('Error while sending event notifications', err);
      } else {
        if (result.length > 0) {
          let eventsToday = result.filter(event => event.event_date === today);
          if (eventsToday.length > 0) {
            console.log(eventsToday);
            db.query(singUpSQL, (err, signUpResult) => {
              if (err) {
                console.log('Error while fetching sign-up data', err);
              } else {
                if (signUpResult.length > 0) {
                  console.log("Sign-up Data: ", signUpResult);
                  sendEventMail(eventsToday, signUpResult);
                } else {
                  console.log('No sign-ups found.');
                }
              }
            });
          }
         else {
            console.log('No events today.');
          }
        } else {
          console.log('No events in the database.');
        }
      }
    });
  };
  
  

  function sendEventMail(todayEvents,signUpResult) {
    const transporter = nm.createTransport({
      host: "smtpout.secureserver.net",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_PASSWORD,
      },
    });
  

  console.log("Today's Events:", todayEvents);
  todayEvents.forEach(event => console.log(event.event_name));

  
  const eventListHtml = todayEvents
  .map(event => `<li>${event.event_name}</li>`)
  .join('');

  signUpResult.forEach(record => {
      const options = {
        from: 'hello@avchamps.com',
        to: record.emailId,
        subject: 'Today Events',
        html: `
        <p>Hello AVCHAMP,</p>
        <p style="margin-top:6px">Below is the list of today's ongoing AV events. Please feel free to attend any event that is relevant to you</p>
        <ul style="margin-top: 6px">${eventListHtml} </ul>
        <p>visit : <a href = "https://avchamps.com">https://avchamps.com</a> -> SignIn -> Profile -> Tools -> Calendar</p>
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
              <a href="https://www.youtube.com/@AVChamps/" target="_blank" style="text-decoration: none;">
          <img src="https://avchamps.com/assets/images/socialmediacons/youtube.png" alt="youtube" width="30" height="30" style="margin-right: 10px;" />
          </a>  
          </p>`
      }
  
      transporter.sendMail(options, function (error, info) {
        if (error) {
          console.log(`Error sending email to ${record.emailId}: `, error);
        } else {
          console.log(`Email sent to ${record.emailId}`);
        }
      });
    });
  }



  router.post('/sendDashboardMail', upload.array('attachments[]'), (req, res) => {
    const { subject, message } = req.body;
    console.log('Received Data:', req.body);
    console.log('Attachments:', req.files);  // Debugging

    if (!subject || !message) {
        return res.status(400).json({ error: 'Subject and message are required' });
    }

    const singUpSQL = 'SELECT emailId FROM signup_table';

    db.query(singUpSQL, (err, result) => {
        if (err) {
            console.log('Error fetching email recipients:', err);
            return res.status(500).json({ error: 'Failed to fetch recipients' });
        }

        if (result.length === 0) {
            return res.status(400).json({ message: 'No recipients found' });
        }

        const recipients = result.map(record => record.emailId);
        sendDashboardMail(["disendra889@gmail.com", "harishnelluru@gmail.com"], subject, message, req.files);
        res.json({ message: 'Emails are being sent.' });
    });
});


function sendDashboardMail(recipients, subject, message, attachments) {
  const transporter = nm.createTransport({
      host: "smtpout.secureserver.net",
      port: 465,
      secure: true,
      auth: {
          user: process.env.GMAIL_USERNAME,
          pass: process.env.GMAIL_PASSWORD,
      },
  });

  recipients.forEach(email => {
      let mailOptions = {
          from: 'hello@avchamps.com',
          to: email,
          subject: subject,
          html: `<p>Hello AV CHAMP,</p><p>${message}</p>
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
            <a href="https://www.youtube.com/@AVChamps/" target="_blank" style="text-decoration: none;">
          <img src="https://avchamps.com/assets/images/socialmediacons/youtube.png" alt="youtube" width="30" height="30" style="margin-right: 10px;" />
          </a>    
          </p>`,
          attachments: attachments ? attachments.map(file => ({
              filename: file.originalname,
              content: file.buffer
          })) : []
      };

      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              console.log(`Error sending email to ${email}: `, error);
          } else {
              console.log(`Email sent to ${email}`);
          }
      });
  });
}

  cron.schedule('00 09 * * *', () => {
    eventsMails();
  })

  

cron.schedule('00 00 * * *', () => {
  BirthdayMail();
});
  
  module.exports = router;

