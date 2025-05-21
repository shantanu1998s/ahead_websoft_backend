const Message = require('../models/Message');

// @desc    Get messages between two users
// @route   GET /api/messages/:userId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id }
      ]
    })
    .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ 
      errors: [{ msg: 'Server error' }] 
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/read/:userId
// @access  Private
exports.markMessagesAsRead = async (req, res) => {
  try {
    await Message.updateMany(
      {
        sender: req.params.userId,
        receiver: req.user.id,
        isRead: false
      },
      { $set: { isRead: true } }
    );

    res.json({ msg: 'Messages marked as read' });
  } catch (err) {
    console.error('Mark messages as read error:', err);
    res.status(500).json({ 
      errors: [{ msg: 'Server error' }] 
    });
  }
};

// @desc    Mark single message as read
// @route   PUT /api/messages/:messageId/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { $set: { isRead: true } },
      { new: true }
    );

    res.json(message);
  } catch (err) {
    console.error('Mark message as read error:', err);
    res.status(500).json({ 
      errors: [{ msg: 'Server error' }] 
    });
  }
};