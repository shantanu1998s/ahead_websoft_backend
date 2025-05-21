const express = require('express');
const router = express.Router();
const { getUsers } = require('../controllers/userController');
const auth = require('../middleware/auth');

// @route   GET api/users
// @desc    Get all users
// @access  Private
router.get('/', auth, getUsers);

module.exports = router;