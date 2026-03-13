const RecoveryAction = require('../models/RecoveryAction');
const Invoice = require('../models/Invoice');

const createRecoveryAction = async (req, res) => {
  try {
    const actionData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Vérifier que la facture existe et est impayée
    const invoice = await Invoice.findById(actionData.invoice);
    if (!invoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cette facture est déjà payée' });
    }

    const action = new RecoveryAction(actionData);
    await action.save();

    // Mettre à jour le statut de recouvrement de la facture
    await invoice.updateOne({
      $set: { recoveryStatus: 'first_reminder' }
    });

    res.status(201).json({
      message: 'Action de recouvrement créée avec succès',
      action
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRecoveryActions = async (req, res) => {
  try {
    const { status, assignedTo, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;

    const actions = await RecoveryAction.find(query)
      .populate('invoice', 'invoiceNumber amount dueDate')
      .populate('client', 'companyName')
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RecoveryAction.countDocuments(query);

    res.json({
      actions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const completeAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome, nextAction } = req.body;

    const action = await RecoveryAction.findById(id);
    if (!action) {
      return res.status(404).json({ error: 'Action non trouvée' });
    }

    action.status = 'completed';
    action.completedDate = new Date();
    action.outcome = outcome;
    action.nextAction = nextAction;

    await action.save();

    res.json({
      message: 'Action marquée comme terminée',
      action
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRecoveryStats = async (req, res) => {
  try {
    const stats = await RecoveryAction.aggregate([
      {
        $group: {
          _id: '$actionType',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'planned'] }, 1, 0] }
          }
        }
      }
    ]);

    const totalActions = await RecoveryAction.countDocuments();
    const overdueInvoices = await Invoice.countDocuments({ status: 'overdue' });

    res.json({
      byType: stats,
      totalActions,
      overdueInvoices,
      recoveryRate: totalActions > 0 
        ? (stats.find(s => s._id)?.completed / totalActions * 100).toFixed(2) 
        : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createRecoveryAction,
  getRecoveryActions,
  completeAction,
  getRecoveryStats
};