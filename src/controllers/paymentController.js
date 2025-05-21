const Payment = require('../model/Payment.js');
const UpiSetting = require('../model/UpiSetting');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

// Generate payment QR code
exports.initiatePayment = async (req, res) => {
  console.log("payment intitiat calling")
  try {
    const { amount } = req.body;
    console.log("body",req.body)
    // Get active UPI ID
    const upiSetting = await UpiSetting.findOne({ isActive: true });
    if (!upiSetting) {
      return res.status(400).json({ message: 'No UPI ID configured' });
    }
    
    const upiId = upiSetting.upiId;
    const paymentId = uuidv4();
    
    // Generate UPI payment link
    const upiLink = `upi://pay?pa=${upiId}&pn=Recipient&am=${amount}&cu=INR&tn=Payment for services`;
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(upiLink);
    
    // Save to database
    const payment = new Payment({
      amount,
      upiId,
      qrCode,
      //userId: req.user.id  Assuming you have user authentication
    });
    
    await payment.save();
    
    res.json({
      paymentId: payment._id,
      amount,
      upiId,
      qrCode
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// Submit transaction ID
exports.submitTransaction = async (req, res) => {
  try {
    const { paymentId, transactionId } = req.body;
    
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    payment.transactionId = transactionId;
    await payment.save();
    
    res.json({ message: 'Transaction submitted. Payment under review.' });
    
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