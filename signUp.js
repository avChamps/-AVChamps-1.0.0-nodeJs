// routes.js
const express = require('express')
const db = require('./dbConnection');
const crypto = require('crypto');
const XLSX = require('xlsx');

const router = express.Router()

function generateSessionId() {
  return crypto.randomBytes(20).toString('hex');
}

router.post('/insertData', (req, res) => {
  const {userName, emailId, password, role } = req.body;
  const createdDate = new Date()

  const data = {userName, emailId, password, role, createdDate }

  const sql = 'INSERT INTO login_Data SET ?'
  db.query(sql, data, (err, result) => {
    if (err) {
      // Check if the error is due to duplicate entry
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).send({ status: false,message: 'User with this email already exists'})
      } else {
        return res.status(500).send({ status: false, message: err.message })
      }
    } else {
      const sessionId = generateSessionId();
      return res.send({ status: true, sessionId : sessionId, message: 'User created Successfully' })
    }
  })
})

router.post('/login', (req, res) => {
  const { emailId, password } = req.body

  if (!emailId || !password) {
    return res.status(400).send({ message: 'Email and password are required' })
  }

  const sqlSelect = 'SELECT userName, emailId, password FROM login_Data WHERE emailId = ?'
  const sqlInsert =
    'INSERT INTO login_Logs (emailId, login_time) VALUES (?, NOW())'

  db.query(sqlSelect, [emailId], (err, result) => {
    if (err) {
      return res.status(500).send({ message: err.message })
    } else {
      if (result.length === 0) {
        return res
          .status(404)
          .send({ status: false, message: 'User not found, Pls signUp    ' })
      } else {
        const user = result[0]
        if (user.password !== password) {
          return res
            .status(401)
            .send({ status: false, message: 'Invalid password,Pls retry    ' })
        } else {
          // User authenticated, insert login details
          db.query(sqlInsert, [emailId], (errInsert, resultInsert) => {
            if (errInsert) {
              return res.status(500).send({ message: errInsert.message })
            } else {
              const sessionId = generateSessionId();
              // saveSessionIdInDatabase(user.id, sessionId);
              res.send({ status: true, records: result , sessionId : sessionId, message: 'Login Successful' })
            }
          })
        }
      }
    }
  })
})


router.get('/getLoginData/:emailId', (req, res) => {
  const emailId = req.params.emailId; // Access emailId from URL parameter

  const sql = 'SELECT * FROM login_Data WHERE emailId = ?';
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


module.exports = router
