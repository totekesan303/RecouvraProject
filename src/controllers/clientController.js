const Client = require('../models/Client');
const User = require('../models/User');

const createClient = async (req, res) => {
  try {
    const clientData = req.body;
    
    // Vérifier si le client existe déjà (par SIRET ou nom)
    const existingClient = await Client.findOne({
      $or: [
        { siret: clientData.siret },
        { companyName: clientData.companyName }
      ]
    });

    if (existingClient) {
      return res.status(400).json({ 
        error: 'Un client avec ce SIRET ou ce nom existe déjà' 
      });
    }

    const client = new Client(clientData);
    await client.save();

    res.status(201).json({
      message: 'Client créé avec succès',
      client
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getClients = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) query.status = status;
    
    // Recherche par nom ou SIRET
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { siret: { $regex: search, $options: 'i' } }
      ];
    }

    // Filtrer selon le rôle
    if (req.user.role === 'agent') {
      query.assignedAgent = req.user._id;
    }

    const clients = await Client.find(query)
      .populate('assignedAgent', 'name email')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Client.countDocuments(query);

    res.json({
      clients,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('assignedAgent', 'name email')
      .populate({
        path: 'invoices',
        match: { client: req.params.id },
        options: { sort: '-createdAt' }
      });

    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role === 'agent' && 
        client.assignedAgent?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Accès non autorisé à ce client' });
    }

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role === 'agent' && 
        client.assignedAgent?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Accès non autorisé à ce client' });
    }

    // Mise à jour
    Object.assign(client, req.body);
    await client.save();

    res.json({
      message: 'Client mis à jour avec succès',
      client
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    // Vérifier si le client a des factures
    const Invoice = require('../models/Invoice');
    const invoices = await Invoice.countDocuments({ client: req.params.id });

    if (invoices > 0) {
      return res.status(400).json({ 
        error: 'Impossible de supprimer un client avec des factures' 
      });
    }

    await client.deleteOne();

    res.json({
      message: 'Client supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const assignAgent = async (req, res) => {
  try {
    const { agentId } = req.body;
    
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    const agent = await User.findById(agentId);
    if (!agent || agent.role !== 'agent') {
      return res.status(400).json({ error: 'Agent invalide' });
    }

    client.assignedAgent = agentId;
    await client.save();

    res.json({
      message: 'Agent assigné avec succès',
      client
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  assignAgent
};