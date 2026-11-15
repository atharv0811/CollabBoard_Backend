import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

type CreateBoardData = {
    name: string;
    document: Prisma.InputJsonValue;
};

@Injectable()
export class BoardsService {
    constructor(private readonly prisma: PrismaService) { }

    private normalizeName(name: string): string {
        return name.trim().replace(/\s+/g, ' ');
    }

    private serializeBoard<
        T extends {
            createdAt: Date;
            updatedAt: Date;
        },
    >(board: T) {
        return {
            ...board,
            createdAt: board.createdAt.getTime(),
            updatedAt: board.updatedAt.getTime(),
        };
    }

    async createBoard(ownerId: string, data: CreateBoardData) {
        const name = this.normalizeName(data.name);

        if (!name || name.length > 80) {
            throw new BadRequestException('Invalid board name');
        }

        const existing = await this.prisma.board.findFirst({
            where: {
                ownerId,
                name: {
                    equals: name,
                    mode: 'insensitive',
                },
            },
        });

        if (existing) {
            throw new ConflictException('A board with this name already exists');
        }

        const board = await this.prisma.board.create({
            data: {
                name,
                document: data.document,
                ownerId,
            },
        });

        return this.serializeBoard(board);
    }

    async listBoards(
        ownerId: string,
        pagination: PaginationQueryDto
    ) {
        const { page, limit } = pagination;

        const skip = (page - 1) * limit;

        const [boards, total] = await Promise.all([
            this.prisma.board.findMany({
                where: { ownerId },
                skip,
                take: limit,
                orderBy: [
                    { updatedAt: 'desc' },
                    { id: 'desc' }
                ],
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            this.prisma.board.count({
                where: { ownerId },
            }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            boards: boards.map((board) => this.serializeBoard(board)),
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1 && total > 0,
            },
        };
    }

    async getBoard(ownerId: string, id: string) {
        const board = await this.prisma.board.findFirst({
            where: { id, ownerId },
        });

        if (!board) {
            throw new NotFoundException('Board not found');
        }

        return this.serializeBoard(board);
    }

    async deleteBoard(ownerId: string, id: string) {
        const result = await this.prisma.board.deleteMany({
            where: { id, ownerId },
        });

        if (result.count === 0) {
            throw new NotFoundException('Board not found');
        }

        return {
            message: 'Board deleted successfully',
        };
    }

    async renameBoard(ownerId: string, id: string, newName: string) {
        const name = this.normalizeName(newName);

        if (!name || name.length > 80) {
            throw new BadRequestException('Invalid board name');
        }

        const board = await this.prisma.board.findFirst({
            where: { id, ownerId },
        });

        if (!board) {
            throw new NotFoundException('Board not found');
        }

        const duplicate = await this.prisma.board.findFirst({
            where: {
                ownerId,
                id: { not: id },
                name: {
                    equals: name,
                    mode: 'insensitive',
                },
            },
        });

        if (duplicate) {
            throw new ConflictException('A board with this name already exists');
        }

        const result = await this.prisma.board.updateMany({
            where: {
                id,
                ownerId,
            },
            data: { name },
        });

        if (result.count === 0) {
            throw new NotFoundException('Board not found');
        }

        return this.getBoard(ownerId, id);
    }

    async updateDocument(
        ownerId: string,
        id: string,
        document: Prisma.InputJsonValue,
    ) {
        const result = await this.prisma.board.updateMany({
            where: { id, ownerId },
            data: { document },
        });

        if (result.count === 0) {
            throw new NotFoundException('Board not found');
        }

        return this.getBoard(ownerId, id);
    }
}
