import authService from '../../../src/services/auth.service';
import userService from '../../../src/services/user.service';
import { faker } from '../../helpers/faker.helper';
import bcrypt from 'bcryptjs';

describe('Auth Service - Unit Tests', () => {
  describe('loginUserWithEmailAndPassword', () => {
    it('should login with correct credentials', async () => {
      const password = 'Password123!';
      const email = faker.internet.email().toLowerCase();
      const userData = {
        email,
        password,
        name: faker.person.fullName(),
      };

      await userService.createUser(userData);

      const user = await authService.loginUserWithEmailAndPassword(email, password);

      expect(user).toBeDefined();
      expect(user.email).toBe(email);
    });

    it('should throw error with incorrect password', async () => {
      const email = faker.internet.email().toLowerCase();
      const password = 'Password123!';
      await userService.createUser({
        email,
        password,
        name: faker.person.fullName(),
      });

      await expect(authService.loginUserWithEmailAndPassword(email, 'WrongPassword')).rejects.toThrow(
        'Incorrect email or password'
      );
    });

    it('should throw error with non-existent email', async () => {
      await expect(
        authService.loginUserWithEmailAndPassword('nonexistent@example.com', 'Password123!')
      ).rejects.toThrow('Incorrect email or password');
    });
  });

  describe('User creation and authentication', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'Password123!',
        name: faker.person.fullName(),
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.role).toBe('user');
    });

    it('should hash password before saving', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'Password123!',
        name: faker.person.fullName(),
      };

      const user = await userService.createUser(userData);

      expect(user.password).not.toBe(userData.password);
      const isMatch = await bcrypt.compare(userData.password, user.password);
      expect(isMatch).toBe(true);
    });

    it('should throw error if email already exists', async () => {
      const email = faker.internet.email().toLowerCase();
      await userService.createUser({
        email,
        password: 'Password123!',
        name: faker.person.fullName(),
      });

      await expect(
        userService.createUser({
          email,
          password: 'Password123!',
          name: faker.person.fullName(),
        })
      ).rejects.toThrow('Email already taken');
    });
  });

  describe('Password matching', () => {
    it('should correctly validate matching password', async () => {
      const password = 'TestPassword123!';
      const user = await userService.createUser({
        email: faker.internet.email().toLowerCase(),
        password,
        name: faker.person.fullName(),
      });

      const isMatch = await user.isPasswordMatch(password);
      expect(isMatch).toBe(true);
    });

    it('should reject non-matching password', async () => {
      const password = 'TestPassword123!';
      const user = await userService.createUser({
        email: faker.internet.email().toLowerCase(),
        password,
        name: faker.person.fullName(),
      });

      const isMatch = await user.isPasswordMatch('WrongPassword');
      expect(isMatch).toBe(false);
    });
  });
});
