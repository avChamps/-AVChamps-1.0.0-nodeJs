const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const AWS = require('aws-sdk');
const db = require('./dbConnection');
const app = express();
const cors = require('cors');
const router = express.Router()
const cron = require('node-cron');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());
AWS.config.update({
  accessKeyId: 'KJ9SPRHRL34JNQBWXC34',
  secretAccessKey: 'OBUzDlDHxL0aV3G8mGXDVGaGC65r3h9HQlbADGR9',
  region: 'us-east-1',
  endpoint: 'https://cellar-c2.services.clever-cloud.com'
});

// Create an S3 instance
const s3 = new AWS.S3();

router.get('/getUploadData/:emailId', (req, res) => {
  const emailId = req.params.emailId;
  const offset = parseInt(req.query.offset) || 0;
  const limit = 5;
  
  const sql = 'SELECT * FROM seller_Info WHERE emailId = ? AND (productStatus IS NULL OR productStatus != \'soldOut\') ORDER BY postedDate DESC LIMIT ?, ?;';
  
  db.query(sql, [emailId, offset, limit], (err, results) => {
    if (err) {
      console.error('Error fetching records:', err);
      return res.status(500).json({ error: 'Error fetching records' });
    }
    console.log('Fetched records successfully');
    return res.json({ status: true, records: results, message: 'Details Fetched Successfully' });
  });
});

router.post('/deleteProduct', (req, res) => {
  const { id, email } = req.body; // Extract id and email from the payload
  console.log(req.body)
  // Validation: Check if required fields are present
  if (!id || !email) {
    return res.status(400).json({
      error: 'ID and email are required to delete the job.'
    });
  }

  const sql = `DELETE FROM seller_Info WHERE id = ? AND email = ?`;
  const values = [id, email];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error deleting data:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'No Product application found with the provided ID and email'
      });
    }

    return res.json({ status: true, message: 'Product deleted successfully' });
  });
});

const upload = multer({ storage: multer.memoryStorage() });


router.post('/soldOutProduct', (req, res) => {
  const { productStatus, slNo } = req.body;
  console.log(req.body);
  const sql = 'UPDATE seller_Info SET productStatus = ? WHERE slNo = ?';
  db.query(sql, [productStatus, slNo], (err, result) => {
    if (err) {
      console.error('Error updating product status:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    else {
    return res.json({ status: true, message: 'Product status updated successfully,The product will no longer be displayed on the website' });
    }
  });
});


router.get('/getPostedproducts', (req, res) => {
  const { limit = 10, offset = 0, searchQuery = '', location = '', category = '', postedDate = '', sortBy = '', email = '', title = '' } = req.query;
  let sql = 'SELECT * FROM seller_Info';
  const queryParams = [];
  let countSql = 'SELECT COUNT(*) AS totalRecords FROM seller_Info';
  const countQueryParams = [];

  // Start building the WHERE clause
  let conditions = [];

  if (postedDate) {
    conditions.push('postedDate = ?');
    queryParams.push(postedDate);
    countQueryParams.push(postedDate);
  }

  if (searchQuery) {
    conditions.push('(title LIKE ? OR location LIKE ? OR category LIKE ? OR email LIKE ?)');
    const searchWildcard = `%${searchQuery}%`;
    queryParams.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
    countQueryParams.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
  }

  if (location) {
    conditions.push('location = ?');
    queryParams.push(location);
    countQueryParams.push(location);
  }

  if (category) {
    conditions.push('category = ?');
    queryParams.push(category);
    countQueryParams.push(category);
  }

  if (email) {
    conditions.push('email = ?');
    queryParams.push(email);
    countQueryParams.push(email);
  }

  if (title) {
    conditions.push('title LIKE ?');
    queryParams.push(`%${title}%`);
    countQueryParams.push(`%${title}%`);
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

  
router.post('/insertCart', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required' });
  }

  const data = req.body;
  console.log('Parsed data:', data);
  console.log('Uploaded file:', req.file);

  // Process the uploaded file
  const imageBuffer = req.file.buffer;
  const imageName = req.file.originalname;

  // Handle S3 upload logic
  uploadImageToS3(imageBuffer, imageName)
    .then((imageUrl) => {
      data.imagePath = imageUrl;
      const postedDate = new Date();
      const deletedDate = new Date(postedDate);
      deletedDate.setDate(postedDate.getDate() + 30);

      data.postedDate = postedDate;
      data.deletedDate = deletedDate;

      const fields = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      const sql = `INSERT INTO seller_Info (${fields}) VALUES (${placeholders})`;

      db.query(sql, values, (err, result) => {
        if (err) {
          console.error('Error inserting seller info:', err);
          return res.status(500).json({ error: 'Error inserting seller info' });
        }

        return res.json({ status: true, message: 'Ad posted successfully' });
      });
    })
    .catch((err) => {
      console.error('Error uploading image:', err);
      res.status(500).json({ error: 'Error uploading image' });
    });
});

router.post('/editProduct', upload.single('image'), (req, res) => {
  const { id, email, image, ...data } = req.body; // Exclude 'image' from the data object

  // Function to update the database
  const updateSellerInfo = (imagePath) => {
    const postedDate = new Date();
    data.postedDate = postedDate; // Add postedDate to data
    data.imagePath = imagePath; // Add imagePath to data

    const fields = Object.keys(data).map(field => `${field} = ?`).join(', ');
    const values = [...Object.values(data), id, email];

    const sql = `UPDATE seller_Info SET ${fields} WHERE id = ? AND email = ?`;

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error updating seller info:', err);
        return res.status(500).json({ error: 'Error updating seller info' });
      }
      return res.json({ status: true, message: 'Details updated successfully' });
    });
  };

  // If a new image is uploaded
  if (req.file) {
    const imageBuffer = req.file.buffer;
    const imageName = req.file.originalname;

    uploadImageToS3(imageBuffer, imageName)
      .then((imageUrl) => {
        console.log('Image uploaded successfully:', imageUrl);
        updateSellerInfo(imageUrl); // Update the database with the new image path
      })
      .catch((err) => {
        console.error('Error uploading image:', err);
        return res.status(500).json({ error: 'Error uploading image' });
      });
  } else {
    // If no new image is uploaded, fetch the existing image path
    const sqlSelectImagePath = 'SELECT imagePath FROM seller_Info WHERE id = ? AND email = ?';
    db.query(sqlSelectImagePath, [id, email], (err, result) => {
      if (err) {
        console.error('Error fetching previous image path:', err);
        return res.status(500).json({ error: 'Error fetching previous image path' });
      }

      const previousImagePath = result.length > 0 ? result[0].imagePath : null;
      updateSellerInfo(previousImagePath); // Update the database with the existing image path
    });
  }
});


function uploadImageToS3(imageBuffer, filename) {
  const fileExtension = filename.split('.').pop().toLowerCase();
  let contentType;
  switch (fileExtension) {
    case 'jpg':
    case 'jpeg':
      contentType = 'image/jpeg';
      break;
    case 'png':
      contentType = 'image/png';
      break;
    case 'gif':
      contentType = 'image/gif';
      break;
    default:
      contentType = 'application/octet-stream';
  }

  const params = {
    Bucket: 'cart-images',
    Key: filename,
    Body: imageBuffer,
    ACL: 'public-read',
    ContentType: contentType,
    ContentDisposition: 'inline'
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.Location);
      }
    });
  });
}

cron.schedule('58 23 * * *', () => {
  const currentDate = new Date();
  const sql = `DELETE FROM seller_Info WHERE deletedDate <= ?`;

  db.query(sql, [currentDate], (err, result) => {
    if (err) {
      console.error('Error deleting expired job applications:', err);
    } else {
      console.log(`Deleted ${result.affectedRows} expired job applications.`);
    }
  });
});


module.exports = router;