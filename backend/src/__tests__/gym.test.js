const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { testPool, cleanDatabase, closeDatabase } = require('../test-utils/testSetup');
const gymRoutes = require('../routes/gym');
const authRoutes = require('../routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/api/gym', gymRoutes);
app.use('/api/auth', authRoutes);

process.env.JWT_SECRET = 'test_secret_key_for_testing';
jest.mock('../config/database', () => require('../test-utils/testSetup').testPool);

describe('Gym API Tests', () => {
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

  describe('GET /api/gym/profile', () => {
    it('should return gym profile for admin', async () => {
      const res = await request(app)
        .get('/api/gym/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.gym.name).toBe('Test Gym');
    });
  });

  describe('PUT /api/gym/profile', () => {
    it('should update gym profile', async () => {
      const res = await request(app)
        .put('/api/gym/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Gym' })
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail without auth', async () => {
      await request(app).put('/api/gym/profile').send({}).expect(401);
    });
  });

  describe('GET /api/gym/check-name', () => {
    it('should check gym name availability', async () => {
      const res = await request(app)
        .get('/api/gym/check-name?name=NewGym')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.available).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should 404 if gym deleted', async () => {
      await testPool.query('DELETE FROM gyms WHERE id = $1', [gymId]);
      await request(app)
        .get('/api/gym/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should 403 non-admin update', async () => {
      const staffToken = jwt.sign({ gymId, role: 'staff' }, process.env.JWT_SECRET);
      await request(app)
        .put('/api/gym/profile')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({})
        .expect(403);
    });
    it('should 400 missing gym name update', async () => {
      await request(app)
        .put('/api/gym/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ address: 'test' })  // NO name!
        .expect(400);
    });

    it('should handle empty old logo', async () => {
      await testPool.query('UPDATE gyms SET logo = NULL WHERE id = $1', [gymId]);
      await request(app)
        .put('/api/gym/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' })
        .expect(200);
    });

    it('should 400 missing check-name param', async () => {
      await request(app)
        .get('/api/gym/check-name')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should cover update 404 path', async () => {
      await testPool.query('DELETE FROM gyms WHERE id = $1', [gymId]);
      await request(app)
        .put('/api/gym/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('should test check-name existing name', async () => {
        // Create a second gym with a different name
        const secondGymRes = await request(app).post('/api/auth/signup').send({
            email: 'admin2@test.com',
            password: 'Test123!',
            gymName: 'Second Gym'
        });
        const secondAdminToken = secondGymRes.body.token;

        // Now check if "Test Gym" (first gym's name) is available from second gym's perspective
        const res = await request(app)
            .get('/api/gym/check-name?name=Test Gym')
            .set('Authorization', `Bearer ${secondAdminToken}`)
            .expect(200);
        
        expect(res.body.available).toBe(false); // Should be false because Test Gym exists
    });


});
});
