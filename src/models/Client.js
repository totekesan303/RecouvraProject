const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    unique: true
  },
  legalForm: {
    type: String,
    enum: ['SARL', 'SA', 'SAS', 'EURL', 'EI'],
    required: true
  },
  siret: {
    type: String,
    required: true,
    unique: true,
    match: /^\d{14}$/
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  phone: String,
  address: {
    street: String,
    city: String,
    postalCode: String,
    country: {
      type: String,
      default: 'France'
    }
  },
  contactPerson: {
    name: String,
    position: String,
    phone: String,
    email: String
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Client', clientSchema);