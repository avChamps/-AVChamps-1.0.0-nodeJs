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
  endpoint: 'https://cellar-c2.services.clever-cloud.com',
  correctClockSkew: true
});

// Create an S3 instance
const s3 = new AWS.S3();


router.get('/getCommunityData', (req, res) => {
    const {
        limit = 10,
        offset = 0,
        searchQuery = '',
        location = '',
        questionType = '',
        postedDate = '',
        sortBy = '',
        email = '',
        title = '',
    } = req.query;

    let conditions = [];
    let queryParams = [];

    let sql = `
      SELECT 
        q.id AS questionId,
        q.emailId,
        q.userName,
        q.questionText,
        q.postedDate,
        q.imagePath,
        q.questionType,
        COUNT(DISTINCT c.id) AS totalComments,
        COUNT(DISTINCT l.id) AS questionLikes,
        q.views,
        MAX(s.imagePath) AS userImagePath
      FROM 
        questions q
      LEFT JOIN 
        comments c ON q.id = c.questionId
      LEFT JOIN 
        likes l ON q.id = l.questionId
      LEFT JOIN 
        signup_table s ON q.emailId = s.emailId
    `;

    let countSql = `
      SELECT 
        COUNT(DISTINCT q.id) AS totalRecords
      FROM 
        questions q
      LEFT JOIN 
        comments c ON q.id = c.questionId
      LEFT JOIN 
        likes l ON q.id = l.questionId
      LEFT JOIN 
        signup_table s ON q.emailId = s.emailId
    `;

    if (email) {
        conditions.push('q.emailId = ?');
        queryParams.push(email);
    }

    if (searchQuery) {
        conditions.push('(q.questionText LIKE ? OR q.userName LIKE ?)');
        const searchWildcard = `%${searchQuery}%`;
        queryParams.push(searchWildcard, searchWildcard);
    }

    if (postedDate) {
        conditions.push('DATE(q.postedDate) = ?');
        queryParams.push(postedDate);
    }

    if (questionType) {
        conditions.push('q.questionType = ?');
        queryParams.push(questionType);
    }


    if (title) {
        conditions.push('q.questionText LIKE ?');
        queryParams.push(`%${title}%`);
    }

    if (conditions.length > 0) {
        const whereClause = 'WHERE ' + conditions.join(' AND ');
        sql += ` ${whereClause}`;
        countSql += ` ${whereClause}`;
    }

    sql += ` GROUP BY q.id ORDER BY q.postedDate DESC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), parseInt(offset));

    db.query(countSql, queryParams.slice(0, -2), (countErr, countResults) => {
        if (countErr) {
            console.error('Error fetching total records count:', countErr);
            return res.status(500).json({ error: 'Error fetching total records count' });
        }

        const totalRecords = countResults.length > 0 ? countResults[0].totalRecords : 0;

        db.query(sql, queryParams, (err, results) => {
            if (err) {
                console.error('Error fetching records:', err);
                return res.status(500).json({ error: 'Error fetching records' });
            }

            res.json({
                status: true,
                records: results,
                totalRecords,
                message: 'Community data fetched successfully',
            });
        });
    });
});



// Fetch comments for a specific question
router.get('/getComments', (req, res) => {
    const { questionId } = req.query;

    if (!questionId) {
        return res.status(400).json({ error: 'questionId is required' });
    }

    const sql = `
    SELECT 
      c.id AS commentId,
      c.questionId,
      c.emailId,
      c.userName,
      c.commentText,
      c.postedDate,
      c.likes AS commentLikes,
      MAX(s.imagePath) AS userImagePath
    FROM 
      comments c
    LEFT JOIN 
      signup_table s ON c.emailId = s.emailId
    WHERE 
      c.questionId = ?
    GROUP BY 
      c.id, c.questionId, c.emailId, c.userName, c.commentText, c.postedDate, c.likes
    ORDER BY 
      c.postedDate DESC
  `;

    db.query(sql, [questionId], (err, results) => {
        if (err) {
            console.error('Error fetching comments:', err);
            return res.status(500).json({ error: 'Error fetching comments' });
        }

        res.json({
            status: true,
            comments: results,
            message: 'Comments fetched successfully',
        });
    });
});


router.post('/addComment', (req, res) => {
    const { questionId, emailId, userName, commentText } = req.body;

    if (!questionId || !emailId || !userName || !commentText) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const sql = `
      INSERT INTO comments (questionId, emailId, userName, commentText, postedDate, likes)
      VALUES (?, ?, ?, ?, NOW(), 0)
    `;

    db.query(sql, [questionId, emailId, userName, commentText], (err, result) => {
        if (err) {
            console.error('Error adding comment:', err);
            return res.status(500).json({ error: 'Error adding comment' });
        }

        res.json({
            status: true,
            message: 'Comment added successfully',
            commentId: result.insertId,
        });
    });
});


router.post('/addLike', (req, res) => {
    const { questionId, commentId, emailId } = req.body;

    if (!questionId && !commentId) {
        return res.status(400).json({ error: 'Either questionId or commentId is required' });
    }

    if (!emailId) {
        return res.status(400).json({ error: 'emailId is required' });
    }

    const id = questionId || commentId;

    const checkSql = `
  SELECT id FROM likes WHERE ${questionId ? 'questionId' : 'commentId'} = ? AND emailId = ?
`;

db.query(checkSql, [id, emailId], (checkErr, results) => {
  if (checkErr) {
    console.error('Error checking existing like:', checkErr);
    return res.status(500).json({ error: 'Error checking existing like' });
  }

  if (results.length > 0) {
    return res.status(400).json({ error: 'You have already liked this item' });
  }

  // Insert a new like into the likes table
  const insertSql = `
    INSERT INTO likes (questionId, commentId, emailId, createdDate)
    VALUES (?, ?, ?, NOW())
  `;

  db.query(insertSql, [questionId || null, commentId || null, emailId], (insertErr, insertResult) => {
    if (insertErr) {
      console.error('Error inserting like:', insertErr);
      return res.status(500).json({ error: 'Error inserting like' });
    }

    // Update the likes count in the questions or comments table
    const updateSql = `
      UPDATE ${questionId ? 'questions' : 'comments'}
      SET likes = likes + 1
      WHERE id = ?
    `;

    db.query(updateSql, [id], (updateErr, updateResult) => {
      if (updateErr) {
        console.error('Error updating likes count:', updateErr);
        return res.status(500).json({ error: 'Error updating likes count' });
      }

      res.json({
        status: true,
        message: 'Like added successfully',
      });
    });
  });
});
});


router.post('/postQuestion', upload.single('file'), (req, res) => {
    const { emailId, userName, questionText, questionType } = req.body;
  
    if (!emailId || !userName || !questionText || !questionType) {
      return res.status(400).json({ error: 'All fields are required' });
    }
  
    if (req.file) {
      // Process the uploaded file
      const imageBuffer = req.file.buffer;
      const imageName = req.file.originalname;
  
      uploadImageToS3(imageBuffer, imageName)
        .then((imageUrl) => {
          saveQuestionToDatabase(emailId, userName, questionText, questionType, imageUrl, res);
        })
        .catch((err) => {
          console.error('Error uploading image:', err);
          res.status(500).json({ error: 'Error uploading image' });
        });
    } else {
      saveQuestionToDatabase(emailId, userName, questionText, questionType, null, res);
    }
  });
  
  function saveQuestionToDatabase(emailId, userName, questionText, questionType, imagePath, res) {
    const sql = `
      INSERT INTO questions (emailId, userName, questionText, questionType, postedDate, likes, views, imagePath)
      VALUES (?, ?, ?, ?, NOW(), 0, 0, ?)
    `;
  
    db.query(sql, [emailId, userName, questionText, questionType, imagePath], (err, result) => {
      if (err) {
        console.error('Error posting question:', err);
        return res.status(500).json({ error: 'Error posting question' });
      }
  
      res.json({
        status: true,
        message: 'Question posted successfully',
        questionId: result.insertId,
      });
    });
  }
  


  router.put('/updateQuestion', upload.single('file'), (req, res) => {
    const { questionId, questionText, questionType } = req.body;
    const newImageFile = req.file;
  
    if (!questionId || !questionText || !questionType) {
      return res.status(400).json({ error: 'Question ID, text, and type are required' });
    }
  
    if (newImageFile) {
      const imageBuffer = newImageFile.buffer;
      const imageName = newImageFile.originalname;
  
      uploadImageToS3(imageBuffer, imageName)
        .then((imageUrl) => {
          const sql = `
            UPDATE questions
            SET questionText = ?, questionType = ?, imagePath = ?
            WHERE id = ?
          `;
  
          db.query(sql, [questionText, questionType, imageUrl, questionId], (err, result) => {
            if (err) {
              console.error('Error updating question:', err);
              return res.status(500).json({ error: 'Error updating question' });
            }
  
            res.json({ status: true, message: 'Question updated successfully with new image.' });
          });
        })
        .catch((err) => {
          console.error('Error uploading image:', err);
          res.status(500).json({ error: 'Error uploading image' });
        });
    } else {
      const sql = `
        UPDATE questions
        SET questionText = ?, questionType = ?
        WHERE id = ?
      `;
  
      db.query(sql, [questionText, questionType, questionId], (err, result) => {
        if (err) {
          console.error('Error updating question:', err);
          return res.status(500).json({ error: 'Error updating question' });
        }
  
        res.json({ status: true, message: 'Question updated successfully without changing the image.' });
      });
    }
  });
  
  
  
  
  
  
  router.delete('/deleteQuestion/:id', (req, res) => {
    const questionId = req.params.id;
  
    if (!questionId) {
      return res.status(400).json({ error: 'Question ID is required' });
    }
  
    const sql = `
      DELETE FROM questions
      WHERE id = ?
    `;
  
    db.query(sql, [questionId], (err, result) => {
      if (err) {
        console.error('Error deleting question:', err);
        return res.status(500).json({ error: 'Error deleting question' });
      }
  
      res.json({ status: true, message: 'Question deleted successfully' });
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


module.exports = router;
