const mongoose = require('mongoose');

const recoveryActionSchema = new mongoose.Schema({
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  actionType: {
    type: String,
    enum: ['phone_call', 'email', 'letter', 'visit', 'negotiation'],
    required: true
  },
  status: {
    type: String,
    enum: ['planned', 'completed', 'cancelled'],
    default: 'planned'
  },
  scheduledDate: Date,
  completedDate: Date,
  description: String,
  outcome: String,
  nextAction: String,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('RecoveryAction', recoveryActionSchema);