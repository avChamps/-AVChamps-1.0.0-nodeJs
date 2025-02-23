const express = require('express');
const bodyParser = require('body-parser');
const db = require('./dbConnection');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const router = express.Router();

router.get('/getAllUsers', async (req, res) => {
    try {
      const users = await new Promise((resolve, reject) => {
        db.query('SELECT * FROM signup_table', (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
  
      res.json(users);
    } catch (error) {
      console.error('Error fetching all users:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  

  router.get('/getTraining', async (req, res) => {
    try {
      const users = await new Promise((resolve, reject) => {
        db.query('SELECT * FROM trainings', (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
  
      res.json({
        count: users.length,
        Data: users 
      });
    } catch (error) {
      console.error('Error fetching all trainings:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  



    router.get('/getUsersData', async (req, res) => {
        const userProfileWeights = {
          emailId: 10,
          workingEmailId: 10,
          mobileNumber: 10,
          dob: 10,
          companyName: 10,
          gender: 10,
          designation: 10,
          location: 10
        };
      
        const socialMediaProfileWeights = {
          twitter: 5,
          faceBook: 5,
          instagram: 5,
          linkedIn: 5
        };
      
        try {
          const userProfileResults = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM signup_table', (err, results) => {
              if (err) reject(err);
              else resolve(results);
            });
          });
      
          let totalUsers = userProfileResults.length;
          let below50 = 0;
          let below75 = 0;
          let above75 = 0;
      
          userProfileResults.forEach(user => {
            let totalWeight = 0;
      
            Object.keys(userProfileWeights).forEach(field => {
              if (user[field]) {
                totalWeight += userProfileWeights[field];
              }
            });
      
            Object.keys(socialMediaProfileWeights).forEach(field => {
              if (user[field]) {
                totalWeight += socialMediaProfileWeights[field];
              }
            });
      
            const percentage = (totalWeight / 100) * 100; // Assuming max weight is 100
      
            if (percentage < 50) {
              below50++;
            } else if (percentage < 75) {
              below75++;
            } else {
              above75++;
            }
          });
      
          res.json({
            totalUsers,
            below50,
            below75,
            above75
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });
      
const userProfileWeights = {
    emailId: 10,
    workingEmailId: 10,
    mobileNumber: 10,
    dob: 10,
    companyName: 10,
    gender: 10,
    designation: 10,
    location: 10
  };
  
  const socialMediaProfileWeights = {
    twitter: 5,
    faceBook: 5,
    instagram: 5,
    linkedIn: 5
  };
  
  // API to get users by category
  router.get('/getUsersByCategory', async (req, res) => {
    try {
      const { category } = req.query; // Example: below50, below75, above75
  
      // Fetch all user profiles from the database
      const userProfileResults = await new Promise((resolve, reject) => {
        db.query('SELECT * FROM signup_table', (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
  
      let filteredUsers = [];
  
      userProfileResults.forEach(user => {
        let totalWeight = 0;
  
        // Calculate total weight for each user
        Object.keys(userProfileWeights).forEach(field => {
          if (user[field]) {
            totalWeight += userProfileWeights[field];
          }
        });
  
        Object.keys(socialMediaProfileWeights).forEach(field => {
          if (user[field]) {
            totalWeight += socialMediaProfileWeights[field];
          }
        });
  
        const percentage = (totalWeight / 100) * 100;
  
        // Filter users based on selected category
        if ((category === 'below50' && percentage < 50) ||
            (category === 'below75' && percentage < 75 && percentage >= 50) ||
            (category === 'above75' && percentage >= 75)) {
          filteredUsers.push(user);
        }
      });
  
      res.json(filteredUsers);
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  

      

module.exports = router;
