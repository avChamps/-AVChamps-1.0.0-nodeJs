const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = express();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const router = express.Router();
const jsonFilePath = path.join(__dirname, 'assets', 'homepage.json');

router.get('/getFooterText', (req, res) => {
    fs.readFile(jsonFilePath, 'utf8', (err, data) => {
      if (err) {
        return res.status(500).send({ status: false, message: err.message });
      }
      try {
        const jsonData = JSON.parse(data);
        return res.send({
          status: true,
          records: jsonData,
          message: 'Details Fetched Successfully'
        });
      } catch (parseErr) {
        return res.status(500).send({ status: false, message: parseErr.message });
      }
    });
  });
  
  module.exports = router;