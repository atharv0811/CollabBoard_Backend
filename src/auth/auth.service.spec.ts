import { ConflictException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn() },
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: ReturnType<typeof vi.fn>; createUser: ReturnType<typeof vi.fn> };

  const dto = { name: 'John', email: 'john@example.com', password: 'plain-password' };
  const safeUser = {
    id: 1,
    name: 'John',
    email: 'john@example.com',
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    usersService = { findByEmail: vi.fn(), createUser: vi.fn() };
    service = new AuthService(usersService as unknown as UsersService);
    vi.mocked(bcrypt.hash).mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws ConflictException when the email already exists', async () => {
    usersService.findByEmail.mockResolvedValue(safeUser);

    await expect(service.registerUser(dto)).rejects.toBeInstanceOf(ConflictException);
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
    expect(usersService.createUser.mock.calls[0][0]).not.toHaveProperty('password');
    expect(result).toBe(safeUser);
    expect(result).not.toHaveProperty('passwordHash');
  });
});
