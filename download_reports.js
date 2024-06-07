// routes.js
const express = require('express')
const db = require('./dbConnection')
const XLSX = require('xlsx');

const router = express.Router()


function handleQuery(result, res) {
    // Convert data to Excel format
    const worksheet = XLSX.utils.json_to_sheet(result);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    // Send Excel file as response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=data.xlsx');
    res.end(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}


// router.get('/downloadLogintable', (req, res) => {
//     const startDate = req.query.startDate;
//     const endDate = req.query.endDate;

//     console.log('Start Date:', startDate);
//     console.log('End Date:', endDate);
    
//     // Check if both start and end dates are provided
//     if (!startDate || !endDate) {
//       return res.status(400).send({ status: false, message: 'Start date and end date are required' });
//     }

//     // Construct the SQL query with the provided date range
//     const sql = `SELECT * FROM login_Data WHERE DATE(createdDate) >= ? AND DATE(createdDate) <= ?`;
//     console.log(sql);
    
//     // Execute the query with prepared statement
//     db.query(sql, [startDate, endDate], (err, result) => {
//         if (err) {
//             return res.status(500).send({ status: false, message: err.message });
//         } else {
//             handleQuery(result, res);
//             console.log(result);
//         }
//     });
// });


router.get('/downloadFeedBack', (req, res) => {
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const rating = req.query.rating; // Use req.query instead of req.body
  const tableName = req.query.tableName;

  console.log('Start Date:', startDate);
  console.log('End Date:', endDate);
  console.log('Rating:', rating); // Log the rating

  // Check if both start and end dates are provided
  if (!startDate || !endDate) {
    return res.status(400).send({ status: false, message: 'Start date and end date are required' });
  }

  if(tableName === 'login_Logs') {
    sql = `SELECT * FROM ${tableName} WHERE DATE(login_time) >= ? AND DATE(login_time) <= ?`;
  }

  else {
  sql = `SELECT * FROM ${tableName} WHERE DATE(createdDate) >= ? AND DATE(createdDate) <= ?`;
  }
  const params = [startDate, endDate];

  const placeholders = [];
  if (rating !== 'All' && rating !== '') {
    for (let i = 0; i < rating.length; i++) {
      placeholders.push('?');
      params.push(rating[i]);
    }
    sql += ` AND rating IN (${placeholders.join(', ')})`;  
  }

  console.log('SQL Query:', sql);

  db.query(sql, params, (err, result) => {
    if (err) {
      return res.status(500).send({ status: false, message: err.message });
    } else {
      handleQuery(result, res);
    }
  });
});






router.get('/downloadTodayLogin', (req, res) => {
  const sql = "SELECT (@row_number:=@row_number + 1) AS slno, t.*, CONVERT_TZ(t.login_time, 'UTC', 'Asia/Kolkata') AS login_timeIST FROM login_Logs t CROSS JOIN (SELECT @row_number:=0) AS rn WHERE DATE(t.login_time) = CURDATE()";
  handleQuery(sql, res);
});

router.get('/downloadLoginInfo', (req, res) => {
  const sql = 'SELECT * FROM login_Logs';
  handleQuery(sql, res);
});


module.exports = router
