import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard.js';
import { BoardsService } from './boards.service.js';
import { CreateBoardDto } from './dto/create-board.dto.js';
import { RenameBoardDto } from './dto/rename-board.dto.js';
import { UpdateBoardDocumentDto } from './dto/update-board-document.dto.js';
import { type AuthenticatedRequest } from '../security/interfaces/authenticated-request.interface.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
    constructor(private readonly boardsService: BoardsService) { }

    @Post()
    createBoard(
        @Req() req: AuthenticatedRequest,
        @Body() createBoardDto: CreateBoardDto,
    ) {
        return this.boardsService.createBoard(
            req.user.sub,
            createBoardDto
        );
    }

    @Get()
    listBoards(
        @Req() req: AuthenticatedRequest,
        @Query() paginationQuery: PaginationQueryDto
    ) {
        return this.boardsService.listBoards(req.user.sub, paginationQuery);
    }

    @Get(':id')
    getBoard(
        @Req() req: AuthenticatedRequest,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
    ) {
        return this.boardsService.getBoard(req.user.sub, id);
    }

    @Delete(":id")
    deleteBoard(
        @Req() req: AuthenticatedRequest,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
    ) {
        return this.boardsService.deleteBoard(req.user.sub, id)
    }

    @Patch(':id/name')
    renameBoard(
        @Req() req: AuthenticatedRequest,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Body() renameBoardDto: RenameBoardDto,
    ) {
        return this.boardsService.renameBoard(
            req.user.sub,
            id,
            renameBoardDto.name,
        );
    }

    @Patch(':id/document')
    updateDocument(
        @Req() req: AuthenticatedRequest,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Body() updateBoardDocumentDto: UpdateBoardDocumentDto,
    ) {
        return this.boardsService.updateDocument(
            req.user.sub,
            id,
            updateBoardDocumentDto.document,
        );
    }
}
