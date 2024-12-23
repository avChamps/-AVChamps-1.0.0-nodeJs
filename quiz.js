const express = require('express');
const bodyParser = require('body-parser');
const db = require('./dbConnection');
const app = express();
const multer = require('multer');
const cors = require('cors');
const router = express.Router()
const moment = require('moment');
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

router.post('/getQuizQuestions', async (req, res) => {
    const { emailId } = req.body;

    if (!emailId) {
        return res.status(400).json({ error: 'Email ID is required' });
    }

    try {
        const todayDate = moment().format('YYYY-MM-DD');

        // Fetch the count of questions answered today
        const answeredQuestionsCountQuery = `
            SELECT COUNT(*) AS answeredCount
            FROM user_responses
            WHERE emailId = ? AND posted_date = ?`;

        const answeredCount = await new Promise((resolve, reject) => {
            db.query(answeredQuestionsCountQuery, [emailId, todayDate], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]?.answeredCount || 0);
            });
        });

        console.log("Questions answered today:", answeredCount);

        // If 5 or more questions have already been answered, do not fetch new questions
        if (answeredCount >= 5) {
            return res.json({
                message: 'You have already attempted 5 questions for today. Please come back tomorrow!'
            });
        }

        // Fetch IDs of questions already answered today
        const answeredQuestionsQuery = `
            SELECT question_id
            FROM user_responses
            WHERE emailId = ? AND posted_date = ?`;

        const answeredQuestionsToday = await new Promise((resolve, reject) => {
            db.query(answeredQuestionsQuery, [emailId, todayDate], (err, results) => {
                if (err) return reject(err);
                resolve(results.map(row => row.question_id));
            });
        });

        // Fetch remaining questions up to the limit of 5
        const remainingQuestionsQuery = `
            SELECT question_id, question_text, option_a, option_b, option_c, option_d,correct_answer
            FROM quiz_questions
            WHERE question_id NOT IN (?) 
            ORDER BY RAND()
            LIMIT ?`;

        const remainingQuestions = await new Promise((resolve, reject) => {
            db.query(
                remainingQuestionsQuery,
                [answeredQuestionsToday.length > 0 ? answeredQuestionsToday : [0], 5 - answeredCount],
                (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                }
            );
        });

        res.json({ questions: remainingQuestions });
    } catch (error) {
        console.error('Error fetching quiz questions:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.get('/getTopScores', async (req, res) => {
    try {
        const topScoresQuery = `
            SELECT  userName, COUNT(is_correct) AS score
            FROM user_responses
            WHERE is_correct = 1
            GROUP BY emailId, userName
            ORDER BY score DESC
            LIMIT 5`;

        const topScores = await new Promise((resolve, reject) => {
            db.query(topScoresQuery, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        res.json({ topScores });
    } catch (error) {
        console.error('Error fetching top scores:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.post('/getQuizStats', async (req, res) => {
    const { emailId } = req.body;

    if (!emailId) {
        return res.status(400).json({ error: 'Email ID is required' });
    }

    try {
        const statsQuery = `
            SELECT 
                SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct_answers,
                SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) AS wrong_answers,
                COUNT(*) AS total_answers,
                ROUND(SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS correct_percentage,
                ROUND(SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS wrong_percentage
            FROM 
                user_responses
            WHERE 
                emailId = ?`;

        const stats = await new Promise((resolve, reject) => {
            db.query(statsQuery, [emailId], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });

        res.json(stats);
    } catch (error) {
        console.error('Error fetching quiz stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.post('/submitResponse', async (req, res) => {
    const { emailId, userName, question_id, is_correct } = req.body;

    if (!emailId || !userName || !question_id || typeof is_correct !== 'boolean') {
        return res.status(400).json({ error: 'Invalid data' });
    }

    try {
        const posted_date = moment().format('YYYY-MM-DD');
        const query = `
            INSERT INTO user_responses (emailId, userName, question_id, is_correct, posted_date) 
            VALUES (?, ?, ?, ?, ?)`;

        await new Promise((resolve, reject) => {
            db.query(query, [emailId, userName, question_id, is_correct, posted_date], (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        res.json({ message: 'Response recorded successfully' });
    } catch (error) {
        console.error('Error saving user response:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = router;

