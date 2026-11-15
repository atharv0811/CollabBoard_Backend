import { IsObject } from 'class-validator';
import { Prisma } from '../../generated/prisma/client.js';

export class UpdateBoardDocumentDto {
    @IsObject()
    document: Prisma.InputJsonValue;
}