const User = require('../models/User');
const Message = require('../models/Message');

// @desc    Get all users
// @route   GET /api/users
// @access  Private
exports.getUsers = async (req, res) => {
  try {
    // Get all users except current user
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('-password')
      .sort({ isOnline: -1, username: 1 });

    // Get last message for each user
    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { sender: req.user.id, receiver: user._id },
            { sender: user._id, receiver: req.user.id }
          ]
        })
        .sort({ createdAt: -1 })
        .populate('sender', 'username');

        return {
          ...user.toObject(),
          lastMessage
        };
      })
    );

    res.json(usersWithLastMessage);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ 
      errors: [{ msg: 'Server error' }] 
    });
  }
};