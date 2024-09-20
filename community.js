const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const AWS = require('aws-sdk');
const db = require('./dbConnection');
const app = express();
const cors = require('cors');
const router = express.Router()
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
AWS.config.update({
  accessKeyId: 'KJ9SPRHRL34JNQBWXC34',
  secretAccessKey: 'OBUzDlDHxL0aV3G8mGXDVGaGC65r3h9HQlbADGR9',
  region: 'us-east-1',
  endpoint: 'https://cellar-c2.services.clever-cloud.com'
});

const s3 = new AWS.S3();

router.get('/getCommunityQuestions', (req, res) => {
  const { limit = 5, offset = 0, searchQuery = '' } = req.query;

  // Modify your SQL query to include the search condition
  const sql = `
  SELECT 
      c.qId, 
      c.emailId AS question_owner_email, 
      pi.imagePath AS question_owner_imagePath,
      c.userName AS question_userName_name, 
      c.question, 
      c.imagePath,
      c.urlLink,
      c.ques_postedDate AS question_posted_date, 
      MAX(a.emailId) AS answer_userName_email, 
      MAX(a.userName) AS answer_owner_name, 
      MAX(a.answer) AS answer, 
      MAX(a.ans_postedDate) AS answer_posted_date 
  FROM 
      (SELECT qId, emailId, userName,imagePath, question, urlLink, ques_postedDate FROM community_questions) AS c 
  LEFT JOIN 
      (SELECT qId, emailId, userName, answer, ans_postedDate FROM community_answers) AS a
  ON 
      c.qId = a.qId 
  LEFT JOIN 
      signup_table AS pi 
  ON 
      c.emailId = pi.emailId 
  WHERE 
      c.question LIKE '%${searchQuery}%' OR
      a.answer LIKE '%${searchQuery}%' 
  GROUP BY
      c.qId,
      c.emailId, 
      pi.imagePath, 
      c.userName, 
      c.question, 
      c.imagePath, 
      c.urlLink, 
      c.ques_postedDate
  ORDER BY 
      c.qId DESC
  LIMIT ? OFFSET ?`; // Placeholders for limit and offset values
 

  db.query(sql, [parseInt(limit), parseInt(offset)], (err, results) => {
      if (err) {
          console.error('Error fetching records:', err);
          res.status(500).json({ error: 'Error fetching records' });
      } else {
          console.log('Fetched records successfully');
          return res.send({ status: true, records: results, message: 'Details Fetched Successfully' });
      }
  });
});

router.get('/getUploadedCommunityQuestions', (req, res) => {
  const { limit = 5, offset = 0, searchQuery = '', emailId } = req.query;

  const sql = `
  SELECT 
      c.qId, 
      c.emailId AS question_owner_email, 
      pi.imagePath AS question_owner_imagePath, 
      c.userName AS question_userName_name, 
      c.question, 
      c.imagePath,
      c.urlLink, 
      c.ques_postedDate AS question_posted_date, 
      MAX(a.emailId) AS answer_userName_email, 
      MAX(a.userName) AS answer_owner_name, 
      MAX(a.answer) AS answer,
      MAX(a.ans_postedDate) AS answer_posted_date 
  FROM 
      (SELECT qId, emailId, userName, imagePath, question, urlLink, ques_postedDate FROM community_questions) AS c 
  LEFT JOIN 
      (SELECT qId, emailId, userName, answer, ans_postedDate FROM community_answers) AS a 
  ON 
      c.qId = a.qId 
  LEFT JOIN 
      signup_table AS pi 
  ON 
      c.emailId = pi.emailId 
  WHERE 
      (c.question LIKE ? OR a.answer LIKE ?) AND c.emailId = ? 
  GROUP BY 
      c.qId, 
      c.emailId, 
      pi.imagePath, 
      c.userName, 
      c.question, 
      c.imagePath, 
      c.urlLink, 
      c.ques_postedDate 
  ORDER BY 
      c.ques_postedDate DESC 
  LIMIT ? OFFSET ?`;

  db.query(sql, [`%${searchQuery}%`, `%${searchQuery}%`, emailId, parseInt(limit), parseInt(offset)], (err, results) => {
    if (err) {
      console.error('Error fetching records:', err);
      res.status(500).json({ error: 'Error fetching records' });
    } else {
      console.log('Fetched records successfully');
      return res.send({ status: true, records: results, message: 'Details Fetched Successfully' });
    }
  });
});

router.get('/getMoreCommunityAnswers/:qId', (req, res) => {
    const qId = req.params.qId; // Extracting qId from the route parameters

    const sql = `
    SELECT 
        c.qId, 
        c.emailId AS question_owner_email, 
        c.question, 
        c.ques_postedDate AS question_posted_date, 
        a.userName AS answer_userName, 
        a.emailId AS answer_owner_email, 
        a.answer, 
        a.ans_postedDate AS answer_posted_date,
        p.imagePath AS answer_owner_imagePath -- Alias the imagePath from profile_Image table
    FROM 
        community_questions AS c
    LEFT JOIN 
        community_answers AS a ON c.qId = a.qId
    LEFT JOIN 
    signup_table AS p ON a.emailId = p.emailId -- Join profile_Image table based on emailId
    WHERE 
        c.qId = ?`;
    db.query(sql, qId, (err, results) => {
        if (err) {
            console.error('Error fetching records:', err);
            res.status(500).json({ error: 'Error fetching records' });
        } else {
            console.log('Fetched records successfully');
            return res.send({ status: true, records: results, message: 'Details Fetched Successfully' });
        }
    });
});

router.post('/insertCommunity', upload.single('image'), (req, res) => {
    const { emailId, question, userName, urlLink } = req.body;

    // Check if file is uploaded
    if (req.file) {
        const imageBuffer = req.file.buffer;
        const imageName = req.file.originalname;
       console.log(imageBuffer,imageName);
        uploadImageToS3(imageBuffer, imageName)
            .then((imageUrl) => {
                console.log('Image uploaded successfully:', imageUrl);
                const imagePath = imageUrl;
                const ques_postedDate = new Date();
                const data = { emailId, question, ques_postedDate, userName, imagePath, urlLink };
                console.log(data);
                const sql = 'INSERT INTO community_questions SET ?';

                db.query(sql, data, (err, result) => {
                    if (err) {
                        console.error('Error inserting community_questions:', err);
                        return res.status(500).json({ error: 'Error inserting seller info' });
                    }
                    return res.json({ status: true, message: 'Posted Successfully' });
                });
            })
            .catch((err) => {
                console.error('Error uploading image:', err);
                res.status(500).json({ error: 'Error uploading image' });
            });
    } else {
        // If no image is uploaded, proceed without uploading image
        const date = new Date();
        const ques_postedDate = date.toLocaleString();
        const data = { emailId, question, ques_postedDate, userName, urlLink };
        console.log(data);
        const sql = 'INSERT INTO community_questions SET ?';

        db.query(sql, data, (err, result) => {
            if (err) {
                console.error('Error inserting community_questions:', err);
                return res.status(500).json({ error: 'Error inserting seller info' });
            }
            return res.json({ status: true, message: 'Question posted successfully' });
        });
    }
});

router.post('/insertCommunityAnswer', upload.single('image'), (req, res) => {
    const { emailId, answer, userName, qId } = req.body;
  
    const ans_postedDate = new Date();
    const data = { qId, emailId, answer, ans_postedDate, userName };
    console.log(data);
    const sql = 'INSERT INTO community_answers SET ?';
  
    db.query(sql, data, (err, result) => {
      if (err) {
        console.error('Error inserting community_answers:', err);
        return res.status(500).json({ error: 'Error inserting seller info' });
      }
      return res.json({ status: true, message: 'Comment posted successfully' });
    });
});

router.post('/updateCommunity', upload.single('image'), (req, res) => {
    const { emailId, question, urlLink, qId } = req.body;
    let imagePath = null; // Initialize imagePath to null

    // If a file is uploaded, store its path
    if (req.file) {
        const imageBuffer = req.file.buffer;
        const imageName = req.file.originalname;

        uploadImageToS3(imageBuffer, imageName)
            .then((imageUrl) => {
                console.log('Image uploaded successfully:', imageUrl);
                imagePath = imageUrl; // Update imagePath with the new image path
                updateCommunity(); // Call updateCommunity function after image upload
            })
            .catch((err) => {
                console.error('Error uploading image:', err);
                return res.status(500).json({ error: 'Error uploading image' });
            });
    } else {
        // If no file is uploaded, retrieve the previous imagePath from the database
        const sqlSelectImagePath = 'SELECT imagePath FROM community_questions WHERE qId = ?';
        db.query(sqlSelectImagePath, [qId], (err, result) => {
            if (err) {
                console.error('Error fetching previous image path:', err);
                return res.status(500).json({ error: 'Error fetching previous image path' });
            }
            if (result.length > 0) {
                imagePath = result[0].imagePath; // Retrieve the previous imagePath
            }
            updateCommunity(); // Call updateCommunity function without updating imagePath
        });
    }

    function updateCommunity() {
        const ques_postedDate = new Date(); // Convert to MySQL compatible format
        const sql = `UPDATE community_questions SET emailId = '${emailId}', question = '${question}', ques_postedDate = '${ques_postedDate}', urlLink = '${urlLink}', qId = '${qId}' ${req.file ? `, imagePath = '${imagePath}'` : ''} WHERE qId = '${qId}'`;
        console.log('Query:', sql); // Log the SQL query
        db.query(sql, (err, result) => {
            if (err) {
                console.error('Error updating Questions', err);
                return res.status(500).json({ error: 'Error updating Questions' });
            }
            return res.json({ status: true, message: 'Details updated successfully' });
        });
    }
});

router.post('/deleteCommunityRecords', (req, res) => {
    const { emailId, qId } = req.body; // Access emailId and qId from request body
  
    const sql = `
      DELETE community_questions, community_feedback, community_answers 
      FROM community_questions
      LEFT JOIN community_feedback ON community_questions.qId = community_feedback.qId
      LEFT JOIN community_answers ON community_questions.qId = community_answers.qId
      WHERE community_questions.emailId = ? AND community_questions.qId = ?
    `;
  
    db.query(sql, [emailId, qId], (err, results) => {
      if (err) {
        console.error('Error deleting records:', err);
        res.status(500).json({ error: 'Error deleting records' });
        return;
      }
  
      console.log('Records Deleted Successfully');
      const affectedRows = results ? results.affectedRows : 0;
      res.json({ status: true, affectedRows, message: 'Deleted Successfully' });
    });
  });
  
router.post('/feedback', (req, res) => {
    const { qId, emailId, action } = req.body;
    const posted_date = new Date();
    let feedbackType, value;
  
    if (action === 'like') {
      feedbackType = 'likes';
      value = 1;
    } else if (action === 'view') { 
        feedbackType = 'views';
        value = 1;
    }    
    else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  
    const sql = `INSERT INTO community_feedback (${feedbackType}, emailId, posted_date, qId) VALUES (?, ?, ?, ?);`;
    console.log('SQL:', sql);
    console.log('Parameters:', [value, emailId, posted_date, qId]);
  
    db.query(sql, [value, emailId, posted_date, qId], (err, result) => {
      if (err) {
        console.error('Error updating feedback for question:', err);
        return res.status(500).json({ error: 'Error updating feedback' });
      }
      console.log('Rows affected:', result.affectedRows);
      res.status(200).json({ success: true });
    });
  });

router.get('/getFeedback/:qId', (req, res) => {
    const qId = req.params.qId; // Extracting qId from the route parameters
    const sql = `SELECT 
    COALESCE(SUM(cf.likes), 0) AS total_likes,  
    COALESCE(SUM(cf.views), 0) AS total_views,
    COALESCE(COUNT(DISTINCT ca.answer), 0) AS total_comments
FROM 
    community_feedback cf
LEFT JOIN 
    community_answers ca ON cf.qId = ca.qId
WHERE 
    cf.qId = ?`
    console.log(sql);
    db.query(sql, qId, (err, results) => {
        if (err) {
            console.error('Error fetching records:', err);
            res.status(500).json({ error: 'Error fetching records' });
        } else {
            console.log('Fetched records successfully');
            return res.send({ status: true, records: results, message: 'Details Fetched Successfully' });
        }
    });
});


router.get('/getLikesInfo/:emailId', (req, res) => {
  const qId = req.params.emailId; // Extracting qId from the route parameters
  const sql = `SELECT * FROM community_feedback WHERE emailId= ?`
  console.log(sql);
  db.query(sql, qId, (err, results) => {
      if (err) {
          console.error('Error fetching records:', err);
          res.status(500).json({ error: 'Error fetching records' });
      } else {
          console.log('Fetched records successfully');
          return res.send({ status: true, records: results, message: 'Details Fetched Successfully' });
      }
  });
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


  module.exports = router
