import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.js';
import { R2Service } from '../r2.service.js';

async function testR2Connection() {
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const r2Service = app.get(R2Service);

        await r2Service.testConnection();

        console.log('Cloudflare R2 connection successful!');
    } catch (error) {
        console.error('Cloudflare R2 connection failed:', error);
        process.exitCode = 1;
    } finally {
        await app.close();
    }
}

testR2Connection();