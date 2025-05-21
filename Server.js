require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatApp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
  },
  online: { type: Boolean, default: false },
  socketId: { type: String },
  lastSeen: { type: Date }
});

// Message Schema
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// Socket.IO Logic
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Handle user registration with socket
  socket.on('register', ({ userId }) => {
    socket.userId = userId;
    
    // Update user's socketId and online status
    User.findByIdAndUpdate(userId, { 
      socketId: socket.id,
      online: true,
      lastSeen: null
    }).exec();
    
    console.log(`User ${userId} registered with socket`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      User.findByIdAndUpdate(socket.userId, { 
        online: false,
        lastSeen: new Date(),
        socketId: null
      }).exec();
    }
    console.log('Client disconnected');
  });

  // Handle typing indicator
  socket.on('typing', async ({ receiverId }) => {
    try {
      if (!socket.userId) return;
      
      const receiver = await User.findById(receiverId);
      if (receiver && receiver.socketId) {
        io.to(receiver.socketId).emit('typingIndicator', { 
          senderId: socket.userId,
          isTyping: true 
        });
      }
    } catch (err) {
      console.error('Typing indicator error:', err);
    }
  });

  // Handle stop typing
  socket.on('typingIndicator', async ({ senderId, receiverId, isTyping }) => {
  try {
    // Validate sender is the authenticated user
    if (!socket.userId || senderId !== socket.userId) {
      return;
    }

    // Find the receiver
    const receiver = await User.findById(receiverId);
    if (!receiver || !receiver.socketId) {
      return;
    }

    // Send the typing indicator to the receiver
    io.to(receiver.socketId).emit('typingIndicator', {
      senderId: senderId,
      isTyping: isTyping
    });

    console.log(`Typing indicator: ${senderId} is ${isTyping ? 'typing' : 'not typing'} to ${receiverId}`);

  } catch (err) {
    console.error('Typing indicator error:', err);
  }
});
  socket.on('sendMessage', async ({ senderId, receiverId, content }) => {
    console.log("sendMessage", { senderId, receiverId, content });
    try {
      if (!socket.userId) {
        throw new Error('User not registered');
      }
      
      // Verify the sender matches the authenticated socket user
      if (senderId !== socket.userId) {
        throw new Error('Unauthorized message attempt');
      }
      
      const message = new Message({ 
        sender: senderId, 
        receiver: receiverId, 
        content 
      });
      
      await message.save();
      
      // Populate sender info before sending
      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'username online')
        .populate('receiver', 'username online');
      
      // Send to receiver if online
      const receiver = await User.findById(receiverId);
      if (receiver && receiver.socketId) {
        io.to(receiver.socketId).emit('receiveMessage', populatedMessage);
      }
      
      // Also send back to sender for their own UI
      socket.emit('receiveMessage', populatedMessage);
      
    } catch (err) {
      console.error('Message send error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    try {
      if (socket.userId) {
        const user = await User.findByIdAndUpdate(
          socket.userId,
          { 
            online: false, 
            socketId: null,
            lastSeen: new Date() 
          },
          { new: true }
        );
        
        if (user) {
          io.emit('userStatus', { 
            userId: user._id, 
            online: false,
            lastSeen: user.lastSeen,
            username: user.username 
          });
        }
      }
    } catch (err) {
      console.error('Disconnection error:', err);
    }
  });
});






// API Routes

// Get all users (for chat list)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-__v -socketId');
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


app.post('/api/register', async (req, res) => {
  try {
    const { username } = req.body;
    
    // Validate username length
    if (username.length > 20) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username must be 20 characters or less' 
      });
    }
    
    // Check if username exists or create new user
    let user = await User.findOne({ username });
    
    if (!user) {
      user = new User({ username });
      await user.save();
    }
    
    // In HTTP route, we can't set socketId since there's no socket connection
    await User.findByIdAndUpdate(user._id, { 
      online: true,
      lastSeen: null 
    });
    
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// Get messages between users
app.get('/api/messages', async (req, res) => {
  try {
    const { userId, otherUserId } = req.query;
    
    if (!userId || !otherUserId) {
      return res.status(400).json({ 
        success: false,
        message: 'Both user IDs are required' 
      });
    }

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    })
    .sort({ timestamp: 1 })
    .populate('sender', 'username online')
    .populate('receiver', 'username online')
    .select('-__v');

    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));