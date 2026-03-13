const request = require('supertest');
const app = require('../../src/app');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const Client = require('../../src/models/Client');
const Invoice = require('../../src/models/Invoice');
const jwt = require('jsonwebtoken');

describe('Tests d\'intégration API', () => {
  let adminToken;
  let agentToken;
  let testClient;
  let testInvoice;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI_TEST);
    
    // Créer un admin
    const admin = await User.create({
      name: 'Admin Test',
      email: 'admin@test.com',
      password: await require('bcryptjs').hash('password123', 10),
      role: 'admin'
    });
    
    // Créer un agent
    const agent = await User.create({
      name: 'Agent Test',
      email: 'agent@test.com',
      password: await require('bcryptjs').hash('password123', 10),
      role: 'agent'
    });

    adminToken = jwt.sign({ userId: admin._id }, process.env.JWT_SECRET);
    agentToken = jwt.sign({ userId: agent._id }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Client.deleteMany({});
    await Invoice.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Flux complet: Client → Facture → Paiement → Recouvrement', () => {
    test('Devrait créer un client, une facture, enregistrer un paiement et créer une action de recouvrement', async () => {
      // 1. Créer un client
      const clientRes = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyName: 'Entreprise Test',
          legalForm: 'SARL',
          siret: '12345678901234',
          email: 'contact@test.com',
          address: {
            street: '123 Rue Test',
            city: 'Paris',
            postalCode: '75001'
          }
        });

      expect(clientRes.statusCode).toBe(201);
      testClient = clientRes.body.client;

      // 2. Créer une facture
      const invoiceRes = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoiceNumber: 'FAC-2024-001',
          client: testClient._id,
          amount: 1000,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          description: 'Facture test'
        });

      expect(invoiceRes.statusCode).toBe(201);
      testInvoice = invoiceRes.body.invoice;

      // 3. Enregistrer un paiement partiel
      const paymentRes = await request(app)
        .post(`/api/invoices/${testInvoice._id}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 500,
          paymentDate: new Date(),
          paymentMethod: 'bank_transfer',
          reference: 'VIR-001'
        });

      expect(paymentRes.statusCode).toBe(200);
      expect(paymentRes.body.invoice.status).toBe('partial');

      // 4. Créer une action de recouvrement
      const recoveryRes = await request(app)
        .post('/api/recovery')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoice: testInvoice._id,
          actionType: 'phone_call',
          scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          description: 'Appel de relance',
          assignedTo: (await User.findOne({ role: 'agent' }))._id
        });

      expect(recoveryRes.statusCode).toBe(201);
    });
  });

  describe('Tests de permissions', () => {
    test('Un agent ne peut pas créer de client sans être admin/manager', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          companyName: 'Test SARL',
          legalForm: 'SARL',
          siret: '98765432109876',
          email: 'test@sarl.fr'
        });

      expect(res.statusCode).toBe(403);
    });

    test('Un agent peut voir ses clients assignés', async () => {
      const res = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.clients)).toBe(true);
    });
  });

  describe('Tests de validation', () => {
    test('Ne devrait pas créer un client avec un SIRET invalide', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyName: 'Test SARL',
          legalForm: 'SARL',
          siret: '123', // SIRET trop court
          email: 'test@sarl.fr'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Validation échouée');
    });

    test('Ne devrait pas créer une facture avec une date d\'échéance antérieure', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoiceNumber: 'FAC-2024-002',
          client: testClient._id,
          amount: 1000,
          issueDate: new Date(),
          dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Date passée
          description: 'Facture test'
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Tests des statistiques', () => {
    test('Devrait retourner les statistiques de recouvrement', async () => {
      const res = await request(app)
        .get('/api/recovery/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('byType');
      expect(res.body).toHaveProperty('totalActions');
      expect(res.body).toHaveProperty('recoveryRate');
    });
  });
});