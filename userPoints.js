// routes.js
const express = require('express')
const bodyParser = require('body-parser');
const db = require('./dbConnection');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const router = express.Router()

router.post('/insertPoints', (req, res) => {
  const { emailId, userName, points } = req.body;
  console.log('testing', req.body);
  const insertedDate = new Date();
  const sql = `
      INSERT INTO user_points (emailId, userName, points, insertedDate)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        points = points + VALUES(points),
        userName = VALUES(userName);
    `;

  const data = [emailId, userName, points, insertedDate];
  db.query(sql, data, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ status: false, message: err.message });
    } else {
      return res.send({ status: true, message: 'Points inserted/updated successfully' });
    }
  });
});

router.post('/deletePoints', (req, res) => {
  const { emailId, userName, points } = req.body;
  console.log(req.body);
  console.log('testing', req.body);
  const insertedDate = new Date();

  const sql = `
      UPDATE user_points
      SET points = points - ?,
          userName = ?,
          insertedDate = ?
      WHERE emailId = ?;
    `;

  const data = [points, userName, insertedDate, emailId];
  db.query(sql, data, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ status: false, message: err.message });
    } else {
      return res.send({ status: true, message: 'Points deleted successfully' });
    }
  });
});


router.post('/getPoints', (req, res) => {
  const { emailId } = req.body;
  if (!emailId) {
    return res.status(400).send({ status: false, message: 'emailId is required' });
  }
  const sql = 'SELECT * FROM user_points WHERE emailId = ?';
  db.query(sql, [emailId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ status: false, message: err.message });
    }

    if (result.length === 0) {
      data = [{ "points": 0 }]
      return res.send({ status: false, message: 'No points found for the provided emailId', data: data });
    }

    return res.send({ status: true, message: 'Points retrieved successfully', data: result });
  });
});

module.exports = router;
