const request = require('supertest');
const express = require('express');
const authMiddleware = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
process.env.JWT_SECRET = 'test_secret_key_for_testing';  // Match app

describe('Middleware Tests', () => {
  let validToken;

  beforeAll(() => {
    validToken = jwt.sign({ gymId: 'test-id', role: 'admin' }, process.env.JWT_SECRET);
  });

  describe('requireAuth', () => {
    it('should pass valid token', (done) => {
      app.get('/test-auth', authMiddleware.requireAuth, (req, res) => {
        expect(req.user).toBeDefined();
        expect(req.user.gymId).toBe('test-id');
        res.status(200).json({ ok: true });
      });
      request(app).get('/test-auth').set('Authorization', `Bearer ${validToken}`).end((err, res) => {
        expect(res.status).toBe(200);
        done(err);
      });
    });

    it('should reject no token', (done) => {
      app.get('/no-token', authMiddleware.requireAuth, (req, res) => res.json({}));
      request(app).get('/no-token').end((err, res) => {
        expect(res.status).toBe(401);
        done(err);
      });
    });

    it('should reject invalid token', (done) => {
      app.get('/invalid', authMiddleware.requireAuth, (req, res) => res.json({}));
      request(app).get('/invalid').set('Authorization', 'Bearer invalid.jwt').end((err, res) => {
        expect(res.status).toBe(401);
        done(err);
      });
    });
  });

  describe('requireRole', () => {
    it('should allow admin role', (done) => {
      app.get('/admin-only', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), (req, res) => {
        res.status(200).json({ ok: true });
      });
      request(app).get('/admin-only').set('Authorization', `Bearer ${validToken}`).end((err, res) => {
        expect(res.status).toBe(200);
        done(err);
      });
    });

    it('should reject staff for admin role', (done) => {
      const staffToken = jwt.sign({ gymId: 'test', role: 'staff' }, process.env.JWT_SECRET);
      app.get('/admin-only', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), (req, res) => res.json({}));
      request(app).get('/admin-only').set('Authorization', `Bearer ${staffToken}`).end((err, res) => {
        expect(res.status).toBe(403);
        done(err);
      });
    });

    it('should allow multiple roles (admin,staff)', (done) => {
      const staffToken = jwt.sign({ gymId: 'test', role: 'staff' }, process.env.JWT_SECRET);
      app.get('/staff-ok', authMiddleware.requireAuth, authMiddleware.requireRole('admin', 'staff'), (req, res) => {
        res.status(200).json({ ok: true });
      });
      request(app).get('/staff-ok').set('Authorization', `Bearer ${staffToken}`).end((err, res) => {
        expect(res.status).toBe(200);
        done(err);
      });
    });
  });
});
