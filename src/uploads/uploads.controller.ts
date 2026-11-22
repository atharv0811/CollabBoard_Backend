import { Body, Controller, Delete, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard.js';
import { type AuthenticatedRequest } from '../security/interfaces/authenticated-request.interface.js';
import { CreateImageUploadDto } from './dto/create-image-upload.dto.js';
import { UploadsService } from './uploads.service.js';
import { ConfirmImageUploadDto } from './dto/confirm-image-upload.dto.js';
import { GetImageDownloadUrlDto } from './dto/get-image-download-url.dto.js';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
    constructor(private readonly uploadService: UploadsService) { }
    @Post('images/presign')
    uploadImage(
        @Req() req: AuthenticatedRequest,
        @Body() createImageDto: CreateImageUploadDto,
    ) {
        return this.uploadService.generatePresignedUploadUrl(
            req.user.sub,
            createImageDto.contentType,
            createImageDto.size
        );
    }

    @Post('images/confirm')
    confirmImageUpload(
        @Req() req: AuthenticatedRequest,
        @Body() confirmImageDto: ConfirmImageUploadDto,
    ) {
        return this.uploadService.confirmImageUpload(
            req.user.sub,
            confirmImageDto.objectKey,
        );
    }

    @Get('images/download-url')
    generateImageDownloadUrl(
        @Req() req: AuthenticatedRequest,
        @Query() query: GetImageDownloadUrlDto,
    ) {
        return this.uploadService.generatePresignedDownloadUrl(
            req.user.sub,
            query.objectKey,
        );
    }

    @Delete('images')
    deleteImage(
        @Req() req: AuthenticatedRequest,
        @Query() query: GetImageDownloadUrlDto,
    ) {
        return this.uploadService.deleteImage(
            req.user.sub,
            query.objectKey,
        );
    }
}
