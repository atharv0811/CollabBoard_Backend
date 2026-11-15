import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BoardsService } from './boards.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('BoardsService', () => {
  let service: BoardsService;
  let prisma: {
    board: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
  };

  const ownerId = 'owner-1';
  const boardId = '11111111-1111-4111-8111-111111111111';
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const updatedAt = new Date('2026-01-02T00:00:00.000Z');
  const document = { shapes: [] };

  const boardRow = {
    id: boardId,
    name: 'My Board',
    document,
    ownerId,
    createdAt,
    updatedAt,
  };
  const serialized = {
    ...boardRow,
    createdAt: createdAt.getTime(),
    updatedAt: updatedAt.getTime(),
  };

  beforeEach(() => {
    prisma = {
      board: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    };
    service = new BoardsService(prisma as unknown as PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBoard', () => {
    it('normalizes the name, creates the board and serializes dates', async () => {
      prisma.board.findFirst.mockResolvedValue(null);
      prisma.board.create.mockResolvedValue(boardRow);

      const result = await service.createBoard(ownerId, {
        name: '  My   Board  ',
        document,
      });

      expect(prisma.board.findFirst).toHaveBeenCalledWith({
        where: {
          ownerId,
          name: { equals: 'My Board', mode: 'insensitive' },
        },
      });
      expect(prisma.board.create).toHaveBeenCalledWith({
        data: { name: 'My Board', document, ownerId },
      });
      expect(result).toEqual(serialized);
    });

    it('rejects an empty name', async () => {
      await expect(
        service.createBoard(ownerId, { name: '   ', document }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.board.create).not.toHaveBeenCalled();
    });

    it('rejects a name longer than 80 characters', async () => {
      await expect(
        service.createBoard(ownerId, { name: 'a'.repeat(81), document }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ConflictException when the owner already has that name', async () => {
      prisma.board.findFirst.mockResolvedValue(boardRow);

      await expect(
        service.createBoard(ownerId, { name: 'my board', document }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.board.create).not.toHaveBeenCalled();
    });
  });

  describe('listBoards', () => {
    it('paginates owner boards and returns metadata', async () => {
      const row = { id: boardId, name: 'My Board', createdAt, updatedAt };
      prisma.board.findMany.mockResolvedValue([row]);
      prisma.board.count.mockResolvedValue(25);

      const result = await service.listBoards(ownerId, { page: 2, limit: 10 });

      expect(prisma.board.findMany).toHaveBeenCalledWith({
        where: { ownerId },
        skip: 10,
        take: 10,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: { id: true, name: true, createdAt: true, updatedAt: true },
      });
      expect(prisma.board.count).toHaveBeenCalledWith({ where: { ownerId } });
      expect(result).toEqual({
        boards: [
          {
            ...row,
            createdAt: createdAt.getTime(),
            updatedAt: updatedAt.getTime(),
          },
        ],
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      });
    });

    it('reports no previous or next page when there are no boards', async () => {
      prisma.board.findMany.mockResolvedValue([]);
      prisma.board.count.mockResolvedValue(0);

      const result = await service.listBoards(ownerId, { page: 1, limit: 10 });

      expect(result.boards).toEqual([]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });
  });

  describe('getBoard', () => {
    it('returns the serialized board scoped to the owner', async () => {
      prisma.board.findFirst.mockResolvedValue(boardRow);

      await expect(service.getBoard(ownerId, boardId)).resolves.toEqual(
        serialized,
      );
      expect(prisma.board.findFirst).toHaveBeenCalledWith({
        where: { id: boardId, ownerId },
      });
    });

    it('throws NotFoundException when the board does not exist', async () => {
      prisma.board.findFirst.mockResolvedValue(null);

      await expect(service.getBoard(ownerId, boardId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('deleteBoard', () => {
    it('deletes the board for the owner', async () => {
      prisma.board.deleteMany.mockResolvedValue({ count: 1 });

      await expect(service.deleteBoard(ownerId, boardId)).resolves.toEqual({
        message: 'Board deleted successfully',
      });
      expect(prisma.board.deleteMany).toHaveBeenCalledWith({
        where: { id: boardId, ownerId },
      });
    });

    it('throws NotFoundException when nothing was deleted', async () => {
      prisma.board.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.deleteBoard(ownerId, boardId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('renameBoard', () => {
    it('renames the board and returns the updated board', async () => {
      const renamed = { ...boardRow, name: 'New Name' };
      prisma.board.findFirst
        .mockResolvedValueOnce(boardRow)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(renamed);
      prisma.board.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.renameBoard(
        ownerId,
        boardId,
        '  New   Name ',
      );

      expect(prisma.board.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          ownerId,
          id: { not: boardId },
          name: { equals: 'New Name', mode: 'insensitive' },
        },
      });
      expect(prisma.board.updateMany).toHaveBeenCalledWith({
        where: { id: boardId, ownerId },
        data: { name: 'New Name' },
      });
      expect(result).toEqual({ ...serialized, name: 'New Name' });
    });

    it('rejects an invalid name without touching the database', async () => {
      await expect(
        service.renameBoard(ownerId, boardId, '   '),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.renameBoard(ownerId, boardId, 'a'.repeat(81)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.board.findFirst).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the board is not found', async () => {
      prisma.board.findFirst.mockResolvedValue(null);

      await expect(
        service.renameBoard(ownerId, boardId, 'New'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.board.updateMany).not.toHaveBeenCalled();
    });

    it('throws ConflictException when another board has the name', async () => {
      prisma.board.findFirst
        .mockResolvedValueOnce(boardRow)
        .mockResolvedValueOnce({ ...boardRow, id: 'other' });

      await expect(
        service.renameBoard(ownerId, boardId, 'Taken'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.board.updateMany).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the update affects no rows', async () => {
      prisma.board.findFirst
        .mockResolvedValueOnce(boardRow)
        .mockResolvedValueOnce(null);
      prisma.board.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.renameBoard(ownerId, boardId, 'New'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateDocument', () => {
    it('updates the document and returns the board', async () => {
      const newDocument = { shapes: [{ id: 1 }] };
      prisma.board.updateMany.mockResolvedValue({ count: 1 });
      prisma.board.findFirst.mockResolvedValue({
        ...boardRow,
        document: newDocument,
      });

      const result = await service.updateDocument(
        ownerId,
        boardId,
        newDocument,
      );

      expect(prisma.board.updateMany).toHaveBeenCalledWith({
        where: { id: boardId, ownerId },
        data: { document: newDocument },
      });
      expect(result).toEqual({ ...serialized, document: newDocument });
    });

    it('throws NotFoundException when no board was updated', async () => {
      prisma.board.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.updateDocument(ownerId, boardId, document),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.board.findFirst).not.toHaveBeenCalled();
    });
  });
});
