// routes.js
const express = require('express');
const db = require('./dbConnection');

const router = express.Router();

router.get('/getLoginData', (req, res) => {
  let { page, pageSize, searchTerm } = req.query;
  page = parseInt(page, 10);
  pageSize = parseInt(pageSize, 10);
  const offset = Math.max(0, (page - 1) * pageSize);

  // Base query for counting total records
  let countSql = `SELECT COUNT(*) as totalCount FROM signup_table`;
  let dataSql = `SELECT * FROM signup_table`;
  const values = [];

  if (searchTerm) {
    const searchPattern = `%${searchTerm}%`;
    countSql += ` WHERE fullName LIKE ? OR companyName LIKE ?`;
    dataSql += ` WHERE fullName LIKE ? OR companyName LIKE ?`;
    values.push(searchPattern, searchPattern);
  }

  dataSql += ` LIMIT ?, ?`;
  values.push(offset, pageSize);

  // Function to handle SQL queries
  function handleQuery(sql, values, res, callback) {
    db.query(sql, values, (error, results) => {
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      callback(results);
    });
  }

  // Get total count
  handleQuery(countSql, values.slice(0, values.length - 2), res, (countResults) => {
    const totalCount = countResults[0].totalCount;

    // Get paginated data
    handleQuery(dataSql, values, res, (dataResults) => {
      res.json({
        totalCount,
        records: dataResults,
      });
    });
  });
});

router.get('/loginInfo', (req, res) => {
  const sql = 'SELECT * FROM login_Logs';
  handleQuery(sql, res);
});

router.get('/countByRoles', (req, res) => {
  const sql = 'SELECT role, COUNT(*) AS role_count FROM login_Data GROUP BY role;';
  handleQuery(sql, res);
});

function handleQuery(sql, values, res) {
  db.query(sql, values, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    } else {
      return res.status(200).json({ success: true, records: result });
    }
  });
}

module.exports = router;
