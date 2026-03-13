const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  remainingAmount: {
    type: Number,
    required: true,
    min: 0
  },
  issueDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue', 'litigation'],
    default: 'pending'
  },
  description: String,
  payments: [{
    amount: Number,
    paymentDate: Date,
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'check', 'cash', 'credit_card']
    },
    reference: String,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  recoveryStatus: {
    type: String,
    enum: ['none', 'first_reminder', 'second_reminder', 'final_notice', 'legal'],
    default: 'none'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Invoice', invoiceSchema);