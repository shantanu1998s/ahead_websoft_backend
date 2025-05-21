const Payment = require('../model/Payment');
const UpiSetting = require('../model/UpiSetting');
const nodemailer = require('../config/mail');

// Get all transactions
exports.getAllTransactions = async (req, res) => {
  try {
     console.log("all tranction is calling")
    const transactions = await Payment.find().sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Payment.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        message: 'Transaction not found' 
      });
    }

    res.json({
      success: true,
      data: transaction
    });

  } catch (err) {
    console.error('Error fetching transaction:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// Update transaction status
exports.updateTransactionStatus = async (req, res) => {
  try {
    const { transactionId, status } = req.body;
    console.log("tranctions is calling")
    const transaction = await Payment.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    transaction.status = status;
    await transaction.save();
    
    // Send email notification
    const userEmail = 'user@example.com'; // Get from user model in real app
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: `Payment ${status}`,
      text: `Your payment of ${transaction.amount} has been ${status}.`
    };
    
    await nodemailer.sendMail(mailOptions);
    
    res.json({ message: `Transaction ${status}` });
    
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// Set UPI ID
exports.setUpiId = async (req, res) => {
  try {
    const { upiId } = req.body;
    
    // Deactivate all other UPI IDs
    await UpiSetting.updateMany({}, { isActive: false });
    
    // Check if UPI ID already exists
    let upiSetting = await UpiSetting.findOne({ upiId });
    
    if (!upiSetting) {
      upiSetting = new UpiSetting({ upiId });
    } else {
      upiSetting.isActive = true;
    }
    
    await upiSetting.save();
    
    res.json({ message: 'UPI ID updated successfully' });
    
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// Get current UPI ID
exports.getUpiId = async (req, res) => {
  try {
    const upiSetting = await UpiSetting.findOne({ isActive: true });
    res.json({ upiId: upiSetting ? upiSetting.upiId : null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// Get single transaction
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Payment.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};