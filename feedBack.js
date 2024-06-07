// routes.js
const express = require('express')
const bodyParser = require('body-parser');
const db = require('./dbConnection');
const XLSX = require('xlsx');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const router = express.Router()

router.post('/insertFeedBack', (req, res) => {
  const { emailId, rating, message,userName} = req.body
  const createdDate = new Date()

  const data = { emailId, rating,createdDate,message,userName }

  const sql = 'INSERT INTO feedback SET ?'

  db.query(sql, data, (err, result) => {
    if (err) {
      console.log(err)
        return res.status(500).send({ status: false, message: err.message })
      }
     else {
      return res.send({ status: true, message: 'Feed Inserted Successfully' })
    }
  })
})

router.get('/getFeedBackData', (req, res) => {
//   const sql = 'SELECT * FROM feedback ORDER BY date DESC;';
  const sql = 'SELECT rating, COUNT(*) AS rating FROM feedback GROUP BY rating;';
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


// function handleQuery(sql, res) {
//     db.query(sql, (err, result) => {
//         if (err) {
//             return res.status(500).send({ status: false, message: err.message });
//         } else {
//             // Convert data to Excel format
//             const worksheet = XLSX.utils.json_to_sheet(result);
//             const workbook = XLSX.utils.book_new();
//             XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
//             // Send Excel file as response
//             res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//             res.setHeader('Content-Disposition', 'attachment; filename=data.xlsx');
//             res.end(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
//         }
//     });
//   }
  
//   router.get('/downloadFeedback', (req, res) => {
//     const sql = 'SELECT * FROM feedback';
//     handleQuery(sql, res);
//   });
  



module.exports = router
