const express = require('express');
const router = express.Router();

router.get('/details', (req, res) => res.render('rbc/details'));

module.exports = router;