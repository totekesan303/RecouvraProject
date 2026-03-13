const Invoice = require('../models/Invoice');
const Client = require('../models/Client');

// Créer une facture
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

// Liste toutes les factures
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

// Récupérer une facture par ID
const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client')
      .populate('payments.recordedBy', 'name');

    if (!invoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mettre à jour une facture
const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!invoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    res.json({
      message: 'Facture mise à jour avec succès',
      invoice
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Supprimer une facture
const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Vérifier s'il y a des paiements
    if (invoice.payments && invoice.payments.length > 0) {
      return res.status(400).json({ 
        error: 'Impossible de supprimer une facture avec des paiements' 
      });
    }

    await invoice.deleteOne();

    res.json({
      message: 'Facture supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Enregistrer un paiement
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

// Statistiques des factures
const getInvoiceStats = async (req, res) => {
  try {
    const stats = await Invoice.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalRemaining: { $sum: '$remainingAmount' }
        }
      }
    ]);

    const totalInvoices = await Invoice.countDocuments();
    const totalAmount = await Invoice.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      byStatus: stats,
      total: totalInvoices,
      totalAmount: totalAmount[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// EXPORTER TOUTES LES FONCTIONS
module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  recordPayment,
  getInvoiceStats
};