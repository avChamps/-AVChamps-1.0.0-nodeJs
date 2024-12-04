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


router.post('/getQuizQestions', (req, res) => {
    const { emailId } = req.body;

    if (!emailId) {
        return res.status(400).send({ status: false, message: 'Email ID is required' });
    }

    const checkAnsweredQuery = `
        SELECT COUNT(*) AS answered_count
        FROM user_responses 
        WHERE emailId = ? 
        AND DATE(posted_date) = CURDATE();
    `;

    db.query(checkAnsweredQuery, [emailId], (err, result) => {
        if (err) {
            console.log("Database error:", err.message);
            return res.status(500).send({ status: false, message: err.message });
        }

        const answeredCount = result[0].answered_count;
        const remainingQuestions = 5 - answeredCount;
        if (remainingQuestions <= 0) {
            return res.send({
                status: false,
                message: 'You have already answered 5 questions today. Come back tomorrow!',
                data: []
            });
        }

        const fetchQuestionsQuery = `
            SELECT qq.*
            FROM quiz_questions qq
            WHERE qq.question_id NOT IN (
                SELECT question_id 
                FROM user_responses 
                WHERE emailId = ? 
                AND DATE(posted_date) = CURDATE()
            )
            ORDER BY RAND()
            LIMIT ?;
        `;

        db.query(fetchQuestionsQuery, [emailId, remainingQuestions], (err, result) => {
            if (err) {
                console.log("Database error:", err.message);
                return res.status(500).send({ status: false, message: err.message });
            }

            return res.send({
                status: true,
                message: 'Quiz questions retrieved successfully',
                data: result
            });
        });
    });
});


router.post('/getOverallCount', (req, res) => {
    const { emailId } = req.body;

    if (!emailId) {
        return res.status(400).send({ status: false, message: 'Email ID is required' });
    }

    const sql = `
        SELECT 
            emailId,
            userName,
            COUNT(*) AS total_responses,
            SUM(CASE WHEN is_correct = TRUE THEN 1 ELSE 0 END) AS correct_answers,
            SUM(CASE WHEN is_correct = FALSE THEN 1 ELSE 0 END) AS wrong_answers
        FROM user_responses
        WHERE emailId = ?
        GROUP BY emailId, userName;
    `;

    db.query(sql, [emailId], (err, result) => {
        if (err) {
            console.log("Database error:", err.message);
            return res.status(500).send({ status: false, message: err.message });
        }

        if (result.length === 0) {
            return res.send({
                status: false,
                message: 'No data found for the provided emailId.',
                data: []
            });
        }

        return res.send({
            status: true,
            message: 'Quiz answers retrieved successfully',
            data: result
        });
    });
});

function fetchQuestions(emailId, res) {
    const sql = `
        SELECT qq.*
        FROM quiz_questions qq
        ORDER BY RAND()
        LIMIT 5;
    `;

    db.query(sql, [emailId], (err, result) => {
        if (err) {
            console.log("Database error:", err.message);
            return res.status(500).send({ status: false, message: err.message });
        }

        return res.send({
            status: true,
            message: 'Quiz questions retrieved successfully',
            data: result
        });
    });
}

router.post('/insertQuizOptions', (req, res) => {
    const { emailId, userName, question_id, is_correct } = req.body;
    const postedDate = new Date().toISOString().slice(0, 19).replace('T', ' '); // Getting current date-time

    const data = {
        emailId,
        userName,
        question_id,
        is_correct,
        posted_date: postedDate  // Ensure you're storing the date of the response
    };

    const sql = 'INSERT INTO user_responses SET ?';
    db.query(sql, data, (err, result) => {
        if (err) {
            console.error('Error inserting quiz options:', err);
            return res.status(500).json({ error: 'Error inserting quiz options' });
        }
        return res.json({ status: true, message: 'Quiz options posted successfully' });
    });
});

router.get('/getTopScores', (req, res) => {
    const sql = `SELECT ur.emailId, 
       ur.userName, 
       st.imagePath, 
       COUNT(*) AS correct_answers
FROM user_responses ur
JOIN signup_table st ON ur.emailId = st.emailId
WHERE ur.is_correct = TRUE
GROUP BY ur.emailId, ur.userName, st.imagePath
ORDER BY correct_answers DESC
LIMIT 5;`;

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

module.exports = router;

