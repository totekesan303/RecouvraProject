const express = require('express');
const router = express.Router();
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  recordPayment,
  getInvoiceStats
} = require('../controllers/invoiceController');
const { schemas, validate } = require('../utils/validators');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');

/**
 * @swagger
 * tags:
 *   name: Factures
 *   description: Gestion des factures
 */

// Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     summary: Liste toutes les factures
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, partial, paid, overdue, litigation]
 *       - in: query
 *         name: client
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
 *         description: Liste des factures
 */
router.get('/', getInvoices);

/**
 * @swagger
 * /api/invoices/stats:
 *   get:
 *     summary: Statistiques des factures
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques
 */
router.get('/stats', getInvoiceStats);

/**
 * @swagger
 * /api/invoices:
 *   post:
 *     summary: Crée une nouvelle facture
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceNumber
 *               - client
 *               - amount
 *               - issueDate
 *               - dueDate
 *     responses:
 *       201:
 *         description: Facture créée
 */
router.post('/', 
  authorize('manager', 'admin'),
  validate(schemas.createInvoice), 
  createInvoice
);

/**
 * @swagger
 * /api/invoices/{id}:
 *   get:
 *     summary: Détails d'une facture
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Détails de la facture
 */
router.get('/:id', getInvoiceById);

/**
 * @swagger
 * /api/invoices/{id}:
 *   put:
 *     summary: Met à jour une facture
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Facture mise à jour
 */
router.put('/:id', 
  authorize('manager', 'admin'),
  updateInvoice
);

/**
 * @swagger
 * /api/invoices/{id}:
 *   delete:
 *     summary: Supprime une facture
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Facture supprimée
 */
router.delete('/:id', 
  authorize('admin'),
  deleteInvoice
);

/**
 * @swagger
 * /api/invoices/{id}/payments:
 *   post:
 *     summary: Enregistre un paiement
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - paymentDate
 *               - paymentMethod
 *     responses:
 *       200:
 *         description: Paiement enregistré
 */
router.post('/:id/payments', 
  validate(schemas.recordPayment),
  recordPayment
);

module.exports = router;