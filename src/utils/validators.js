const Joi = require('joi');

const schemas = {
  // Auth validators
  register: Joi.object({
    name: Joi.string().required().min(2).max(50),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('agent', 'manager', 'admin')
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Client validators
  createClient: Joi.object({
    companyName: Joi.string().required().min(2).max(100),
    legalForm: Joi.string().valid('SARL', 'SA', 'SAS', 'EURL', 'EI').required(),
    siret: Joi.string().length(14).pattern(/^\d+$/).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9+\-\s]{10,}$/),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      postalCode: Joi.string().required(),
      country: Joi.string().default('France')
    }),
    contactPerson: Joi.object({
      name: Joi.string(),
      position: Joi.string(),
      phone: Joi.string(),
      email: Joi.string().email()
    })
  }),

  // Invoice validators
  createInvoice: Joi.object({
    invoiceNumber: Joi.string().required(),
    client: Joi.string().required(),
    amount: Joi.number().positive().required(),
    issueDate: Joi.date().required(),
    dueDate: Joi.date().greater(Joi.ref('issueDate')).required(),
    description: Joi.string()
  }),

  recordPayment: Joi.object({
    amount: Joi.number().positive().required(),
    paymentDate: Joi.date().required(),
    paymentMethod: Joi.string().valid('bank_transfer', 'check', 'cash', 'credit_card').required(),
    reference: Joi.string()
  }),

  // Recovery action validators
  createRecoveryAction: Joi.object({
    invoice: Joi.string().required(),
    actionType: Joi.string().valid('phone_call', 'email', 'letter', 'visit', 'negotiation').required(),
    scheduledDate: Joi.date().required(),
    description: Joi.string().required(),
    assignedTo: Joi.string().required()
  })
};

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({ 
        error: 'Validation échouée',
        details: errors 
      });
    }
    
    next();
  };
};

module.exports = { schemas, validate };