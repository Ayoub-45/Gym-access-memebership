const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { faker } = require('@faker-js/faker');
const { testPool, cleanDatabase, closeDatabase } = require('../test-utils/testSetup');

// Import routes
const authRoutes = require('../routes/authRoutes');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Mock the database pool in config
jest.mock('../config/database', () => require('../test-utils/testSetup').testPool);

// Set test environment variables
process.env.JWT_SECRET = 'test_secret_key_for_testing';

describe('Authentication API Tests', () => {
  
  // Clean database before each test
  beforeEach(async () => {
    await cleanDatabase();
  });

  // Close database connection after all tests
  afterAll(async () => {
    await closeDatabase();
  });

  // ==================== SIGNUP TESTS ====================
  
  describe('POST /api/auth/signup', () => {
    
    it('should successfully create a new gym owner account', async () => {
      const userData = {
        email: faker.internet.email(),
        password: 'SecurePass123!',
        gymName: faker.company.name()
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Check response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('message', 'Account created successfully');
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).toHaveProperty('role', 'admin');
      expect(response.body.user).toHaveProperty('gymId');
      expect(response.body.user).toHaveProperty('gymName', userData.gymName);

      // Verify token is valid JWT
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('email', userData.email);
      expect(decoded).toHaveProperty('role', 'admin');
    });

    it('should create gym and user in database', async () => {
      const userData = {
        email: faker.internet.email(),
        password: 'SecurePass123!',
        gymName: 'Test Gym'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Check gym was created
      const gymResult = await testPool.query(
        'SELECT * FROM gyms WHERE id = $1',
        [response.body.user.gymId]
      );
      expect(gymResult.rows).toHaveLength(1);
      expect(gymResult.rows[0].name).toBe(userData.gymName);
      expect(gymResult.rows[0].subscription_status).toBe('trial');

      // Check user was created
      const userResult = await testPool.query(
        'SELECT * FROM users WHERE email = $1',
        [userData.email]
      );
      expect(userResult.rows).toHaveLength(1);
      expect(userResult.rows[0].role).toBe('admin');
      expect(userResult.rows[0].gym_id).toBe(response.body.user.gymId);
    });

    it('should hash the password before storing', async () => {
      const userData = {
        email: faker.internet.email(),
        password: 'MyPlainPassword123',
        gymName: faker.company.name()
      };

      await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Check password is hashed in database
      const userResult = await testPool.query(
        'SELECT password FROM users WHERE email = $1',
        [userData.email]
      );
      
      const hashedPassword = userResult.rows[0].password;
      
      // Password should NOT be plain text
      expect(hashedPassword).not.toBe(userData.password);
      
      // Password should be a valid bcrypt hash
      expect(hashedPassword).toMatch(/^\$2[ayb]\$.{56}$/);
      
      // Verify the hash matches the original password
      const isValid = await bcrypt.compare(userData.password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should fail when email is missing', async () => {
      const userData = {
        password: 'SecurePass123!',
        gymName: 'Test Gym'
        // email is missing
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should fail when password is missing', async () => {
      const userData = {
        email: faker.internet.email(),
        gymName: 'Test Gym'
        // password is missing
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should fail when gymName is missing', async () => {
      const userData = {
        email: faker.internet.email(),
        password: 'SecurePass123!'
        // gymName is missing
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should fail when email already exists', async () => {
      const userData = {
        email: 'duplicate@test.com',
        password: 'SecurePass123!',
        gymName: 'First Gym'
      };

      // First signup should succeed
      await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Second signup with same email should fail
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          ...userData,
          gymName: 'Second Gym' // Different gym name
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Email already exists');
    });

    it('should rollback transaction if user creation fails', async () => {
      // This test verifies that if something fails during signup,
      // both gym and user creation are rolled back

      const userData = {
        email: faker.internet.email(),
        password: 'SecurePass123!',
        gymName: 'Test Gym'
      };

      // First, create a successful signup
      await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Count gyms before failed attempt
      const gymsBefore = await testPool.query('SELECT COUNT(*) FROM gyms');
      const usersBefore = await testPool.query('SELECT COUNT(*) FROM users');

      // Try to signup with same email (will fail)
      await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      // Count should remain the same (no orphaned gym created)
      const gymsAfter = await testPool.query('SELECT COUNT(*) FROM gyms');
      const usersAfter = await testPool.query('SELECT COUNT(*) FROM users');

      expect(gymsAfter.rows[0].count).toBe(gymsBefore.rows[0].count);
      expect(usersAfter.rows[0].count).toBe(usersBefore.rows[0].count);
    });
  });

  // ==================== LOGIN TESTS ====================
  
  describe('POST /api/auth/login', () => {
    
    // Helper function to create a test user
    const createTestUser = async () => {
      const userData = {
        email: faker.internet.email(),
        password: 'TestPassword123!',
        gymName: faker.company.name()
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData);

      return {
        email: userData.email,
        password: userData.password,
        userId: response.body.user.id,
        gymId: response.body.user.gymId
      };
    };

    it('should successfully login with valid credentials', async () => {
      // Create a user first
      const testUser = await createTestUser();

      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      // Check response
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.gymId).toBe(testUser.gymId);
    });

    it('should return valid JWT token on login', async () => {
      const testUser = await createTestUser();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      // Verify token
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('email', testUser.email);
      expect(decoded).toHaveProperty('role', 'admin');
      expect(decoded).toHaveProperty('gymId', testUser.gymId);
    });

    it('should fail when email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'TestPassword123!'
          // email is missing
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should fail when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // password is missing
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail with wrong password', async () => {
      const testUser = await createTestUser();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!' // Wrong password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should not reveal whether email exists in error messages', async () => {
      // Test with non-existent email
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        })
        .expect(401);

      // Test with wrong password for existing user
      const testUser = await createTestUser();
      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      // Both should return the same error message
      expect(response1.body.error).toBe(response2.body.error);
      expect(response1.body.error).toBe('Invalid credentials');
    });
  });
});