const express = require('express');
const router = express.Router();
const {
  getMessages,
  markMessagesAsRead,
  markAsRead
} = require('../controllers/messageController');
const auth = require('../middleware/auth');

// @route   GET api/messages/:userId
// @desc    Get messages between two users
// @access  Private
router.get('/:userId', auth, getMessages);

// @route   PUT api/messages/read/:userId
// @desc    Mark messages as read
// @access  Private
router.put('/read/:userId', auth, markMessagesAsRead);

// @route   PUT api/messages/:messageId/read
// @desc    Mark single message as read
// @access  Private
router.put('/:messageId/read', auth, markAsRead);

module.exports = router;