const request = require('supertest');
const express = require('express');  // <-- ADD THIS LINE
const { testPool, cleanDatabase, closeDatabase } = require('../test-utils/testSetup');
const memberRoutes = require('../routes/memberRoutes');
const authRoutes = require('../routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/api/members', memberRoutes);
app.use('/api/auth', authRoutes);

process.env.JWT_SECRET = 'test_secret_key_for_testing';
jest.mock('../config/database', () => require('../test-utils/testSetup').testPool);

describe('Members API Tests', () => {
  let adminToken, gymId;

  beforeEach(async () => {
    await cleanDatabase();
    const signupRes = await request(app).post('/api/auth/signup').send({
      email: 'admin@test.com',
      password: 'Test123!',
      gymName: 'Test Gym'
    });
    adminToken = signupRes.body.token;
    gymId = signupRes.body.user.gymId;
  });

  afterAll(async () => closeDatabase());

  describe('POST /api/members', () => {
    it('should add new member', async () => {
      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'John Doe',
          membership_start: '2026-01-01',
          membership_end: '2026-12-31'
        })
        .expect(201);
      expect(res.body.success).toBe(true);
      expect(res.body.member.name).toBe('John Doe');
      expect(res.body.member.status).toBe('ACTIVE');
    });

    it('should fail missing fields', async () => {
      await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'John' })  // missing dates
        .expect(400);
    });
  });

  describe('GET /api/members', () => {
    it('should list members', async () => {
      await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Member', membership_start: '2026-01-01', membership_end: '2026-12-31' });

      const res = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.members.length).toBe(1);
    });
  });

  describe('GET /api/members/stats', () => {
    it('should return stats', async () => {
      await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          name: 'Active Member', 
          membership_start: '2026-01-01', 
          membership_end: '2027-01-01' 
        });

      const res = await request(app)
        .get('/api/members/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats.total_members).toBe(1);
      expect(res.body.stats.active_members).toBe(1);
    });
  });

  describe('PATCH /api/members/:id', () => {
    it('should update member', async () => {
      const addRes = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Old Name', membership_start: '2026-01-01', membership_end: '2026-12-31' });

      const memberId = addRes.body.member.id;

      const res = await request(app)
        .patch(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name' })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.member.name).toBe('New Name');
    });
  });

  describe('PATCH /api/members/:id/deactivate', () => {
    it('should deactivate member', async () => {
      const addRes = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Active', membership_start: '2026-01-01', membership_end: '2026-12-31' });

      await request(app)
        .patch(`/api/members/${addRes.body.member.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
