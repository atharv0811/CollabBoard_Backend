import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: { user: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> } };

  const safeSelect = {
    id: true,
    name: true,
    email: true,
    avatarUrl: true,
    createdAt: true,
    updatedAt: true,
  };

  beforeEach(() => {
    prisma = { user: { create: vi.fn(), findUnique: vi.fn() } };
    service = new UsersService(prisma as unknown as PrismaService);
  });

  describe('createUser', () => {
    const data = { name: 'John', email: 'john@example.com', passwordHash: 'hashed' };

    it('saves passwordHash and selects only safe fields', async () => {
      const user = { id: 1, name: 'John', email: 'john@example.com' };
      prisma.user.create.mockResolvedValue(user);

      await expect(service.createUser(data)).resolves.toBe(user);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { name: 'John', email: 'john@example.com', passwordHash: 'hashed' },
        select: safeSelect,
      });
      expect(safeSelect).not.toHaveProperty('passwordHash');
    });

    it('throws ConflictException on unique constraint violation (P2002)', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.createUser(data)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows unknown errors', async () => {
      const error = new Error('db down');
      prisma.user.create.mockRejectedValue(error);

      await expect(service.createUser(data)).rejects.toBe(error);
    });
  });

  describe('findByEmail', () => {
    it('looks up by email and selects only safe fields', async () => {
      const user = { id: 1, email: 'john@example.com' };
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(service.findByEmail('john@example.com')).resolves.toBe(user);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        select: safeSelect,
      });
    });

    it('returns null when no user exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findByEmail('none@example.com')).resolves.toBeNull();
    });
  });
});
