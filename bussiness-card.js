const express = require('express')
const bodyParser = require('body-parser');
const db = require('./dbConnection');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const router = express.Router()

router.get('/getBussinessCard/:emailId', (req, res) => {
    const emailId = req.params.emailId; // Access emailId from URL paramete  
    const sql = 'SELECT * FROM login_Data WHERE emailId = ?;';  
    console.log(sql);

    db.query(sql, [emailId], (err, results) => {
      if (err) {
        console.error('Error fetching records:', err);
        res.status(500).json({ error: 'Error fetching records' });
      } else {
        console.log('Fetched records successfully');
        return res.send({ status: true, records: results, message: 'Details Fetched Successfully' });
      }
    });
  });
  
  module.exports = router;