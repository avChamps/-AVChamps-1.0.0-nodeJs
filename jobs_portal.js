const express = require('express');
const db = require('./dbConnection');
const app = express();
const cors = require('cors');
const router = express.Router();
const cron = require('node-cron');

app.use(cors());

router.get('/getPostedJobs', (req, res) => {
  const { limit = 5, offset = 0, searchQuery = '', location = '', jobType = '', postedBy = '' } = req.query;
  let sql = 'SELECT * FROM job_applications';
  const queryParams = [];

  // Start building the WHERE clause
  let conditions = [];

  if (postedBy) {
    conditions.push('postedBy = ?');
    queryParams.push(postedBy);
  }

  if (searchQuery) {
    conditions.push('(job_role LIKE ? OR company LIKE ? OR location LIKE ? OR job_type LIKE ? OR email LIKE ?)');
    const searchWildcard = `%${searchQuery}%`;
    queryParams.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard, searchWildcard);
  }

  if (location) {
    conditions.push('location = ?');
    queryParams.push(location);
  }

  if (jobType) {
    conditions.push('job_type = ?');
    queryParams.push(jobType);
  }

  // Append the conditions to the SQL query
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // Add the ORDER BY clause
  sql += ' ORDER BY applied_at DESC';

  // Add the LIMIT and OFFSET clauses
  sql += ' LIMIT ? OFFSET ?';
  queryParams.push(parseInt(limit), parseInt(offset));

  db.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error('Error fetching records:', err);
      res.status(500).json({ error: 'Error fetching records' });
    } else {
      console.log('Fetched records successfully');

      const countSql = 'SELECT job_role, COUNT(*) as total FROM job_applications GROUP BY job_role';

      db.query(countSql, (countErr, countResults) => {
        if (countErr) {
          console.error('Error fetching job roles count:', countErr);
          res.status(500).json({ error: 'Error fetching job roles count' });
        } else {
          console.log('Fetched job roles count successfully');

          // Define a mapping of job roles to Font Awesome icon classes
          const jobRoleIcons = {
            live_events: 'fa-solid fa-calendar-alt',
            installation_professionals: 'fa-solid fa-tools',
            sales_marketing: 'fa-solid fa-chart-line',
            project_engineer: 'fa-solid fa-project-diagram',
            design_engineer: 'fa-solid fa-pencil-ruler',
            cad_engineer: 'fa-solid fa-drafting-compass',
            av_engineer: 'fa-solid fa-video',
            others: 'fa-solid fa-ellipsis-h'
          };

          // Map over countResults and append the icon class
          const jobRolesWithIcons = countResults.map(job => {
            return {
              ...job,
              icon: jobRoleIcons[job.job_role] || 'fa-solid fa-question'
            };
          });

          return res.json({
            status: true,
            records: results,
            jobRolesCount: jobRolesWithIcons,
            message: 'Details Fetched Successfully'
          });
        }
      });
    }
  });
});

router.post('/editJob', (req, res) => {
  const {
    job_role,
    company,
    jobType,
    minSalary,
    maxSalary,
    location,
    email,
    phone,
    companyUrl,
    postedBy,
    slNo
  } = req.body;

  const sql = 'UPDATE job_applications SET job_role = ?, company = ?, job_type = ?, min_salary = ?, max_salary = ?, location = ?, email = ?, phone = ?, companyUrl = ?, applied_at = NOW()  WHERE postedBy = ? AND slNo = ?';

  const data = [
    job_role,
    company,
    jobType,
    minSalary,
    maxSalary,
    location,
    email,
    phone,
    companyUrl,
    postedBy,
    slNo
  ];

  console.log(data);
  db.query(sql, data, (err, result) => {
    if (err) {
      console.error('Error updating job info:', err);
      return res.status(500).json({ error: 'Error updating job info' });
    }
    return res.json({ status: true, message: 'Details updated successfully' });
  });
});

router.post('/deleteJob', (req, res) => {
  const { slNo, job_role, company } = req.body; // Access email from request body

  console.log('Request Body:', req.body);

  const sql = 'DELETE FROM job_applications WHERE slNo = ? AND job_role = ? AND company = ?';

  console.log('SQL Query:', sql);
  console.log('Values:', [slNo, job_role, company]);

  db.query(sql, [slNo, job_role, company], (err, result) => {
    if (err) {
      console.error('Error deleting records:', err);
      res.status(500).json({ error: 'Error deleting records' });
    } else {
      const affectedRows = result ? result.affectedRows : 0;
      res.json({ status: true, affectedRows, message: 'Post Deleted Successfully' });
    }
  });
});

router.post('/submitApplication', (req, res) => {
  const { job_role, company, location, jobType, minSalary, maxSalary, email, phone, companyUrl,postedBy } = req.body;
  const postedDate = new Date();
  const deletedDate = new Date(postedDate);
  deletedDate.setDate(postedDate.getDate() + 30);
  const sql = 'INSERT INTO job_applications (job_role, company, location, job_type, min_salary, max_salary, email, phone,companyUrl,postedBy,deletedDate) VALUES (?, ?, ?, ?, ?,?, ?, ?, ?,?,?)';
  const values = [job_role, company, location, jobType, minSalary, maxSalary, email, phone, companyUrl,postedBy,deletedDate];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error inserting application:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    return res.json({ status: true, message: 'Job posted successfully' });
  });
});

module.exports = router;
