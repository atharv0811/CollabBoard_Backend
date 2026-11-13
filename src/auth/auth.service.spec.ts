import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: ReturnType<typeof vi.fn>;
    findByEmailWithPasswordHash: ReturnType<typeof vi.fn>;
    createUser: ReturnType<typeof vi.fn>;
  };
  let jwtService: { sign: ReturnType<typeof vi.fn> };

  const dto = {
    name: 'John',
    email: 'john@example.com',
    password: 'plain-password',
  };
  const safeUser = {
    id: 1,
    name: 'John',
    email: 'john@example.com',
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    usersService = {
      findByEmail: vi.fn(),
      findByEmailWithPasswordHash: vi.fn(),
      createUser: vi.fn(),
    };
    jwtService = { sign: vi.fn() };
    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );
    vi.mocked(bcrypt.hash).mockReset();
    vi.mocked(bcrypt.compare).mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerUser', () => {
    it('throws ConflictException when the email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(safeUser);

      await expect(service.registerUser(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(usersService.createUser).not.toHaveBeenCalled();
    });

    it('hashes the password and creates the user with passwordHash only', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
      usersService.createUser.mockResolvedValue(safeUser);

      const result = await service.registerUser(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('plain-password', 10);
      expect(usersService.createUser).toHaveBeenCalledWith({
        name: dto.name,
        email: dto.email,
        passwordHash: 'hashed',
      });
      expect(usersService.createUser.mock.calls[0][0]).not.toHaveProperty(
        'password',
      );
      expect(result).toBe(safeUser);
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('loginUser', () => {
    const loginDto = { email: 'john@example.com', password: 'plain-password' };
    const userWithHash = { ...safeUser, passwordHash: 'stored-hash' };

    it('returns a token and a user without passwordHash on success', async () => {
      usersService.findByEmailWithPasswordHash.mockResolvedValue(userWithHash);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.loginUser(loginDto);

      expect(usersService.findByEmailWithPasswordHash).toHaveBeenCalledWith(
        loginDto.email,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'plain-password',
        'stored-hash',
      );
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 1 });
      expect(result).toEqual({ token: 'jwt-token', user: safeUser });
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(result)).not.toContain('stored-hash');
    });

    it('throws 401 "Invalid credentials" for an unknown email', async () => {
      usersService.findByEmailWithPasswordHash.mockResolvedValue(null);

      const promise = service.loginUser(loginDto);

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(promise).rejects.toMatchObject({
        message: 'Invalid credentials',
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('throws the same 401 error for an incorrect password', async () => {
      usersService.findByEmailWithPasswordHash.mockResolvedValue(userWithHash);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const promise = service.loginUser(loginDto);

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(promise).rejects.toMatchObject({
        message: 'Invalid credentials',
      });
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });
});
