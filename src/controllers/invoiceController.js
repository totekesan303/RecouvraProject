const Invoice = require('../models/Invoice');
const Client = require('../models/Client');

const createInvoice = async (req, res) => {
  try {
    const invoiceData = {
      ...req.body,
      remainingAmount: req.body.amount
    };

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    res.status(201).json({
      message: 'Facture créée avec succès',
      invoice
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getInvoices = async (req, res) => {
  try {
    const { status, client, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (client) query.client = client;

    // Filtrer selon le rôle
    if (req.user.role === 'agent') {
      const clients = await Client.find({ assignedAgent: req.user._id }).select('_id');
      query.client = { $in: clients.map(c => c._id) };
    }

    const invoices = await Invoice.find(query)
      .populate('client', 'companyName siret')
      .populate('payments.recordedBy', 'name')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Invoice.countDocuments(query);

    res.json({
      invoices,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentData = {
      ...req.body,
      recordedBy: req.user._id
    };

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Vérifier que le montant du paiement ne dépasse pas le montant restant
    if (paymentData.amount > invoice.remainingAmount) {
      return res.status(400).json({ 
        error: 'Le montant du paiement dépasse le montant restant dû' 
      });
    }

    // Ajouter le paiement
    invoice.payments.push(paymentData);
    invoice.remainingAmount -= paymentData.amount;

    // Mettre à jour le statut
    if (invoice.remainingAmount === 0) {
      invoice.status = 'paid';
    } else if (invoice.remainingAmount < invoice.amount) {
      invoice.status = 'partial';
    }

    await invoice.save();

    res.json({
      message: 'Paiement enregistré avec succès',
      invoice
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateOverdueStatus = async () => {
  // Fonction utilitaire à appeler périodiquement
  const today = new Date();
  await Invoice.updateMany(
    {
      dueDate: { $lt: today },
      status: { $in: ['pending', 'partial'] }
    },
    {
      status: 'overdue'
    }
  );
};

module.exports = {
  createInvoice,
  getInvoices,
  recordPayment
};