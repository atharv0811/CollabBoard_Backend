import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3"
import { ConfigService } from "@nestjs/config";

@Injectable()
export class R2Service implements OnModuleInit, OnModuleDestroy {
    private client: S3Client;

    constructor(private readonly configService: ConfigService) { }

    onModuleInit() {
        this.client = new S3Client({
            region: 'auto',
            endpoint: this.configService.getOrThrow<string>('R2_ENDPOINT'),
            credentials: {
                accessKeyId: this.configService.getOrThrow<string>('R2_ACCESS_KEY_ID'),
                secretAccessKey: this.configService.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
            },
        })
    }

    getClient(): S3Client {
        return this.client;
    }

    getBucketName(): string {
        return this.configService.getOrThrow<string>("R2_BUCKET_NAME")
    }

    onModuleDestroy() {
        this.client?.destroy();
    }

    async testConnection(): Promise<void> {
        const command = new HeadBucketCommand({
            Bucket: this.getBucketName(),
        });

        await this.client.send(command);
    }
}