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
  let dataSql = `SELECT fullName, designation, companyName, imagePath, slNo FROM signup_table`;
  const values = [];
  const searchValues = [];

  if (searchTerm) {
    const searchPattern = `%${searchTerm}%`;
    countSql += ` WHERE fullName LIKE ? OR companyName LIKE ? OR designation LIKE ?`;
    dataSql += ` WHERE fullName LIKE ? OR companyName LIKE ? OR designation LIKE ?`;
    searchValues.push(searchPattern, searchPattern, searchPattern);
  }

  dataSql += ` LIMIT ?, ?`;

  // Add search values first, then pagination values
  values.push(...searchValues, offset, pageSize);

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
  handleQuery(countSql, searchValues, res, (countResults) => {
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
