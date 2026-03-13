const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const mongoose = require('mongoose');

describe('Authentification', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI_TEST);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('devrait créer un nouvel utilisateur', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: 'password123',
          role: 'agent'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('test@test.com');
    });

    it('ne devrait pas créer un utilisateur avec un email existant', async () => {
      // Créer un premier utilisateur
      await User.create({
        name: 'Test User',
        email: 'test@test.com',
        password: 'hashedpassword'
      });

      // Tenter d'en créer un deuxième avec le même email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User 2',
          email: 'test@test.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('devrait connecter un utilisateur existant', async () => {
      // Créer un utilisateur
      const user = new User({
        name: 'Test User',
        email: 'test@test.com',
        password: await require('bcryptjs').hash('password123', 10)
      });
      await user.save();

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });
  });
});