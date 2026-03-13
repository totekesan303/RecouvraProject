const express = require('express');
const router = express.Router();
const {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  assignAgent
} = require('../controllers/clientController');
const { schemas, validate } = require('../utils/validators');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');

/**
 * @swagger
 * tags:
 *   name: Clients
 *   description: Gestion des clients
 */

// Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * @swagger
 * /api/clients:
 *   get:
 *     summary: Liste tous les clients
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, blocked]
 *         description: Filtrer par statut
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Rechercher par nom ou SIRET
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre d'éléments par page
 *     responses:
 *       200:
 *         description: Liste des clients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clients:
 *                   type: array
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 total:
 *                   type: integer
 */
router.get('/', getClients);

/**
 * @swagger
 * /api/clients:
 *   post:
 *     summary: Crée un nouveau client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *               - legalForm
 *               - siret
 *               - email
 *             properties:
 *               companyName:
 *                 type: string
 *                 example: "Tech Solutions SARL"
 *               legalForm:
 *                 type: string
 *                 enum: [SARL, SA, SAS, EURL, EI]
 *                 example: "SARL"
 *               siret:
 *                 type: string
 *                 pattern: '^\d{14}$'
 *                 example: "12345678901234"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "contact@techsolutions.fr"
 *               phone:
 *                 type: string
 *                 example: "0123456789"
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   postalCode:
 *                     type: string
 *                   country:
 *                     type: string
 *                     default: "France"
 *               contactPerson:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   position:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   email:
 *                     type: string
 *     responses:
 *       201:
 *         description: Client créé avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès non autorisé
 */
router.post('/', 
  authorize('manager', 'admin'),
  validate(schemas.createClient), 
  createClient
);

/**
 * @swagger
 * /api/clients/{id}:
 *   get:
 *     summary: Récupère un client par son ID
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du client
 *     responses:
 *       200:
 *         description: Détails du client
 *       404:
 *         description: Client non trouvé
 */
router.get('/:id', getClientById);

/**
 * @swagger
 * /api/clients/{id}:
 *   put:
 *     summary: Met à jour un client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *               legalForm:
 *                 type: string
 *                 enum: [SARL, SA, SAS, EURL, EI]
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: object
 *               contactPerson:
 *                 type: object
 *               status:
 *                 type: string
 *                 enum: [active, inactive, blocked]
 *     responses:
 *       200:
 *         description: Client mis à jour
 *       403:
 *         description: Accès non autorisé
 *       404:
 *         description: Client non trouvé
 */
router.put('/:id', 
  authorize('manager', 'admin'),
  updateClient
);

/**
 * @swagger
 * /api/clients/{id}:
 *   delete:
 *     summary: Supprime un client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client supprimé
 *       400:
 *         description: Impossible de supprimer (client avec factures)
 *       403:
 *         description: Accès non autorisé
 *       404:
 *         description: Client non trouvé
 */
router.delete('/:id', 
  authorize('admin'),
  deleteClient
);

/**
 * @swagger
 * /api/clients/{id}/assign-agent:
 *   post:
 *     summary: Assigne un agent à un client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentId
 *             properties:
 *               agentId:
 *                 type: string
 *                 description: ID de l'agent à assigner
 *     responses:
 *       200:
 *         description: Agent assigné avec succès
 *       400:
 *         description: Agent invalide
 *       403:
 *         description: Accès non autorisé
 *       404:
 *         description: Client non trouvé
 */
router.post('/:id/assign-agent', 
  authorize('manager', 'admin'),
  assignAgent
);

module.exports = router;