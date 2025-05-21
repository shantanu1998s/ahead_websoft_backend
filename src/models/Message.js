const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add population to queries
messageSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'sender',
    select: 'username avatar isOnline lastSeen'
  }).populate({
    path: 'receiver',
    select: 'username avatar isOnline lastSeen'
  });
  next();
});

module.exports = mongoose.model('Message', messageSchema);