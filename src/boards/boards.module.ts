import { Module } from '@nestjs/common';
import { BoardsService } from './boards.service.js';
import { BoardsController } from './boards.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SecurityModule } from '../security/security.module.js';

@Module({
  imports: [PrismaModule, SecurityModule],
  providers: [BoardsService],
  controllers: [BoardsController]
})
export class BoardsModule { }
