const express = require('express');
const bodyParser = require('body-parser');
const db = require('./dbConnection');
const app = express();
const multer = require('multer');
const cors = require('cors');
const router = express.Router();
const { getCountry } = require('countries-and-timezones');
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const { Country, State, City } = require('country-state-city'); 

// Fetch all countries
router.get('/getCountries', (req, res) => {
    try {
        const countries = Country.getAllCountries();
        if (!countries || countries.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Countries not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Countries fetched successfully',
            data: countries,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching countries',
            error: error.message,
        });
    }
});

// Fetch states for a selected country
router.post('/getStates', (req, res) => {
    const { countryCode } = req.body;

    if (!countryCode) {
        return res.status(400).json({
            success: false,
            message: 'Country code is required',
        });
    }

    try {
        const states = State.getStatesOfCountry(countryCode.toUpperCase());
        if (!states || states.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'States not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'States fetched successfully',
            data: states,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching states',
            error: error.message,
        });
    }
});

// Fetch cities for a selected state
router.post('/getCities', (req, res) => {
    const { countryCode, stateCode } = req.body;

    if (!countryCode || !stateCode) {
        return res.status(400).json({
            success: false,
            message: 'Country code and state code are required',
        });
    }

    try {
        const cities = City.getCitiesOfState(countryCode.toUpperCase(), stateCode.toUpperCase());
        if (!cities || cities.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cities not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cities fetched successfully',
            data: cities,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching cities',
            error: error.message,
        });
    }
});

module.exports = router;

