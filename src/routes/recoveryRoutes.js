const express = require('express');
const router = express.Router();
const {
  createRecoveryAction,
  getRecoveryActions,
  getRecoveryActionById,
  updateRecoveryAction,
  deleteRecoveryAction,
  completeAction,
  getRecoveryStats
} = require('../controllers/recoveryController');
const { schemas, validate } = require('../utils/validators');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');

/**
 * @swagger
 * tags:
 *   name: Recouvrement
 *   description: Gestion des actions de recouvrement
 */

// Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * @swagger
 * /api/recovery:
 *   get:
 *     summary: Liste toutes les actions de recouvrement
 *     tags: [Recouvrement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planned, completed, cancelled]
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des actions
 */
router.get('/', getRecoveryActions);

/**
 * @swagger
 * /api/recovery/stats:
 *   get:
 *     summary: Statistiques des actions de recouvrement
 *     tags: [Recouvrement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques
 */
router.get('/stats', getRecoveryStats);

/**
 * @swagger
 * /api/recovery:
 *   post:
 *     summary: Crée une nouvelle action de recouvrement
 *     tags: [Recouvrement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoice
 *               - actionType
 *               - scheduledDate
 *               - description
 *               - assignedTo
 *     responses:
 *       201:
 *         description: Action créée
 */
router.post('/', 
  validate(schemas.createRecoveryAction),
  createRecoveryAction
);

/**
 * @swagger
 * /api/recovery/{id}:
 *   get:
 *     summary: Détails d'une action
 *     tags: [Recouvrement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Détails de l'action
 */
router.get('/:id', getRecoveryActionById);

/**
 * @swagger
 * /api/recovery/{id}:
 *   put:
 *     summary: Met à jour une action
 *     tags: [Recouvrement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Action mise à jour
 */
router.put('/:id', updateRecoveryAction);

/**
 * @swagger
 * /api/recovery/{id}:
 *   delete:
 *     summary: Supprime une action
 *     tags: [Recouvrement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Action supprimée
 */
router.delete('/:id', 
  authorize('manager', 'admin'),
  deleteRecoveryAction
);

/**
 * @swagger
 * /api/recovery/{id}/complete:
 *   patch:
 *     summary: Marque une action comme terminée
 *     tags: [Recouvrement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               outcome:
 *                 type: string
 *               nextAction:
 *                 type: string
 *     responses:
 *       200:
 *         description: Action terminée
 */
router.patch('/:id/complete', completeAction);

module.exports = router;