const User = require('../models/User');
const bcrypt = require('bcryptjs');

const getUsers = async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 10 } = req.query;
    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'agent'
    });

    await user.save();

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Ne pas permettre de changer son propre rôle si on est admin
    if (req.user._id.toString() === req.params.id && req.body.role) {
      return res.status(400).json({ 
        error: 'Vous ne pouvez pas modifier votre propre rôle' 
      });
    }

    // Mise à jour des champs
    const updatableFields = ['name', 'email', 'role', 'isActive'];
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    // Mise à jour du mot de passe si fourni
    if (req.body.password) {
      user.password = await bcrypt.hash(req.body.password, 10);
    }

    await user.save();

    res.json({
      message: 'Utilisateur mis à jour avec succès',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Empêcher la suppression de son propre compte
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ 
        error: 'Vous ne pouvez pas supprimer votre propre compte' 
      });
    }

    // Vérifier si l'utilisateur a des clients assignés
    const Client = require('../models/Client');
    const assignedClients = await Client.countDocuments({ assignedAgent: req.params.id });

    if (assignedClients > 0) {
      return res.status(400).json({ 
        error: 'Impossible de supprimer un agent avec des clients assignés' 
      });
    }

    await user.deleteOne();

    res.json({
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Empêcher de désactiver son propre compte
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ 
        error: 'Vous ne pouvez pas modifier le statut de votre propre compte' 
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `Utilisateur ${user.isActive ? 'activé' : 'désactivé'} avec succès`,
      isActive: user.isActive
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus
};