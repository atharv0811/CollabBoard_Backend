import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { R2Service } from './r2.service.js';
import { randomUUID } from 'node:crypto';
import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class UploadsService {
    constructor(private readonly r2Service: R2Service) { }

    private generateObjectKey(userId: string, contentType: string): string {
        const extensions: Record<string, string> = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/webp': 'webp',
        };

        const extension = extensions[contentType];

        if (!extension) {
            throw new BadRequestException('Unsupported image type');
        }

        return `${userId}/${randomUUID()}.${extension}`;
    }

    async generatePresignedUploadUrl(
        userId: string,
        contentType: string,
        size: number,
    ): Promise<{ uploadUrl: string; objectKey: string; expiresIn: number }> {
        if (size > 5 * 1024 * 1024) {
            throw new BadRequestException('Image size exceeds the 5 MB limit');
        }

        const objectKey = this.generateObjectKey(userId, contentType);

        const expiresIn = 300;

        const command = new PutObjectCommand({
            Bucket: this.r2Service.getBucketName(),
            Key: objectKey,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(this.r2Service.getClient(), command, {
            expiresIn,
        });

        return {
            uploadUrl,
            objectKey,
            expiresIn,
        };
    }

    async confirmImageUpload(userId: string, objectKey: string) {
        if (!objectKey.startsWith(`${userId}/`)) {
            throw new ForbiddenException('Object belongs to another user.');
        }

        const command = new HeadObjectCommand({
            Bucket: this.r2Service.getBucketName(),
            Key: objectKey,
        });

        const metadata = await this.r2Service.getClient().send(command);

        // Validate actual file size
        const maxFileSize = 5 * 1024 * 1024;

        if (!metadata.ContentLength || metadata.ContentLength > maxFileSize) {
            throw new BadRequestException(
                'Invalid image size. Maximum allowed size is 5 MB.',
            );
        }

        // Validate content type
        const allowedContentTypes = ['image/png', 'image/jpeg', 'image/webp'];

        if (
            !metadata.ContentType ||
            !allowedContentTypes.includes(metadata.ContentType)
        ) {
            throw new BadRequestException('Unsupported image type.');
        }

        return {
            objectKey,
            contentType: metadata.ContentType,
            size: metadata.ContentLength,
        };
    }

    async generatePresignedDownloadUrl(
        userId: string,
        objectKey: string,
    ): Promise<{ downloadUrl: string; expiresIn: number }> {
        if (!objectKey.startsWith(`${userId}/`)) {
            throw new ForbiddenException('Object belongs to another user.');
        }

        const headCommand = new HeadObjectCommand({
            Bucket: this.r2Service.getBucketName(),
            Key: objectKey,
        });

        try {
            await this.r2Service.getClient().send(headCommand);
        } catch (error) {
            if (
                error instanceof Error &&
                (
                    error.name === 'NotFound' ||
                    error.name === 'NoSuchKey' ||
                    (error as { $metadata?: { httpStatusCode?: number } })
                        .$metadata?.httpStatusCode === 404
                )
            ) {
                throw new NotFoundException('Image not found.');
            }

            throw error;
        }

        const getObjectCommand = new GetObjectCommand({
            Bucket: this.r2Service.getBucketName(),
            Key: objectKey,
        });

        const expiresIn = 300;

        const downloadUrl = await getSignedUrl(
            this.r2Service.getClient(),
            getObjectCommand,
            { expiresIn },
        );

        return {
            downloadUrl,
            expiresIn,
        };
    }

    async deleteImage(
        userId: string,
        objectKey: string,
    ): Promise<{ message: string }> {
        if (!objectKey.startsWith(`${userId}/`)) {
            throw new ForbiddenException('Object belongs to another user.');
        }

        const deleteCommand = new DeleteObjectCommand({
            Bucket: this.r2Service.getBucketName(),
            Key: objectKey,
        });

        await this.r2Service.getClient().send(deleteCommand);

        return {
            message: 'Image deleted successfully.'
        };
    }
}
