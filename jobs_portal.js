const express = require('express');
const db = require('./dbConnection');
const app = express();
const cors = require('cors');
const router = express.Router();
const cron = require('node-cron');

app.use(cors());

router.get('/getPostedJobs', (req, res) => {
  const { limit = 10, offset = 0, searchQuery = '', location = '', jobType = '', postedDate = '', sortBy = '',email = '' } = req.query;
  let sql = 'SELECT * FROM job_applications';
  const queryParams = [];
  let countSql = 'SELECT COUNT(*) AS totalRecords FROM job_applications';
  const countQueryParams = [];

  // Start building the WHERE clause
  let conditions = [];

  if (postedDate) {
    conditions.push('postedDate = ?');
    queryParams.push(postedDate);
    countQueryParams.push(postedDate);
  }

  if (searchQuery) {
    conditions.push('(jobRole LIKE ? OR location LIKE ? OR jobType LIKE ? OR email LIKE ?)');
    const searchWildcard = `%${searchQuery}%`;
    queryParams.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
    countQueryParams.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
  }

  if (location) {
    conditions.push('location = ?');
    queryParams.push(location);
    countQueryParams.push(location);
  }

  if (jobType) {
    conditions.push('jobType = ?');
    queryParams.push(jobType);
    countQueryParams.push(jobType);
  }

  if (email) {
    conditions.push('email = ?');
    queryParams.push(email);
    countQueryParams.push(email);
  }

  // Append the conditions to the SQL query
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
    countSql += ' WHERE ' + conditions.join(' AND ');
  }

  // Add the ORDER BY clause based on sortBy
  switch (sortBy.toLowerCase()) {
    case 'newest':
      sql += ' ORDER BY postedDate DESC';
      break;
    case 'oldest':
      sql += ' ORDER BY postedDate ASC';
      break;
    case 'most relevant':
      sql += ' ORDER BY relevanceScore DESC'; // Assuming relevanceScore exists
      break;
    default:
      sql += ' ORDER BY postedDate DESC'; // Default to newest
  }

  // Add the LIMIT and OFFSET clauses
  sql += ' LIMIT ? OFFSET ?';
  queryParams.push(parseInt(limit), parseInt(offset));

  // Execute the count query first
  db.query(countSql, countQueryParams, (countErr, countResults) => {
    if (countErr) {
      console.error('Error fetching total records count:', countErr);

      // Return 0 as totalRecords if there is an error
      res.status(200).json({
        status: true,
        records: [],
        totalRecords: 0,
        message: 'Details Fetched Successfully (No records found)'
      });
    } else {
      const totalRecords = countResults.length > 0 ? countResults[0].totalRecords : 0;

      // Execute the main query for paginated results
      db.query(sql, queryParams, (err, results) => {
        if (err) {
          console.error('Error fetching records:', err);
          res.status(500).json({ error: 'Error fetching records' });
        } else {
          res.json({
            status: true,
            records: results,
            totalRecords,
            message: 'Details Fetched Successfully'
          });
        }
      });
    }
  });
});


router.post('/editJob', (req, res) => {
  const { id, email, ...data } = req.body; // Extract id, email, and postedDate from the payload

  // Validation: Check if required fields are present
  if (!id || !email) {
    return res.status(400).json({
      error: 'ID, and email are required to identify the job.'
    });
  }

  // Additional validation (if needed)
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  // Create the SET clause dynamically
  const updates = Object.keys(data).map((key) => `${key} = ?`).join(', ');
  const values = [...Object.values(data), id, email];

  const sql = `UPDATE job_applications SET ${updates} WHERE id = ? AND email =?`;
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error updating data:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'No job application found with the provided ID, email, and postedDate'
      });
    }

    return res.json({ status: true, message: 'Job application updated successfully' });
  });
});

router.post('/deleteJob', (req, res) => {
  const { id, email } = req.body; // Extract id and email from the payload
  console.log(req.body)
  // Validation: Check if required fields are present
  if (!id || !email) {
    return res.status(400).json({
      error: 'ID and email are required to delete the job.'
    });
  }

  const sql = `DELETE FROM job_applications WHERE id = ? AND email = ?`;
  const values = [id, email];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error deleting data:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'No job application found with the provided ID and email'
      });
    }

    return res.json({ status: true, message: 'Job application deleted successfully' });
  });
});


router.post('/submitApplication', (req, res) => {
  const data = req.body;

  const postedDate = new Date();
  const deletedDate = new Date(postedDate);
  deletedDate.setDate(postedDate.getDate() + 30);

  data.postedDate = postedDate;
  data.deletedDate = deletedDate;

  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);

  const sql = `INSERT INTO job_applications (${fields}) VALUES (${placeholders})`;
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    return res.json({ status: true, message: 'Job posted successfully' });
  });
});



cron.schedule('58 23 * * *', () => {
  const currentDate = new Date();
  const sql = `DELETE FROM job_applications WHERE deletedDate <= ?`;

  db.query(sql, [currentDate], (err, result) => {
    if (err) {
      console.error('Error deleting expired job applications:', err);
    } else {
      console.log(`Deleted ${result.affectedRows} expired job applications.`);
    }
  });
});


module.exports = router;
