import request from 'supertest';
import app from '../../src/app';
import { faker } from '../helpers/faker.helper';
import Token from '../../src/models/token.model';

describe('Auth API - Integration Tests', () => {
  describe('POST /v1/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'Password123!',
        name: faker.person.fullName(),
      };

      const res = await request(app).post('/api/v1/auth/register').send(userData).expect(201);

      expect(res.body.user).toMatchObject({
        email: userData.email,
        name: userData.name,
        role: 'user',
      });
      expect(res.body.tokens).toBeDefined();
      expect(res.body.tokens.access).toBeDefined();
      expect(res.body.tokens.refresh).toBeDefined();
      expect(res.body.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should return 400 if email is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should return 400 if password is too weak', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: faker.internet.email().toLowerCase(),
          password: '123', // Too weak
          name: 'Test User',
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should return 400 if email already exists', async () => {
      const email = faker.internet.email().toLowerCase();

      await request(app).post('/api/v1/auth/register').send({ email, password: 'Password123!', name: 'User 1' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email, password: 'Password123!', name: 'User 2' })
        .expect(400);

      expect(res.body.message).toContain('already taken');
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: faker.internet.email().toLowerCase(),
          password: 'Password123!',
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });
  });

  describe('POST /v1/auth/login', () => {
    const userCredentials = {
      email: '',
      password: 'Password123!',
      name: 'Test User',
    };

    beforeEach(async () => {
      userCredentials.email = faker.internet.email().toLowerCase();
      await request(app).post('/api/v1/auth/register').send(userCredentials);
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        })
        .expect(200);

      expect(res.body.user.email).toBe(userCredentials.email);
      expect(res.body.tokens).toBeDefined();
      expect(res.body.tokens.access).toBeDefined();
      expect(res.body.tokens.refresh).toBeDefined();
    });

    it('should return 401 with incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userCredentials.email,
          password: 'WrongPassword',
        })
        .expect(401);

      expect(res.body.message).toContain('Incorrect');
    });

    it('should return 401 with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(res.body.message).toContain('Incorrect');
    });

    it('should return 400 if email is missing', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: 'Password123!',
        })
        .expect(400);
    });

    it('should return 400 if password is missing', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userCredentials.email,
        })
        .expect(400);
    });
  });

  describe('POST /v1/auth/refresh-tokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Register and login
      const registerRes = await request(app).post('/api/v1/auth/register').send({
        email: faker.internet.email().toLowerCase(),
        password: 'Password123!',
        name: 'Test User',
      });

      const refreshToken = registerRes.body.tokens.refresh.token;

      // Refresh tokens
      const res = await request(app).post('/api/v1/auth/refresh-tokens').send({ refreshToken }).expect(200);

      expect(res.body.access).toBeDefined();
      expect(res.body.refresh).toBeDefined();
      expect(res.body.access.token).toBeDefined();
      expect(res.body.refresh.token).toBeDefined();
    });

    it('should return 401 with invalid refresh token', async () => {
      await request(app).post('/api/v1/auth/refresh-tokens').send({ refreshToken: 'invalid-token' }).expect(401);
    });

    it('should return 400 if refresh token is missing', async () => {
      await request(app).post('/api/v1/auth/refresh-tokens').send({}).expect(400);
    });
  });

  describe('POST /v1/auth/logout', () => {
    it('should logout successfully with valid refresh token', async () => {
      // Register and login
      const registerRes = await request(app).post('/api/v1/auth/register').send({
        email: faker.internet.email().toLowerCase(),
        password: 'Password123!',
        name: 'Test User',
      });

      const refreshToken = registerRes.body.tokens.refresh.token;

      // Logout
      await request(app).post('/api/v1/auth/logout').send({ refreshToken }).expect(204);

      // Verify token is deleted
      const tokenDoc = await Token.findOne({ token: refreshToken });
      expect(tokenDoc).toBeNull();
    });

    it('should return 404 with invalid refresh token', async () => {
      await request(app).post('/api/v1/auth/logout').send({ refreshToken: 'invalid-token' }).expect(404);
    });
  });

  describe('Authentication flow', () => {
    it('should complete full auth flow: register -> login -> refresh -> logout', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'Password123!',
        name: 'Test User',
      };

      // 1. Register
      const registerRes = await request(app).post('/api/v1/auth/register').send(userData).expect(201);

      expect(registerRes.body.user.email).toBe(userData.email);

      // 2. Login
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(loginRes.body.tokens).toBeDefined();

      // 3. Refresh tokens
      const refreshToken = loginRes.body.tokens.refresh.token;
      const refreshRes = await request(app).post('/api/v1/auth/refresh-tokens').send({ refreshToken }).expect(200);

      expect(refreshRes.body.access.token).toBeDefined();

      // 4. Logout
      const newRefreshToken = refreshRes.body.refresh.token;
      await request(app).post('/api/v1/auth/logout').send({ refreshToken: newRefreshToken }).expect(204);
    });
  });
});
