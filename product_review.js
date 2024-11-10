const express = require('express');
const bodyParser = require('body-parser');
const db = require('./dbConnection');
const app = express();
const multer = require('multer');
const cors = require('cors');
const router = express.Router()
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


router.get('/getProducts', (req, res) => {
  const sql = `SELECT * FROM products`;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ status: false, message: err.message });
    }

    if (result.length === 0) {
      const data = [{ "records": 0 }];
      return res.send({ status: false, message: 'No records found', data: data });
    }

    return res.send({ status: true, message: 'Product ratings details retrieved successfully', data: result });
  });
});

router.post('/insertProductReview', (req, res) => {
    const { emailId, productName, reviews, rating, displayUserName } = req.body;
  
    const postedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const data = { emailId, productName, reviews, rating, displayUserName, postedDate };
    
    console.log(data); 
    const sql = 'INSERT INTO product_posts SET ?';
    db.query(sql, data, (err, result) => {
      if (err) {
        console.error('Error inserting Product info:', err);
        return res.status(500).json({ error: 'Error inserting Product info' });
      }
      return res.json({ status: true, message: 'Product Review Posted Successfully' });
    });
  });

  router.post('/getProductReview', (req, res) => {
    const { productName } = req.body;
    if (!productName) {
      return res.status(400).send({ status: false, message: 'productName is required' });
    }
    const sql = `
    SELECT 
      pp.*, 
      st.imagepath,
      COALESCE(SUM(ppr.likes), 0) AS totalLikes,
      COALESCE(SUM(ppr.dislike), 0) AS totalDislikes
    FROM 
      product_posts pp 
    LEFT JOIN 
      signup_table st 
    ON 
      pp.emailId = st.emailId 
    LEFT JOIN 
      product_posts_review ppr 
    ON 
      pp.reviewNumber = ppr.reviewNumber 
    WHERE 
      pp.productName = ? 
    GROUP BY 
      pp.reviewNumber, pp.emailId, pp.productName, pp.postedDate, pp.reviewNumber, st.imagepath
  `;
  
   db.query(sql, [productName], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send({ status: false, message: err.message });
      }
  
      if (result.length === 0) {
        data = [{ "records": 0 }]
        return res.send({ status: false, message: 'No records found', data: data });
      }
  
      return res.send({ status: true, message: 'productName details retrieved successfully', data: result });
    });
  });


  router.post('/getRatings', (req, res) => {
    const { productName } = req.body;
    if (!productName) {
      return res.status(400).send({ status: false, message: 'Product Rating is required' });
    }
   
    const sql = `SELECT rating, COUNT(*) AS ratingCount FROM product_posts WHERE productName = ? GROUP BY rating`;

   db.query(sql, [productName], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send({ status: false, message: err.message });
      }
  
      if (result.length === 0) {
        data = [{ "records": 0 }]
        return res.send({ status: false, message: 'No records found', data: data });
      }
  
      return res.send({ status: true, message: 'product ratings details retrieved successfully', data: result });
    });
  });


  router.post('/insertProductFeedback', (req, res) => {
    const { emailId, productName, displayUserName,reviewNumber, likes,dislike } = req.body;
  
    const postedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const data = { emailId, productName, displayUserName, postedDate,reviewNumber, likes,dislike };
    
    console.log(data); 
    const sql = 'INSERT INTO product_posts_review SET ?';
    db.query(sql, data, (err, result) => {
      if (err) {
        console.error('Error inserting Product info:', err);
        return res.status(500).json({ error: 'Error inserting Product info' });
      }
      return res.json({ status: true, message: 'Product Review feedback Posted Successfully' });
    });
  });
  
  module.exports = router;
  
